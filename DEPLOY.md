# 배포 가이드 (Render + Neon)

컴친은 **단일 웹 서비스**로 배포합니다. Express가 API(`/api/*`)와 빌드된 React를 같은 도메인에서 함께 서빙하므로, 쿠키·CORS 설정이 단순합니다.

- **앱(웹 서비스)**: Render (무료 플랜)
- **데이터베이스**: Neon (무료 PostgreSQL)

---

## 1. Neon 데이터베이스 만들기
1. https://neon.tech 가입 → **New Project** 생성 (리전은 가까운 곳, 예: AWS Asia Pacific).
2. 생성 후 **Connection string** 복사. (형식: `postgresql://USER:PASS@HOST/DB?sslmode=require`)
   - Prisma `db push` 와 런타임 모두에서 쓸 거라 **Pooled가 아닌 일반(Direct) 연결 문자열**을 권장.
3. 이 문자열을 잠시 보관 — 아래 `DATABASE_URL` 에 넣습니다.

## 2. GitHub
이미 푸시되어 있습니다. (Render가 이 저장소를 연결해 자동 배포)

## 3. Render 웹 서비스 만들기
1. https://render.com 가입 → **New → Web Service** → GitHub 저장소(`comchin`) 연결.
2. 설정 (저장소의 `render.yaml` 을 감지하면 자동 채워짐 — 아니면 수동 입력):
   - **Runtime**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
   - **Plan**: Free
3. **Environment** 에 환경변수 추가:
   | 키 | 값 |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | (1단계 Neon 연결 문자열) |
   | `JWT_SECRET` | 길고 무작위인 문자열 (Render의 "Generate" 사용 가능) |
   | `GEMINI_API_KEY` | 본인 Gemini 키 |
   | `GOOGLE_CLIENT_ID` | (선택) 구글 로그인 쓸 때만 |
   | `CLIENT_ORIGIN` | (선택) 배포 URL, 예: `https://comchin.onrender.com` |
4. **Create Web Service** → 첫 배포 시작.

### 빌드가 자동으로 하는 일 (`npm run build`)
1. 프론트엔드 설치 + 프로덕션 빌드(`frontend/dist`)
2. 백엔드 설치 + Prisma 클라이언트 생성
3. `prisma db push` — Neon에 테이블 생성
4. `db:import` — `prisma/seed-data/parts.json` 의 **부품 5,442개**를 Neon에 적재 (이미 있으면 건너뜀)

> 데이터는 idempotent하게 들어가므로 재배포해도 중복되지 않습니다.

## 4. 배포 후 확인
- `https://<앱>.onrender.com/api/health` → `{"status":"ok"}`
- 메인 페이지 접속 → 회원가입/로그인 → 부품/완성PC 목록 → AI 비서(우하단) 동작 확인.

---

## 참고 / 주의
- **무료 플랜 콜드 스타트**: Render 무료 웹 서비스는 15분 미사용 시 잠들어, 다음 접속 시 30~50초 깨어나는 지연이 있습니다. (포트폴리오엔 무방)
- **구글 로그인**: 쓰려면 Google Cloud 콘솔 OAuth 클라이언트의 **승인된 자바스크립트 원본**에 배포 URL을 추가하세요. (안 쓰면 이메일 로그인만으로도 정상)
- **AI 비서**: `GEMINI_API_KEY` 만 넣으면 동작. 무료 한도(분당/일당) 보호용 속도 제한이 이미 들어가 있습니다.
- **데이터 갱신**: 로컬에서 부품을 더 모았다면 `npm --prefix backend run db:export` 로 `parts.json` 갱신 후 커밋 → 재배포하면 반영됩니다.
- **시크릿**: `.env` 는 절대 커밋되지 않습니다(.gitignore). 모든 키는 Render 대시보드 환경변수로만 넣으세요.
