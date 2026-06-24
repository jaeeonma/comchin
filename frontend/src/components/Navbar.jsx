import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import Logo from './Logo'
import SearchBox from './SearchBox'
import { useAuthStore } from '../store/useAuthStore'
import { useCartStore } from '../store/useCartStore'
import { useFavoriteStore } from '../store/useFavoriteStore'
import { useAiStore } from '../store/useAiStore'

const categoryMenu = [
  { to: '/category/gaming', label: '게이밍 PC' },
  { to: '/category/workstation', label: '작업용 PC' },
  { to: '/category/highend', label: '하이엔드' },
  { to: '/category/office', label: '사무용' },
  { to: '/parts', label: '부품' },
  {
    to: '/builder',
    label: '직접 견적',
    highlight: true,
    children: [
      { to: '/builder', label: '직접 견적', desc: '모든 부품을 자유롭게', img: '/images/guide/builder-guide.png' },
      { to: '/builder/intel', label: 'DIY 인텔', desc: '인텔 호환 부품으로 구성', img: '/images/diy/diy-intel.jpg' },
      { to: '/builder/amd', label: 'DIY AMD', desc: 'AMD 호환 부품으로 구성', img: '/images/diy/diy-amd.jpg' },
    ],
  },
  { to: '/guide/tips', label: 'PC 고민 해결' },
  { to: '/guide/parts', label: '부품 이야기' },
  { to: '/support', label: '1:1 상담' },
]

