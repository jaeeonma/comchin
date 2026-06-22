import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import AiAssistant from './AiAssistant'
import { useAuthStore } from '../store/useAuthStore'
import { useSavedBuildStore } from '../store/useSavedBuildStore'
import { useCartStore } from '../store/useCartStore'
import { useFavoriteStore } from '../store/useFavoriteStore'
import { usePaymentStore } from '../store/usePaymentStore'

export default function Layout() {
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const user = useAuthStore((s) => s.user)
  const setSavedUser = useSavedBuildStore((s) => s.setUser)
  const setCartUser = useCartStore((s) => s.setUser)
  const setFavUser = useFavoriteStore((s) => s.setUser)
  const fetchPayments = usePaymentStore((s) => s.fetch)
  const clearPayments = usePaymentStore((s) => s.clear)

  // 앱 시작 시 쿠키로 로그인 세션 복원
  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  // 로그인 사용자에 맞춰 저장한 견적·장바구니·즐겨찾기·결제수단 동기화 (로그아웃 시 게스트로 전환)
  useEffect(() => {
    const id = user?.id ?? null
    setSavedUser(id)
    setCartUser(id)
    setFavUser(id)
    if (id) fetchPayments().catch(() => {})
    else clearPayments()
  }, [user, setSavedUser, setCartUser, setFavUser, fetchPayments, clearPayments])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        컴친 — 컴퓨터 친구 · 학교 포트폴리오 프로젝트
      </footer>
      <AiAssistant />
    </div>
  )
}
