import dotenv from 'dotenv'

dotenv.config()

const DEFAULT_JWT_SECRET = 'comchin-dev-secret-change-me'

// 환경변수 중앙 관리. 필수 값이 없으면 빠르게 실패하도록 검증.
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  geminiApiKey: process.env.GEMINI_API_KEY,
  naverClientId: process.env.NAVER_CLIENT_ID,
  naverClientSecret: process.env.NAVER_CLIENT_SECRET,
}

export const isProd = env.nodeEnv === 'production'

// 개발에선 경고만 출력하지만, 운영(production)에선 위험한 설정이면 기동을 거부한다.
export function assertEnv() {
  // 운영에서 기본 JWT 시크릿/미설정 = 토큰 위조 위험 → 즉시 실패 (공개 저장소에 기본값 노출되어 있음)
  if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET)) {
    throw new Error(
      '[env] 운영 환경에서는 JWT_SECRET 을 반드시 강한 랜덤값으로 설정해야 합니다. (미설정/기본값은 토큰 위조 위험)',
    )
  }

  const missing = []
  if (!env.databaseUrl) missing.push('DATABASE_URL')
  if (!env.jwtSecret) missing.push('JWT_SECRET')

  if (missing.length > 0) {
    console.warn(
      `[env] 누락된 환경변수: ${missing.join(', ')} — .env.example 을 참고해 .env 를 채워주세요.`,
    )
  }
}
