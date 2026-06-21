import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import GoogleLoginButton from '../components/GoogleLoginButton'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const isLoading = useAuthStore((s) => s.isLoading)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err?.response?.data?.message ?? '로그인에 실패했습니다.')
    }
  }

  return (
    <section className="mx-auto max-w-sm">
      <h2 className="mb-6 text-2xl font-bold">로그인</h2>
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
          <span className="text-muted">비밀번호</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {isLoading ? '로그인 중…' : '로그인'}
        </button>
      </form>

      {/* 회원가입 안내 + 버튼 */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted">아직 회원이 아니신가요?</span>
        <Link
          to="/signup"
          className="rounded-md border border-brand px-4 py-2 font-semibold text-brand hover:bg-brand/10"
        >
          회원가입
        </Link>
      </div>

      <div className="mt-6">
        <GoogleLoginButton onError={setError} />
      </div>
    </section>
  )
}
