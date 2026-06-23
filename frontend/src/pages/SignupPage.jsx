import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import GoogleLoginButton from '../components/GoogleLoginButton'
import { validateEmail, validateNickname, validatePassword } from '../lib/validators'

export default function SignupPage() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const isLoading = useAuthStore((s) => s.isLoading)

  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    // 정규식 검증 — 이메일/닉네임/비밀번호 형식 (서버에서도 동일하게 재검증)
    const formError =
      validateEmail(email) || validateNickname(nickname) || validatePassword(password)
    if (formError) {
      setError(formError)
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    try {
      await register({ email: email.trim(), password, nickname: nickname.trim() })
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.message ?? '회원가입에 실패했습니다.')
    }
  }

  return (
    <section className="mx-auto max-w-sm">
      <h2 className="mb-2 text-2xl font-bold">회원가입</h2>
      <p className="mb-6 text-sm text-muted">
        구글로 로그인한 적이 있다면, 같은 이메일로 비밀번호를 설정하면 이메일 로그인도 함께 쓸 수 있어요.
      </p>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">이메일</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-brand"
            placeholder="you@example.com"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">닉네임 <span className="text-xs">(선택)</span></span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-brand"
            placeholder="비우면 이메일 앞부분으로 설정돼요"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">비밀번호</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-brand"
            placeholder="영문+숫자 포함 8자 이상"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">비밀번호 확인</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 outline-none focus:border-brand"
            placeholder="••••••••"
          />
        </label>

        {error && <p className="text-sm text-rose-500">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 rounded-md bg-brand py-2.5 font-semibold text-white hover:bg-brand-hover disabled:opacity-60"
        >
          {isLoading ? '가입 중…' : '회원가입'}
        </button>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted">이미 회원이신가요?</span>
        <Link to="/login" className="font-semibold text-brand hover:underline">
          로그인
        </Link>
      </div>

      <div className="mt-6">
        <GoogleLoginButton onError={setError} />
      </div>
    </section>
  )
}
