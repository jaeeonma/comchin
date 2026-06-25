import { Link } from 'react-router-dom'
import Logo from './Logo'

// 푸터 링크 열 — 사이트 내 실제 경로로 연결
const COLUMNS = [
  {
    title: '둘러보기',
    links: [
      { to: '/category/gaming', label: '게이밍 PC' },
      { to: '/category/workstation', label: '작업용 PC' },
      { to: '/parts', label: '부품' },
      { to: '/builder', label: '직접 견적' },
    ],
  },
  {
    title: '고객지원',
    links: [
      { to: '/support', label: '1:1 상담' },
      { to: '/guide/tips', label: 'PC 고민 해결' },
      { to: '/guide/parts', label: '부품 이야기' },
      { to: '/cart', label: '장바구니' },
    ],
  },
  {
    title: '내 계정',
    links: [
      { to: '/login', label: '로그인' },
      { to: '/signup', label: '회원가입' },
      { to: '/favorites', label: '즐겨찾기' },
      { to: '/wallet', label: '내 계좌·카드' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-border bg-surface-2/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* 브랜드 소개 */}
          <div className="lg:col-span-4">
            <Link to="/" aria-label="컴친 홈" className="inline-block">
              <Logo className="h-10" />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted">
              컴퓨터 친구, 컴친. 부품 호환성부터 완성형 PC 추천까지 — 내게 맞는 컴퓨터를 쉽게 고르도록 도와드려요.
            </p>
            <p className="mt-3 text-xs text-muted">학교 포트폴리오 프로젝트 · 제작 맹재언</p>
          </div>

          {/* 링크 열 */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-bold text-text">{col.title}</h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.to + l.label}>
                      <Link to={l.to} className="text-sm text-muted transition-colors hover:text-brand">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 하단: 사업자/문의 정보 + 저작권 */}
        <div className="mt-10 border-t border-border pt-6">
          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
            <div className="flex gap-1.5">
              <dt className="font-semibold text-text/80">프로젝트</dt>
              <dd>컴친(컴퓨터 친구)</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="font-semibold text-text/80">문의</dt>
              <dd>
                <a href="mailto:jaeeonmaeng@gmail.com" className="hover:text-brand">
                  jaeeonmaeng@gmail.com
                </a>
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="font-semibold text-text/80">상담</dt>
              <dd>
                <Link to="/support" className="hover:text-brand">
                  1:1 상담 바로가기
                </Link>
              </dd>
            </div>
          </dl>

          <p className="mt-4 text-xs text-muted">
            본 사이트는 학습용 포트폴리오로, 실제 상거래·결제·배송이 이루어지지 않습니다. 표시된 가격·재고는 참고용입니다.
          </p>
          <p className="mt-2 text-xs text-muted">
            © {new Date().getFullYear()} 컴친 (컴퓨터 친구). All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
