import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { usePaymentStore } from '../store/usePaymentStore'
import { useAuthStore } from '../store/useAuthStore'
import BankLogo from '../components/BankLogo'

const typeLabel = (t) => (t === 'card' ? '카드' : '계좌')
const formatPrice = (won) => `${(won ?? 0).toLocaleString('ko-KR')}원`

// 결제 일시: 2026. 6. 19. 오후 3:21 형식
const formatDate = (iso) =>
  new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

function HistoryRow({ order }) {
  const [open, setOpen] = useState(false)
  const details = Array.isArray(order.details) ? order.details : []
  const hasDetails = details.length > 0

  return (
    <div className="border-b border-border py-3 last:border-0">
      <div className="flex items-center gap-3">
        <BankLogo name={order.methodBank} className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-text" title={order.summary}>
              {order.summary}
            </p>
            {hasDetails && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted transition-colors hover:border-brand hover:text-brand"
              >
                견적 상세 보기
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {order.methodBank} {typeLabel(order.methodType)} · {order.numberMasked}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-bold text-text">{formatPrice(order.amount)}</p>
          <p className="mt-0.5 text-xs text-muted">{formatDate(order.paidAt)}</p>
        </div>
      </div>

      {/* 구매한 부품 내역 */}
      {hasDetails && open && (
        <ul className="mt-3 ml-13 divide-y divide-border rounded-lg border border-border bg-surface-2/40">
          {details.map((it, i) => (
            <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-20 shrink-0 text-xs font-semibold text-muted">{it.category}</span>
              <span className="min-w-0 flex-1 truncate text-text" title={it.name}>
                {it.name}
              </span>
              <span className="shrink-0 text-muted">{formatPrice(it.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MethodCard({ method, onRemove }) {
  const isCard = method.type === 'card'
  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border p-5 text-white shadow-md ${
        isCard ? 'bg-linear-to-br from-indigo-600 to-violet-700' : 'bg-linear-to-br from-slate-700 to-slate-900'
      }`}
    >
      <button
        type="button"
        aria-label="삭제"
        onClick={() => onRemove(method.id)}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/25 text-white/90 transition-colors hover:bg-rose-500"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4.5 w-4.5">
          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="flex items-center gap-2">
        <BankLogo name={method.bank} className="h-11 w-11 shrink-0" />
        <span className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-bold">{typeLabel(method.type)}</span>
        <span className="text-sm font-semibold">{method.bank}</span>
      </div>

      <p className="mt-8 font-mono text-lg tracking-widest">{method.numberMasked}</p>
      <p className="mt-2 text-sm text-white/80">{method.holderName}</p>
    </div>
  )
}

export default function WalletPage() {
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.ready)
  const methods = usePaymentStore((s) => s.methods)
  const loaded = usePaymentStore((s) => s.loaded)
  const loading = usePaymentStore((s) => s.loading)
  const fetchMethods = usePaymentStore((s) => s.fetch)
  const remove = usePaymentStore((s) => s.remove)
  const history = usePaymentStore((s) => s.history)
  const historyLoaded = usePaymentStore((s) => s.historyLoaded)
  const historyLoading = usePaymentStore((s) => s.historyLoading)
  const fetchHistory = usePaymentStore((s) => s.fetchHistory)

  useEffect(() => {
    if (user && !loaded) fetchMethods().catch(() => {})
  }, [user, loaded, fetchMethods])

  useEffect(() => {
    if (user && !historyLoaded) fetchHistory().catch(() => {})
  }, [user, historyLoaded, fetchHistory])

  // 로그인 필요 — 세션 복원 끝났는데 비로그인이면 로그인 페이지로
  if (ready && !user) return <Navigate to="/login" replace />

  const onRemove = (id) => {
    if (window.confirm('이 결제수단을 삭제할까요?')) remove(id).catch(() => {})
  }

  return (
    <div className="pb-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">내 계좌·카드</h1>
          <p className="mt-1 text-muted">등록한 결제수단을 확인하고 추가·삭제할 수 있어요.</p>
        </div>
        <Link
          to="/wallet/new"
          className="shrink-0 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
        >
          + 추가하기
        </Link>
      </div>

      {!loaded && loading ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
          <p>불러오는 중…</p>
        </div>
      ) : methods.length === 0 ? (
        <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-muted">아직 등록된 계좌·카드가 없어요.</p>
          <Link
            to="/wallet/new"
            className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hover"
          >
            계좌·카드 등록하기
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {methods.map((m) => (
            <MethodCard key={m.id} method={m} onRemove={onRemove} />
          ))}
        </div>
      )}

      {/* 결제 이력 — 무엇을, 얼마에, 언제 결제했는지 */}
      <section className="mt-12">
        <h2 className="text-xl font-bold sm:text-2xl">결제 이력</h2>
        <p className="mt-1 text-muted">결제한 상품과 금액, 시간을 확인할 수 있어요.</p>

        <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
          {!historyLoaded && historyLoading ? (
            <div className="flex flex-col items-center gap-3 py-10 text-muted">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-brand" />
              <p>불러오는 중…</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-muted">아직 결제 내역이 없어요.</div>
          ) : (
            <div>
              {history.map((order) => (
                <HistoryRow key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
