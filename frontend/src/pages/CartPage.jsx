import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/useCartStore'
import { useAuthStore } from '../store/useAuthStore'
import { usePaymentStore } from '../store/usePaymentStore'
import CheckoutModal from '../components/CheckoutModal'

const formatPrice = (won) => `${won.toLocaleString('ko-KR')}원`

// 상세 페이지 경로: 완본체 /pc/:id, 부품 /part/:id, 직접 견적은 견적 페이지로
const detailPath = (it) => {
  if (it.type === 'pc') return `/pc/${it.id}`
  if (it.type === 'build') return '/builder'
  return `/part/${it.id}`
}
const typeLabel = (type) => {
  if (type === 'pc') return '완성PC'
  if (type === 'build') return '내 견적'
  return '부품'
}

function QtyStepper({ qty, onChange }) {
  return (
    <div className="inline-flex items-center rounded-md border border-border">
      <button
        type="button"
        aria-label="수량 감소"
        onClick={() => onChange(qty - 1)}
        className="flex h-8 w-8 items-center justify-center text-muted hover:text-text disabled:opacity-40"
        disabled={qty <= 1}
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-medium">{qty}</span>
      <button
        type="button"
        aria-label="수량 증가"
        onClick={() => onChange(qty + 1)}
        className="flex h-8 w-8 items-center justify-center text-muted hover:text-text"
      >
        +
      </button>
    </div>
  )
}

function CartRow({ item, onQty, onRemove }) {
  return (
    <div className="flex items-center gap-4 border-b border-border py-4">
      {/* 이미지 */}
      <Link
        to={detailPath(item)}
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white"
      >
        {item.image ? (
          <img src={item.image} alt={item.name} className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-gray-400">이미지 없음</span>
        )}
      </Link>

      {/* 이름 + 단가 */}
      <div className="min-w-0 flex-1">
        <span className="mb-1 inline-block rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">
          {typeLabel(item.type)}
        </span>
        <Link to={detailPath(item)} className="block truncate font-medium hover:text-brand" title={item.name}>
          {item.name}
        </Link>
        <p className="mt-0.5 text-sm text-muted">{formatPrice(item.price)}</p>
      </div>

      {/* 수량 */}
      <div className="hidden sm:block">
        <QtyStepper qty={item.qty} onChange={(q) => onQty(item.key, q)} />
      </div>

      {/* 합계 */}
      <div className="w-28 shrink-0 text-right">
        <p className="font-bold">{formatPrice(item.price * item.qty)}</p>
        <div className="mt-1 sm:hidden">
          <QtyStepper qty={item.qty} onChange={(q) => onQty(item.key, q)} />
        </div>
      </div>

      {/* 삭제 */}
      <button
        type="button"
        aria-label="삭제"
        onClick={() => onRemove(item.key)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-rose-500"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}

export default function CartPage() {
  const user = useAuthStore((s) => s.user)
  const items = useCartStore((s) => s.items)
  const setQty = useCartStore((s) => s.setQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const clear = useCartStore((s) => s.clear)
  const navigate = useNavigate()
  const [showCheckout, setShowCheckout] = useState(false)

  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0)

  // 주문하기 → 결제. 결제수단 없으면 등록 페이지로.
  const openCheckout = () => {
    const proceed = () => {
      if (usePaymentStore.getState().methods.length === 0) {
        navigate('/wallet/new')
        return
      }
      setShowCheckout(true)
    }
    const st = usePaymentStore.getState()
    if (!st.loaded) st.fetch().finally(proceed)
    else proceed()
  }

  // 로그인 필요 — 비로그인 시 장바구니 사용 불가
  if (!user) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-bold">장바구니</h1>
        <div className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-8">
          <p className="text-muted">장바구니는 로그인 후 이용할 수 있어요.</p>
          <Link
            to="/login"
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            로그인하러 가기
          </Link>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-bold">장바구니</h1>
        <p className="mt-4 text-muted">장바구니가 비어 있습니다.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hover">
            완성PC 보러가기
          </Link>
          <Link to="/parts" className="rounded-lg border border-border px-5 py-2.5 font-semibold hover:border-brand">
            부품 보러가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-12">
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">장바구니</h1>
        <button type="button" onClick={clear} className="text-sm text-muted hover:text-rose-500">
          전체 비우기
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* 상품 목록 */}
        <div>
          <div className="border-t border-border">
            {items.map((item) => (
              <CartRow key={item.key} item={item} onQty={setQty} onRemove={removeItem} />
            ))}
          </div>
          <div className="mt-4">
            <Link to="/parts" className="text-sm text-muted hover:text-brand">← 쇼핑 계속하기</Link>
          </div>
        </div>

        {/* 결제 요약 (적립금·배송비 제외 — 제품 금액 / 총 금액만) */}
        <aside className="h-fit rounded-xl border border-border bg-surface p-5 lg:sticky lg:top-28">
          <h2 className="mb-4 font-bold">결제 정보</h2>
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-muted">제품 금액</span>
            <span className="font-medium">{formatPrice(total)}</span>
          </div>
          <div className="my-3 border-t border-border" />
          <div className="flex items-center justify-between py-1">
            <span className="font-semibold">총 금액</span>
            <span className="text-2xl font-bold text-brand">{formatPrice(total)}</span>
          </div>

          <button
            type="button"
            onClick={openCheckout}
            className="mt-5 w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white transition-colors hover:bg-brand-hover"
          >
            주문하기
          </button>
          <p className="mt-2 text-center text-xs text-muted">등록한 계좌·카드로 결제해요.</p>
        </aside>
      </div>

      {/* 결제 팝업 — 결제 완료 시 장바구니 비움 */}
      {showCheckout && (
        <CheckoutModal
          amount={total}
          summary={`장바구니 ${items.length}종 (${items.reduce((s, it) => s + it.qty, 0)}개)`}
          onClose={() => setShowCheckout(false)}
          onPaid={() => clear()}
        />
      )}
    </div>
  )
}
