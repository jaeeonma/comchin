import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

const app = express()

// Render 등 프록시 뒤에서 실제 클라이언트 IP(X-Forwarded-For)를 신뢰 — 속도 제한 정확도용
app.set('trust proxy', 1)

// 보안 헤더 (X-Frame-Options·HSTS·noSniff 등).
// CSP·COEP 는 외부 이미지(네이버 CDN)·구글 OAuth 팝업을 깨뜨릴 수 있어 비활성화한다.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // 기본값(same-origin)은 구글 로그인 팝업이 opener와 통신하지 못하게 막아
    // 팝업이 빈 화면에서 멈춘다. 팝업만 허용해 OAuth가 동작하도록 한다.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }),
)

// 프론트엔드(Vite)와 통신 허용 + HttpOnly 쿠키 주고받기 위해 credentials 활성화
// (단일 서비스 배포에선 같은 도메인이라 CORS가 사실상 필요 없지만, 분리 개발용으로 유지)
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

// 모든 API는 /api 프리픽스 아래
app.use('/api', routes)
// API 경로의 404만 JSON 으로 처리 (그 외 경로는 아래 SPA 폴백)
app.use('/api', notFound)

// ── 프로덕션: 빌드된 프론트엔드(React)를 같은 서버에서 서빙 ──
// frontend/dist 가 있으면 정적 파일 + SPA 폴백(index.html) 제공.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '../../frontend/dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  // /api 가 아닌 모든 GET 은 SPA 진입점으로 (새로고침·딥링크 대응)
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use(errorHandler)

export default app
