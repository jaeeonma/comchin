import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { usePaymentStore } from '../store/usePaymentStore'
import { useAuthStore } from '../store/useAuthStore'
import Captcha from '../components/Captcha'
import BankLogo from '../components/BankLogo'
import { BANKS } from '../lib/banks'

export default function AddPaymentPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.ready)
  const add = usePaymentStore((s) => s.add)

  const [type, setType] = useState('account') // 'account' | 'card'
  const [bank, setBank] = useState('')
  const [holderName, setHolderName] = useState(user?.nickname ?? '')
  const [phone, setPhone] = useState('')
  const [ssnFront, setSsnFront] = useState('') // 주민번호 앞 6자리(저장하지 않음 — 본인확인용)
  const [number, setNumber] = useState('')
  const [captchaOk, setCaptchaOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // 로그인 필요
  if (ready && !user) return <Navigate to="/login" replace />

  const banks = BANKS[type]

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!bank) return setError(`${type === 'card' ? '카드사' : '은행'}를 선택하세요.`)
    if (!holderName.trim()) return setError('이름을 입력하세요.')
    if (phone.replace(/\D/g, '').length < 9) return setError('전화번호를 올바르게 입력하세요.')
    if (ssnFront.replace(/\D/g, '').length !== 6) return setError('주민등록번호 앞 6자리를 입력하세요.')
    if (!captchaOk) return setError('보안문자를 정확히 입력하세요.')
    const digits = number.replace(/\D/g, '')
    if (type === 'card' && digits.length < 15) return setError('카드번호 16자리를 입력하세요.')
    if (type === 'account' && digits.length < 8) return setError('계좌번호를 올바르게 입력하세요.')

    setBusy(true)
    try {
      await add({ type, bank, holderName: holderName.trim(), phone: phone.trim(), number: digits })
      navigate('/wallet') // 등록 완료 → 조회 페이지에서 보여줌
    } catch (err) {
      setError(err?.response?.data?.message ?? '등록에 실패했어요. 다시 시도해주세요.')
      setBusy(false)
    }
  }

  const field = 'w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand'

  return (
    <div className="mx-auto max-w-lg pb-12">
      <nav className="mb-4 text-sm text-muted">
        <Link to="/wallet" className="hover:text-text">내 계좌·카드</Link>
        <span className="px-2">/</span>
        <span className="text-text">등록</span>
      </nav>

      <h1 className="text-2xl font-bold sm:text-3xl">계좌·카드 등록</h1>
      <p className="mt-1 text-muted">본인 확인 후 결제수단을 추가해요. (포트폴리오용 — 실제 인증은 하지 않아요)</p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-surface p-5">
        {/* 종류 */}
        <div>
          <span className="mb-1.5 block text-sm text-muted">종류</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['account', '계좌'],
              ['card', '카드'],
            ].map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setType(v)
                  setBank('')
                }}
                className={`rounded-lg border py-2.5 text-sm font-semibold transition-colors ${
                  type === v ? 'border-brand bg-brand/10 text-brand' : 'border-border text-text hover:border-brand/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 은행사/카드사 — 로고 카드로 선택 */}
        <div>
          <label className="mb-1.5 block text-sm text-muted">{type === 'card' ? '카드사' : '은행'}</label>
          <div className="grid grid-cols-3 gap-2.5">
            {banks.map((b) => (
              <button
                key={b.slug}
                type="button"
                onClick={() => setBank(b.name)}
                aria-pressed={bank === b.name}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
                  bank === b.name ? 'border-brand bg-brand/10' : 'border-border hover:border-brand/50'
                }`}
              >
                <BankLogo slug={b.slug} className="h-16 w-16" />
                <span className="text-xs font-medium text-text">{b.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 이름 */}
        <div>
          <label className="mb-1 block text-sm text-muted">이름</label>
          <input type="text" value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="예금주/카드주" className={field} />
        </div>

        {/* 전화번호 */}
        <div>
          <label className="mb-1 block text-sm text-muted">전화번호</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className={field} />
        </div>

        {/* 주민번호 앞자리 */}
        <div>
          <label className="mb-1 block text-sm text-muted">주민등록번호 앞 6자리</label>
          <input
            type="text"
            inputMode="numeric"
            value={ssnFront}
            onChange={(e) => setSsnFront(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="******"
            className={field}
          />
          <p className="mt-1 text-xs text-muted">본인 확인용으로만 쓰이고 저장되지 않아요.</p>
        </div>

        {/* 번호 */}
        <div>
          <label className="mb-1 block text-sm text-muted">{type === 'card' ? '카드번호' : '계좌번호'}</label>
          <input
            type="text"
            inputMode="numeric"
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/[^\d-]/g, ''))}
            placeholder={type === 'card' ? '0000-0000-0000-0000' : '예: 110-123-456789'}
            className={field}
          />
        </div>

        {/* 보안 인증 */}
        <div>
          <span className="mb-1.5 block text-sm text-muted">보안 인증</span>
          <Captcha onValidChange={setCaptchaOk} />
        </div>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand py-3 text-base font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {busy ? '등록 중…' : '등록하기'}
        </button>
      </form>
    </div>
  )
}
