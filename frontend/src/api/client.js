import axios from 'axios'

// 백엔드 API 통신용 Axios 인스턴스.
// JWT는 HttpOnly 쿠키로 주고받으므로 withCredentials 필수.
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  withCredentials: true,
  timeout: 15000,
})

// 공통 에러 로깅 (계획서: 에러 처리/로딩 상태는 완성도 핵심 요소)
client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (import.meta.env.DEV) {
      console.error('[API ERROR]', error?.response?.status, error?.message)
    }
    return Promise.reject(error)
  },
)

export default client