// 공용 아이콘
const CardIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <rect x="2.25" y="5.25" width="19.5" height="13.5" rx="2" />
    <path strokeLinecap="round" d="M2.25 9.75h19.5M6 14.25h4.5" />
  </svg>
)
const CartIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
    />
  </svg>
)
const HeartIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" {...p}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
    />
  </svg>
)

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const cartCount = useCartStore((s) => s.items.reduce((sum, it) => sum + it.qty, 0))
  const favCount = useFavoriteStore((s) => s.items.length)
  const openChat = useAiStore((s) => s.openChat)

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // 메뉴 열렸을 때 배경 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // 스크롤을 내리면 데스크톱 헤더 상단(로고·검색)을 접어 카테고리 메뉴만 슬림하게 고정. (히스테리시스로 떨림 방지)
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const y = window.scrollY
      setScrolled((prev) => {
        if (!prev && y > 160) return true
        if (prev && y < 40) return false
        return prev
      })
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
      {/* ============ 모바일 상단 바 (md 미만) ============ */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="메뉴 열기"
            className="-ml-1 flex h-10 w-10 items-center justify-center rounded-md text-text hover:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>

          <Link to="/" aria-label="컴친 홈">
            <Logo className="h-8" />
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openChat}
              aria-label="AI 비서 열기"
              className="flex h-10 w-10 items-center justify-center rounded-md text-brand hover:bg-surface-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h8M8 14h5M21 12a8 8 0 0 1-8 8H7l-4 3v-4.6A8 8 0 1 1 21 12Z"
                />
              </svg>
            </button>
            <Link
              to="/cart"
              aria-label="장바구니"
              className="relative flex h-10 w-10 items-center justify-center rounded-md text-text hover:bg-surface-2"
            >
              <CartIcon className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold leading-none text-white">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
        <div className="px-4 pb-3">
          <SearchBox />
        </div>
      </div>

      {/* ============ 데스크톱 상단 (md 이상) ============ */}
      <div className="mx-auto hidden max-w-7xl px-6 md:block">
        {/* 스크롤 내리면 접히는 영역(로고·계정·검색) */}
        <div className={`grid transition-all duration-300 ${scrolled ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
          <div className="overflow-hidden">
            {/* 1줄: 가운데 로고 + 왼쪽 AI 배너 + 오른쪽 계정 메뉴 */}
            <div className="relative flex items-center justify-center py-2.5">
              <Link to="/">
                <Logo className="h-9" />
              </Link>

              <button
                type="button"
                onClick={openChat}
                className="absolute left-0 flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3.5 py-1.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/15"
                aria-label="컴친 AI 비서 열기"
              >
                <img
                  src="/images/logos/Gemini_logo.png"
                  alt=""
                  className="gemini-logo h-4 w-auto shrink-0 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                AI 견적 분석
              </button>

              <div className="absolute right-0 flex items-center gap-3 text-base">
                <Link to="/wallet" className="text-muted hover:text-text" aria-label="내 계좌·카드">
                  <CardIcon className="h-6 w-6" />
                </Link>
                <Link to="/cart" className="relative text-muted hover:text-text" aria-label="장바구니">
                  <CartIcon className="h-6 w-6" />
                  {cartCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold leading-none text-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
                {user ? (
                  <>
                    <span className="text-muted">
                      <span className="font-semibold text-text">{user.nickname}</span>님
                    </span>
                    <button type="button" onClick={logout} className="text-muted hover:text-text">
                      로그아웃
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="text-muted hover:text-text">
                    로그인
                  </Link>
                )}
                <Link to="/favorites" className="relative text-muted hover:text-rose-500" aria-label="즐겨찾기">
                  <HeartIcon className="h-6 w-6" />
                  {favCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-none text-white">
                      {favCount}
                    </span>
                  )}
                </Link>
                <ThemeToggle />
              </div>
            </div>

            {/* 2줄: 검색바 */}
            <div className="flex justify-center pb-3">
              <SearchBox />
            </div>
          </div>
        </div>
      </div>

      {/* ============ 카테고리 메뉴 (데스크톱만) ============ */}
      <nav className="hidden border-t border-border md:block">
        <ul className="mx-auto flex max-w-7xl items-center justify-center gap-2 overflow-x-auto px-4 text-base lg:overflow-visible">
          {categoryMenu.map((item, i) => (
            <li key={i} className="group relative shrink-0">
              <NavLink
                to={item.to}
                className={`block whitespace-nowrap px-3 py-2.5 hover:text-brand ${item.highlight ? 'font-semibold text-brand' : 'text-text'}`}
              >
                {item.label}
              </NavLink>

              {item.children && (
                <div className="invisible absolute left-1/2 top-full z-30 hidden w-136 -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 lg:block">
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-2xl">
                    <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wide text-muted">직접 견적 메뉴</p>
                    <div className="grid grid-cols-3 gap-3">
                      {item.children.map((c) => (
                        <NavLink
                          key={c.to + c.label}
                          to={c.to}
                          className="group/card flex flex-col overflow-hidden rounded-xl border border-border bg-surface-2 text-left transition-colors hover:border-brand"
                        >
                          <div className="aspect-4/3 overflow-hidden bg-white">
                            <img
                              src={c.img}
                              alt={c.label}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                          <div className="p-2.5">
                            <span className="block text-sm font-bold text-text group-hover/card:text-brand">{c.label}</span>
                            {c.desc && <span className="mt-0.5 block text-xs text-muted">{c.desc}</span>}
                          </div>
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* ============ 모바일 드로어 (body 로 portal — 헤더의 backdrop-filter containing block 회피) ============ */}
      {menuOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          {/* 링크(앵커)를 누르면 드로어 자동 닫기 — 이벤트 위임 */}
          <div
            className="absolute left-0 top-0 flex h-full w-72 max-w-[82%] flex-col overflow-y-auto bg-surface shadow-2xl"
            onClick={(e) => {
              if (e.target.closest('a')) setMenuOpen(false)
            }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <Logo className="h-7" />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="메뉴 닫기"
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* 카테고리 */}
            <nav className="flex flex-col px-2 py-2">
              {categoryMenu.map((item) => (
                <div key={item.to + item.label}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `block rounded-md px-3 py-2.5 text-base ${item.highlight ? 'font-semibold text-brand' : 'text-text'} ${isActive ? 'bg-surface-2' : 'hover:bg-surface-2'}`
                    }
                  >
                    {item.label}
                  </NavLink>
                  {item.children && (
                    <div className="ml-3 flex flex-col border-l border-border pl-2">
                      {item.children
                        .filter((c) => c.to !== item.to)
                        .map((c) => (
                          <NavLink
                            key={c.to + c.label}
                            to={c.to}
                            className="rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text"
                          >
                            {c.label}
                          </NavLink>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            <div className="mt-auto border-t border-border px-2 py-2">
              {/* AI 비서 */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  openChat()
                }}
                className="mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left font-semibold text-brand hover:bg-surface-2"
              >
                <img
                  src="/images/logos/Gemini_logo.png"
                  alt=""
                  className="gemini-logo h-4 w-auto shrink-0 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                AI 견적 분석
              </button>

              <Link to="/wallet" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-text hover:bg-surface-2">
                <CardIcon className="h-5 w-5" /> 내 계좌·카드
              </Link>
              <Link to="/favorites" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-text hover:bg-surface-2">
                <HeartIcon className="h-5 w-5" /> 즐겨찾기
                {favCount > 0 && <span className="text-xs text-rose-500">({favCount})</span>}
              </Link>

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                  }}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-text hover:bg-surface-2"
                >
                  로그아웃 <span className="text-sm text-muted">({user.nickname}님)</span>
                </button>
              ) : (
                <Link to="/login" className="block rounded-md px-3 py-2.5 font-semibold text-text hover:bg-surface-2">
                  로그인 / 회원가입
                </Link>
              )}

              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-muted">테마</span>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </header>
  )
}
