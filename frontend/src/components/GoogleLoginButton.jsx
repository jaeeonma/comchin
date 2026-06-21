import { useState } from 'react'
import { createPortal } from 'react-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

// 구글 로그인 버튼.
// - 이미 비밀번호까지 있는 계정 → 바로 로그인.
// - 처음 오는(회원가입 안 된) 계정 → "사이트에서 쓸 비밀번호 정하기" 창을 띄우고,
//   입력하면 그 구글 이메일 + 입력한 비밀번호로 회원 저장 후 로그인.
// VITE_GOOGLE_CLIENT_ID 가 없으면 아무것도 렌더하지 않는다.
export default function GoogleLoginButton({ onError }) {
  const navigate = useNavigate()
  const googleLogin = useAuthStore((s) => s.googleLogin)
  const [pending, setPending] = useState(null) // { credential, email, nickname }
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return null

  const handleCredential = async (credential) => {
    try {
      const data = await googleLogin(credential)
      if (data.user) {
        navigate('/')
      } else if (data.needPassword) {
        // 처음 오는 계정 → 비밀번호 설정 창
        setPw('')
        setPwError('')
        setPending({ credential, email: data.email, nickname: data.nickname })
      }
    } catch {
      onError?.('구글 로그인에 실패했습니다.')
    }
  }

  const submitPassword = async (e) => {
    e.preventDefault()
    setPwError('')
    if (pw.length < 4) {
      setPwError('비밀번호는 4자 이상이어야 합니다.')
      return
    }
    setSubmitting(true)
    try {
      const data = await googleLogin(pending.credential, pw)
      if (data.user) {
        setPending(null)
        navigate('/')
      } else {
        setPwError('저장에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (err) {
      setPwError(err?.response?.data?.message ?? '저장에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        또는
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={(cred) => handleCredential(cred.credential)}
          onError={() => onError?.('구글 로그인에 실패했습니다.')}
          text="continue_with"
          shape="rectangular"
        />
      </div>

      {/* 처음 오는 구글 계정 → 사이트용 비밀번호 정하기 */}
      {pending &&
        createPortal(
          <div
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
            onClick={() => setPending(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl"
            >
              <h3 className="text-lg font-bold">비밀번호 설정</h3>
              <p className="mt-1 text-sm text-muted">
                <span className="font-semibold text-text">{pending.email}</span> 계정으로 처음 오셨네요.
                이메일 로그인에도 쓸 비밀번호를 정해주세요.
              </p>
              <form onSubmit={submitPassword} className="mt-4 flex flex-col gap-3">
                <input
                  type="password"
                  autoFocus
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="비밀번호 (4자 이상)"
                  className="rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
                />
                {pwError && <p className="text-sm text-rose-500">{pwError}</p>}
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPending(null)}
                    className="flex-1 rounded-md border border-border py-2.5 text-sm font-semibold hover:bg-surface-2"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 rounded-md bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-60"
                  >
                    {submitting ? '저장 중…' : '가입 완료'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
