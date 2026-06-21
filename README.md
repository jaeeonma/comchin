# 🖥️ 컴친 (컴퓨터 친구)

사용자 친화적인 **조립 PC 견적 웹 앱**. 부품을 직접 선택하는 과정에서 AI가 부품 특징·호환성 문제·주의할 점을 실시간으로 안내합니다. (학교 포트폴리오 프로젝트)

> 전체 기획은 노션 프로젝트 계획서 참고.

## 📁 프로젝트 구조

```
comchin/
├── frontend/   # React + Vite + Tailwind + Zustand (UI)
└── backend/    # Node.js + Express + Prisma + PostgreSQL (API)
```

## 🛠 기술 스택

| 영역       | 사용 기술                                                        |
| ---------- | ---------------------------------------------------------------- |
| 프론트엔드 | React, React Router, Axios, Tailwind CSS, Zustand                |
| 백엔드     | Node.js, Express, JWT(HttpOnly Cookie), bcrypt, CORS, dotenv     |
| DB         | PostgreSQL + Prisma ORM                                          |
| AI         | Google Gemini API                                                |
| 배포       | 프론트: Vercel / 백엔드·DB: Railway                              |

## 🚀 개발 시작하기

### 1. 백엔드

```bash
cd backend
npm install
cp .env.example .env        # 값 채우기 (DATABASE_URL, JWT_SECRET 등)
npm run prisma:generate     # Prisma 클라이언트 생성
npm run prisma:migrate      # DB 마이그레이션 (PostgreSQL 필요)
npm run dev                 # http://localhost:4000
```

헬스체크: `GET http://localhost:4000/api/health`

#### 부품 데이터 시드 & 이미지 자동 채우기

```bash
npm run db:seed             # 부품 데이터 입력 (호환성 스펙 포함)
npm run enrich:naver        # 네이버 쇼핑 API로 이미지 자동 채우기(이미지 없는 부품만)
npm run enrich:naver -- --price      # 가격도 네이버 최저가로 갱신
npm run enrich:naver -- --overwrite  # 이미지 있는 부품도 덮어쓰기
```

> `enrich:naver`는 네이버 공식 Open API(쇼핑 검색)를 사용합니다(크롤링 아님).
> `.env`에 `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET`이 필요해요 —
> [네이버 개발자센터](https://developers.naver.com)에서 앱 등록 후 "검색" API를 추가하면 발급됩니다.
> 부품의 호환성 스펙(소켓·DDR·코어·VRAM)은 시드에 직접 입력돼 있고, 이미지·가격만 API로 보강합니다.

### 2. 프론트엔드

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

개발 중 `/api` 요청은 Vite proxy를 통해 백엔드(`localhost:4000`)로 전달됩니다.

## 📡 API 라우트 (스켈레톤)

| 메서드 | 경로                  | 설명             | 상태   |
| ------ | --------------------- | ---------------- | ------ |
| GET    | `/api/health`         | 헬스체크         | ✅     |
| POST   | `/api/auth/register`  | 회원가입         | 예정   |
| POST   | `/api/auth/login`     | 로그인           | 예정   |
| GET    | `/api/parts`          | 부품 목록        | 예정   |
| GET    | `/api/builds`         | 견적 목록        | 예정   |

## 🗺 개발 단계

- [ ] **1단계** — 기본 견적 시스템 (부품 선택, 호환성 체크, 가격/전력 계산)
- [ ] **2단계** — 회원 기능 (로그인/회원가입, 견적 저장·불러오기)
- [ ] **3단계** — AI 기능 (부품 설명, 견적 분석, 챗봇)
- [ ] **4단계** — 고도화 (비교 기능, UI/UX 완성도, 배포)
