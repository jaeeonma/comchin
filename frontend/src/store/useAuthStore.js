import { create } from 'zustand'
import { apiLogin, apiRegister, apiGoogleLogin, apiLogout, apiMe } from '../api/auth'

// 인증 전역 상태. JWT(HttpOnly 쿠키) 기반 — 사용자 정보는 서버 세션이 출처.
// 앱 시작 시 fetchMe 로 세션을 복원한다.
export const useAuthStore = create((set) => ({
  user: null,
  isLoading: false,
  ready: false, // 최초 세션 복원(fetchMe) 완료 여부

  setUser: (user) => set({ user }),

  // 세션 복원
  fetchMe: async () => {
    const user = await apiMe()
    set({ user, ready: true })
  },

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const user = await apiLogin({ email, password })
      set({ user })
      return user
    } finally {
      set({ isLoading: false })
    }
  },

  register: async ({ email, password, nickname }) => {
    set({ isLoading: true })
    try {
      const user = await apiRegister({ email, password, nickname })
      set({ user })
      return user
    } finally {
      set({ isLoading: false })
    }
  },

  // password 없이 호출 → 처음 오는 계정이면 { needPassword } 반환(저장 안 함).
  // password 와 함께 호출 → 회원 저장 후 { user } 반환. user 가 오면 로그인 처리.
  googleLogin: async (credential, password) => {
    set({ isLoading: true })
    try {
      const data = await apiGoogleLogin(credential, password)
      if (data.user) set({ user: data.user })
      return data
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await apiLogout()
    } catch {
      // 실패해도 클라이언트 상태는 비움
    }
    set({ user: null })
    // 장바구니는 사용자별로 저장되므로, Layout 의 setUser(null) 가 게스트(빈) 장바구니로
    // 전환한다. (저장된 사용자 장바구니는 그대로 남아 다시 로그인하면 복원됨)
  },
}))
