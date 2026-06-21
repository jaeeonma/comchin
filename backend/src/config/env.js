import dotenv from 'dotenv'

dotenv.config()

// 환경변수 중앙 관리. 필수 값이 없으면 빠르게 실패하도록 검증.
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET ?? 'comchin-dev-secret-change-me',
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  geminiApiKey: process.env.GEMINI_API_KEY,
  naverClientId: process.env.NAVER_CLIENT_ID,
  naverClientSecret: process.env.NAVER_CLIENT_SECRET,
}

export const isProd = env.nodeEnv === 'production'

// 개발 편의를 위해 경고만 출력 (DB/JWT 없이도 서버 기동·헬스체크 가능).
export function assertEnv() {
  const missing = []
  if (!env.databaseUrl) missing.push('DATABASE_URL')
  if (!env.jwtSecret) missing.push('JWT_SECRET')

  if (missing.length > 0) {
    console.warn(
      `[env] 누락된 환경변수: ${missing.join(', ')} — .env.example 을 참고해 .env 를 채워주세요.`,
    )
  }
}
