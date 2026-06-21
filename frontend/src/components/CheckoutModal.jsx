import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePaymentStore } from '../store/usePaymentStore'
import { useAuthStore } from '../store/useAuthStore'
import { apiCheckout } from '../api/payment'

const formatPrice = (won) => `${(won ?? 0).toLocaleString('ko-KR')}원`
const typeLabel = (t) => (t === 'card' ? '카드' : '계좌')

// 구매하기 → 결제 팝업. amount(결제 금액), summary(구매 내용 설명)을 받는다.
// 로그인/결제수단 확인은 호출하는 쪽에서 끝낸 뒤 연다(결제수단이 1개 이상 있는 상태).
export default function CheckoutModal({ amount, summary, details = null, onClose, onPaid }) {
  const navigate = useNavigate()
  const methods = usePaymentStore((s) => s.methods)
  const loaded = usePaymentStore((s) => s.loaded)
  const fetchMethods = usePaymentStore((s) => s.fetch)
  const invalidateHistory = usePaymentStore((s) => s.invalidateHistory)
  const user = useAuthStore((s) => s.user)

  const [selectedId, setSelectedId] = useState('')
  const [name, setName] = useState(user?.nickname ?? '')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [paid, setPaid] = useState(null) // 결제 완료 결과
  const pressedOnBackdrop = useRef(false)

  useEffect(() => {
    if (!loaded) fetchMethods().catch(() => {})
  }, [loaded, fetchMethods])

  // 선택값이 없으면 첫 결제수단을 기본으로 (effect 없이 파생)
  const activeId = selectedId || methods[0]?.id || ''

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pay = async () => {
    setError(null)
    if (!name.trim()) return setError('이름을 입력하세요.')
    if (phone.replace(/\D/g, '').length < 9) return setError('전화번호를 올바르게 입력하세요.')
    if (!activeId) return setError('결제수단을 선택하세요.')
    setBusy(true)
    try {
      const res = await apiCheckout({ methodId: activeId, amount, summary, details })
      setPaid(res)
      invalidateHistory() // 지갑의 결제 이력을 다음 조회 때 새로 불러오게
    } catch (e) {
      setError(e?.response?.data?.message ?? '결제에 실패했어요. 다시 시도해주세요.')
    } finally {
      setBusy(false)
    }
  }

  const done = () => {
    onPaid?.()
    onClose()
  }

  return createPortal(
    <div
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
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
        className="relative mx-4 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
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

        {paid ? (
          /* ===== 결제 완료 ===== */
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-brand">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-7 w-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-text">결제가 완료되었어요</h2>
            <p className="mt-2 text-sm text-muted">{summary}</p>
            <p className="mt-4 text-3xl font-bold text-text">{formatPrice(paid.amount)}</p>
            <p className="mt-2 text-sm text-muted">
              {paid.method.bank} {typeLabel(paid.method.type)} · {paid.method.numberMasked}
            </p>
            <p className="mt-1 text-xs text-muted">포트폴리오용으로 실제 결제는 이루어지지 않았어요.</p>
            <button
              type="button"
              onClick={done}
              className="mt-6 w-full rounded-xl bg-brand py-3 text-base font-bold text-white transition-colors hover:bg-brand-hover"
            >
              확인
            </button>
          </div>
        ) : methods.length === 0 && loaded ? (
          /* ===== 결제수단 없음 → 등록 유도 ===== */
          <div className="text-center">
            <h2 className="text-lg font-bold text-text">등록된 계좌·카드가 없어요</h2>
            <p className="mt-2 text-sm text-muted">결제하려면 먼저 계좌나 카드를 등록해주세요.</p>
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate('/wallet/new')
              }}
              className="mt-5 w-full rounded-xl bg-brand py-3 text-base font-bold text-white transition-colors hover:bg-brand-hover"
            >
              계좌·카드 등록하러 가기
            </button>
          </div>
        ) : (
          /* ===== 결제 폼 ===== */
          <>
            <h2 className="text-lg font-bold text-text">결제하기</h2>
            <p className="mt-1 text-sm text-muted">{summary}</p>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-surface-2/50 px-4 py-3">
              <span className="text-sm text-muted">결제 금액</span>
              <span className="text-2xl font-bold text-text">{formatPrice(amount)}</span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm text-muted">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="결제자 이름"
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">전화번호</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">결제수단</label>
                <select
                  value={activeId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.bank} {typeLabel(m.type)} · {m.numberMasked}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-rose-500">{error}</p>}

            <button
              type="button"
              disabled={busy}
              onClick={pay}
              className="mt-5 w-full rounded-xl bg-brand py-3 text-base font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
            >
              {busy ? '결제 중…' : `${formatPrice(amount)} 결제하기`}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
