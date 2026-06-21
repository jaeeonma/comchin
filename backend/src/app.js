import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { notFound, errorHandler } from './middleware/errorHandler.js'

const app = express()

// 프론트엔드(Vite)와 통신 허용 + HttpOnly 쿠키 주고받기 위해 credentials 활성화
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

app.use(notFound)
app.use(errorHandler)

export default app
