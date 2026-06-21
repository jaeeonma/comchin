import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import Logo from './Logo'
import SearchBox from './SearchBox'
import { useAuthStore } from '../store/useAuthStore'
import { useCartStore } from '../store/useCartStore'
import { useFavoriteStore } from '../store/useFavoriteStore'

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
]

export default function Navbar() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const cartCount = useCartStore((s) => s.items.reduce((sum, it) => sum + it.qty, 0))
  const favCount = useFavoriteStore((s) => s.items.length)

  // 스크롤을 내리면 헤더 상단(로고·검색)을 접어 카테고리 메뉴만 슬림하게 고정.
  // 접기/펼치기 임계점을 다르게(히스테리시스) 줘서 경계에서 떨리는(통통 튀는) 현상을 막는다.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const y = window.scrollY
      setScrolled((prev) => {
        // 접히는 영역 높이(약 112px)보다 큰 갭(160↔40)을 둬서 경계 떨림을 원천 차단
        if (!prev && y > 160) return true // 충분히 내려야 접힘
        if (prev && y < 40) return false // 거의 위로 올려야 펼침
        return prev // 그 사이에서는 현재 상태 유지
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
      <div className="mx-auto max-w-7xl px-6">
        {/* 스크롤 내리면 접히는 영역(로고·계정·검색) — 카테고리 메뉴만 남아 고정 */}
        <div
          className={`grid transition-all duration-300 ${
            scrolled ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'
          }`}
        >
          <div className="overflow-hidden">
            {/* 1줄: 가운데 타이틀 + 우상단 계정 메뉴 */}
            <div className="relative flex items-center justify-center py-2.5">
              <Link to="/">
                <Logo className="h-9" />
              </Link>

          <div className="absolute right-0 flex items-center gap-3 text-base">
            {/* 계좌·카드 조회 */}
            <Link to="/wallet" className="text-muted hover:text-text" aria-label="내 계좌·카드">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
                <rect x="2.25" y="5.25" width="19.5" height="13.5" rx="2" />
                <path strokeLinecap="round" d="M2.25 9.75h19.5M6 14.25h4.5" />
              </svg>
            </Link>
            <Link to="/cart" className="relative text-muted hover:text-text" aria-label="장바구니">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
                />
              </svg>
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
                <button
                  type="button"
                  onClick={logout}
                  className="text-muted hover:text-text"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <Link to="/login" className="text-muted hover:text-text">
                로그인
              </Link>
            )}
            {/* 즐겨찾기 */}
            <Link to="/favorites" className="relative text-muted hover:text-rose-500" aria-label="즐겨찾기">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
                />
              </svg>
              {favCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold leading-none text-white">
                  {favCount}
                </span>
              )}
            </Link>
            <ThemeToggle />
          </div>
        </div>

            {/* 2줄: 검색바 (가운데) — 실시간 자동완성 */}
            <div className="flex justify-center pb-3">
              <SearchBox />
            </div>
          </div>
        </div>
      </div>

      {/* 3줄: 카테고리 메뉴 (가운데, 넘치면 가로 스크롤) — 스크롤 시에도 항상 고정 */}
      <nav className="border-t border-border">
        <ul className="mx-auto flex max-w-7xl items-center justify-center gap-2 overflow-x-auto px-4 text-base lg:overflow-visible">
          {categoryMenu.map((item, i) => (
            <li key={i} className="group relative shrink-0">
              <NavLink
                to={item.to}
                className={`block whitespace-nowrap px-3 py-2.5 hover:text-brand ${
                  item.highlight ? 'font-semibold text-brand' : 'text-text'
                }`}
              >
                {item.label}
              </NavLink>

              {/* 마우스를 올리면 내려오는 상세 카테고리 — 이미지 카드형 메가메뉴 (데스크톱) */}
              {item.children && (
                <div className="invisible absolute left-1/2 top-full z-30 hidden w-136 -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 lg:block">
                  <div className="rounded-2xl border border-border bg-surface p-4 shadow-2xl">
                    <p className="mb-3 px-1 text-xs font-bold uppercase tracking-wide text-muted">
                      직접 견적 메뉴
                    </p>
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
                            <span className="block text-sm font-bold text-text group-hover/card:text-brand">
                              {c.label}
                            </span>
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
    </header>
  )
}
