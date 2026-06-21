import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

const formatPrice = (won) => `${(won ?? 0).toLocaleString('ko-KR')}원`

// 직접 견적의 "장바구니"는 저장한 견적을 골라서 담는다.
// builds: 현재 사용자가 저장한 견적 목록
// onAdd(build): 선택한 견적을 장바구니에 담는다
export default function CartFromSavedModal({ builds = [], onAdd, onClose }) {
  const [selectedId, setSelectedId] = useState(null)
  const selected = builds.find((b) => b.id === selectedId) ?? null

  // ESC 로 닫기
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleAdd = () => {
    if (!selected) return
    onAdd(selected)
    onClose()
  }

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5,7,12,0.78)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'pc-modal-in 0.25s ease both' }}
        className="relative mx-4 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        {/* 닫기 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <h2 className="text-lg font-bold text-text">저장한 견적 담기</h2>
        <p className="mt-1 text-sm text-muted">
          저장한 견적 중 하나를 골라 장바구니에 담아 보세요.
        </p>

        {/* 견적 목록 (선택 칸) */}
        <div className="mt-4 flex-1 overflow-y-auto">
          {builds.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-2/40 p-8 text-center text-sm text-muted">
              아직 저장한 견적이 없어요.
              <br />
              구매하기 → 저장하기로 견적을 먼저 저장해 주세요.
            </div>
          ) : (
            <ul className="space-y-2">
              {builds.map((b) => {
                const active = b.id === selectedId
                return (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(b.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? 'border-brand bg-brand/10'
                          : 'border-border bg-surface-2/40 hover:border-brand/50'
                      }`}
                    >
                      {/* 케이스 사진 */}
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
                        {b.caseImage ? (
                          <img src={b.caseImage} alt={b.name} className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-gray-400">이미지 없음</span>
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-text" title={b.name}>
                          {b.name}
                        </span>
                        <span className="mt-0.5 block text-sm text-muted">{formatPrice(b.price)}</span>
                      </span>

                      {/* 선택 표시 */}
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          active ? 'border-brand bg-brand' : 'border-border'
                        }`}
                      >
                        {active && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="h-3 w-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* 버튼 행 */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-border py-3 text-base font-bold text-text transition-colors hover:bg-surface-2"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={handleAdd}
            className={`flex-1 rounded-xl py-3 text-base font-bold transition-colors ${
              selected
                ? 'bg-brand text-white hover:bg-brand-hover'
                : 'cursor-not-allowed bg-surface-2 text-muted'
            }`}
          >
            담기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
