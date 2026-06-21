import { createPortal } from 'react-dom'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'

// Three.js 묶음이 무거우므로 팝업을 처음 열 때만 불러온다(코드 스플리팅).
const Pc3DScene = lazy(() => import('./Pc3DScene'))

const formatPrice = (won) => `${won.toLocaleString('ko-KR')}원`

// onSave 가 있으면(직접 견적) 확인 옆에 "저장하기" 버튼이 보인다.
// defaultName: 입력창 기본값(comchin-pc-N).
export default function BuyPlayModal({ price, caseInfo, onClose, onSave, defaultName = '', onCheckout }) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(defaultName)
  // 배경에서 "눌림이 시작"됐을 때만 닫는다. (3D를 드래그하다 배경에서 떼도 안 닫히게)
  const pressedOnBackdrop = useRef(false)

  const handleSave = () => {
    if (!saving) {
      // 1차 클릭 → 이름 입력창 노출
      setName(defaultName)
      setSaving(true)
      return
    }
    // 2차 클릭 → 실제 저장
    onSave(name)
    onClose()
  }
  // ESC 로 닫기
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        // 배경을 직접 눌러서(드래그가 아니라) 배경에서 뗐을 때만 닫기
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose()
      }}
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
        className="relative mx-4 w-full max-w-lg rounded-2xl border border-border bg-surface px-8 pb-9 pt-8 text-center shadow-2xl"
      >
        {/* 닫기 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <p className="text-sm font-semibold tracking-wide text-brand">조립 준비 완료</p>

        {/* 3D 무대 — 도형 기반 실제 3D PC (드래그로 돌릴 수 있고 자동 회전) */}
        <div className="mx-auto my-4 h-96 w-full cursor-grab active:cursor-grabbing">
          <Suspense fallback={null}>
            <Pc3DScene caseInfo={caseInfo} />
          </Suspense>
        </div>
        <p className="-mt-2 mb-2 text-xs text-muted">드래그하면 직접 돌려볼 수 있어요</p>

        {/* 가격 */}
        <p className="text-sm text-muted">선택 총액</p>
        <p className="mt-1 text-3xl font-bold text-text">{formatPrice(price)}</p>

        {/* 저장 이름 입력 (저장하기 누르면 노출) */}
        {onSave && saving && (
          <div className="mt-4 text-left">
            <label htmlFor="build-name" className="mb-1 block text-sm text-muted">
              견적 이름
            </label>
            <input
              id="build-name"
              type="text"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={defaultName}
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
            />
          </div>
        )}

        {!saving && (
          <p className="mt-4 text-xs text-muted">
            결제하기를 누르면 등록한 계좌·카드로 결제해요. (포트폴리오용)
          </p>
        )}

        {/* 버튼 행: (직접 견적이면) 저장하기 + 결제하기 */}
        <div className="mt-5 flex gap-3">
          {onSave && (
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 rounded-xl border border-border py-3 text-base font-bold text-text transition-colors hover:bg-surface-2"
            >
              {saving ? '저장' : '저장하기'}
            </button>
          )}
          <button
            type="button"
            onClick={onCheckout ?? onClose}
            className="flex-[1.4] rounded-xl bg-brand py-3 text-base font-bold text-white transition-colors hover:bg-brand-hover"
          >
            {onCheckout ? '결제하기' : '확인'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
