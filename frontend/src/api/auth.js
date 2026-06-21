import client from './client'

// 인증 API. JWT 는 HttpOnly 쿠키로 오가므로 withCredentials(client 에 설정됨)만 있으면 됨.

export async function apiRegister({ email, password, nickname }) {
  const res = await client.post('/auth/register', { email, password, nickname })
  return res.data.user
}

export async function apiLogin({ email, password }) {
  const res = await client.post('/auth/login', { email, password })
  return res.data.user
}

// password 없이 호출하면, 처음 오는 계정은 { needPassword, email, nickname } 를 돌려준다.
// password 와 함께 호출하면 그 비밀번호로 회원 저장 후 { user } 를 돌려준다.
export async function apiGoogleLogin(credential, password) {
  const body = password ? { credential, password } : { credential }
  const res = await client.post('/auth/google', body)
  return res.data // { user } 또는 { needPassword, email, nickname }
}

export async function apiLogout() {
  await client.post('/auth/logout')
}

// 세션 복원: 쿠키로 내 정보 조회. 비로그인(401)이면 null.
export async function apiMe() {
  try {
    const res = await client.get('/auth/me')
    return res.data.user
  } catch {
    return null
  }
}
