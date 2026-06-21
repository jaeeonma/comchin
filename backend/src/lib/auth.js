import jwt from 'jsonwebtoken'
import { env, isProd } from '../config/env.js'

const COOKIE_NAME = 'comchin_token'
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7 // 7일

// JWT 발급 → HttpOnly 쿠키로 심기.
// 개발/터널 환경에서 모두 동작하도록 sameSite=lax, secure 는 운영에서만.
export function setAuthCookie(res, userId) {
  const token = jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: '7d' })
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: MAX_AGE_MS,
    path: '/',
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' })
}

// 쿠키의 JWT 에서 userId 추출 (없거나 무효면 null)
export function getUserIdFromReq(req) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return null
  try {
    const payload = jwt.verify(token, env.jwtSecret)
    return payload.sub ?? null
  } catch {
    return null
  }
}

// 공개용 사용자 객체 (비밀번호 제외)
export function publicUser(user) {
  return { id: user.id, email: user.email, nickname: user.nickname }
}
