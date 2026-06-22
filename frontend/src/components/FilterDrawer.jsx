import { createPortal } from 'react-dom'
import { useEffect } from 'react'

// 모바일 필터 드로어 (오른쪽에서 슬라이드). 데스크톱(lg)에선 사이드바를 쓰므로 lg:hidden.
// children = 필터 본문(FilterGroup 들), resultLabel = 하단 적용 버튼 문구.
export default function FilterDrawer({ open, onClose, onReset, activeCount = 0, resultLabel = '결과 보기', children }) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-80 max-w-[85%] flex-col bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-bold">필터{activeCount > 0 ? ` (${activeCount})` : ''}</h2>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <button type="button" onClick={onReset} className="text-sm text-muted hover:text-brand">
                초기화
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="필터 닫기"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-text"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>

        <div className="border-t border-border p-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-brand py-3 font-bold text-white transition-colors hover:bg-brand-hover"
          >
            {resultLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// 모바일용 "필터" 트리거 버튼 (lg:hidden). activeCount > 0 이면 배지 표시.
export function FilterButton({ onClick, activeCount = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:border-brand lg:hidden"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
      </svg>
      필터
      {activeCount > 0 && (
        <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold leading-none text-white">
          {activeCount}
        </span>
      )}
    </button>
  )
}
