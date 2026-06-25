import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import {
  apiGetMyThread,
  apiSendSupport,
  apiGetThreads,
  apiGetThread,
  apiReplyThread,
} from '../api/support'

// 운영자(관리자) 이메일 — UI 분기용. 실제 권한 검증은 서버에서 한다.
const ADMIN_EMAIL = 'jaeeonmaeng@gmail.com'

// 시각 표기 (오늘이면 시:분, 아니면 월/일 시:분)
function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const t = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? t : `${d.getMonth() + 1}/${d.getDate()} ${t}`
}

// 메시지 목록 (말풍선) — mine: 화면 오른쪽에 둘 발신자(고객뷰=고객, 관리자뷰=관리자)
function MessageList({ messages, mineIsAdmin, emptyText }) {
  const scrollRef = useRef(null)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  return (
    <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
      {messages.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">{emptyText}</p>
      ) : (
        messages.map((m) => {
          const mine = m.fromAdmin === mineIsAdmin
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <span className="mb-0.5 px-1 text-xs text-muted">
                {m.fromAdmin ? '운영자' : '고객'} · {fmtTime(m.createdAt)}
              </span>
              <div
                className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                  mine ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm bg-surface-2 text-text'
                }`}
              >
                {m.content}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// 입력창
function Composer({ onSend, sending, placeholder }) {
  const [text, setText] = useState('')
  const submit = (e) => {
    e.preventDefault()
    const c = text.trim()
    if (!c || sending) return
    onSend(c)
    setText('')
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-brand"
      />
      <button
        type="submit"
        disabled={sending || !text.trim()}
        className="shrink-0 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
      >
        보내기
      </button>
    </form>
  )
}

// ── 고객 화면 ──
function CustomerView() {
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const data = await apiGetMyThread()
        if (alive) setMessages(data.messages ?? [])
      } catch {
        /* 폴링 실패는 조용히 무시 */
      }
    }
    load()
    const id = setInterval(load, 5000) // 운영자 답장 실시간 반영
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const send = async (content) => {
    setSending(true)
    setError('')
    try {
      const data = await apiSendSupport(content)
      setMessages((m) => [...m, data.message])
    } catch (e) {
      setError(e?.response?.data?.message ?? '전송에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSending(false)
    }
  }

  return (
    // 모바일: 주소창 변화를 반영하는 dvh로 보이는 화면에 맞춤. 데스크톱: 고정 비율.
    <div className="flex h-[calc(100dvh-13.5rem)] min-h-88 flex-col overflow-hidden rounded-2xl border border-border bg-surface sm:h-[70vh] sm:min-h-0">
      <div className="border-b border-border bg-surface-2/60 px-4 py-3">
        <p className="text-sm font-bold text-text">운영자와 1:1 상담</p>
        <p className="text-xs text-muted">AI가 아니라 운영자가 직접 확인하고 답해드려요. (답변까지 시간이 걸릴 수 있어요)</p>
      </div>
      <MessageList
        messages={messages}
        mineIsAdmin={false}
        emptyText="궁금한 점을 남겨주세요. 운영자가 확인 후 답해드릴게요. 🙂"
      />
      {error && <p className="px-4 pb-1 text-xs text-red-500">{error}</p>}
      <Composer onSend={send} sending={sending} placeholder="메시지를 입력하세요…" />
    </div>
  )
}

// ── 관리자(운영자) 화면 ──
function AdminView() {
  const [threads, setThreads] = useState([])
  const [selected, setSelected] = useState(null) // { userId }
  const [thread, setThread] = useState(null) // { user, messages }
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  // 스레드 목록 폴링
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const data = await apiGetThreads()
        if (alive) setThreads(data.threads ?? [])
      } catch {
        /* 무시 */
      }
    }
    load()
    const id = setInterval(load, 8000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  // 선택된 스레드 메시지 폴링 (선택 해제/전환 시 thread 정리는 클릭 핸들러에서 처리)
  useEffect(() => {
    if (!selected) return
    let alive = true
    const load = async () => {
      try {
        const data = await apiGetThread(selected.userId)
        if (alive) setThread(data)
      } catch {
        /* 무시 */
      }
    }
    load()
    const id = setInterval(load, 5000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [selected])

  const reply = async (content) => {
    if (!selected) return
    setSending(true)
    setError('')
    try {
      const data = await apiReplyThread(selected.userId, content)
      setThread((t) => (t ? { ...t, messages: [...t.messages, data.message] } : t))
    } catch (e) {
      setError(e?.response?.data?.message ?? '전송에 실패했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSending(false)
    }
  }

  const waiting = threads.filter((t) => t.needsReply).length

  return (
    <div className="flex h-[calc(100dvh-13.5rem)] min-h-96 overflow-hidden rounded-2xl border border-border bg-surface sm:h-[72vh] sm:min-h-0">
      {/* 좌: 스레드 목록 (모바일에서는 스레드 선택 시 숨김) */}
      <aside
        className={`w-full shrink-0 flex-col border-r border-border sm:flex sm:w-72 ${
          selected ? 'hidden sm:flex' : 'flex'
        }`}
      >
        <div className="border-b border-border bg-surface-2/60 px-4 py-3">
          <p className="text-sm font-bold text-text">상담함 (운영자)</p>
          <p className="text-xs text-muted">
            전체 {threads.length}명{waiting > 0 && <span className="text-brand"> · 답장 대기 {waiting}</span>}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="mt-8 px-4 text-center text-sm text-muted">아직 들어온 상담이 없어요.</p>
          ) : (
            threads.map((t) => (
              <button
                key={t.userId}
                type="button"
                onClick={() => {
                  setThread(null) // 이전 대화 잔상 방지
                  setSelected({ userId: t.userId })
                }}
                className={`flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition-colors hover:bg-surface-2 ${
                  selected?.userId === t.userId ? 'bg-surface-2' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-text">
                    {t.nickname || t.email}
                  </span>
                  <span className="shrink-0 text-xs text-muted">{fmtTime(t.lastAt)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {t.needsReply && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />}
                  <span className="truncate text-xs text-muted">{t.lastContent}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* 우: 대화 */}
      <section className={`min-w-0 flex-1 flex-col ${selected ? 'flex' : 'hidden sm:flex'}`}>
        {!selected ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted">
            왼쪽에서 상담을 선택하세요.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border bg-surface-2/60 px-4 py-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-md px-1 text-muted hover:text-text sm:hidden"
                aria-label="목록으로"
              >
                ←
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text">
                  {thread?.user?.nickname || thread?.user?.email || '고객'}
                </p>
                <p className="truncate text-xs text-muted">{thread?.user?.email}</p>
              </div>
            </div>
            <MessageList
              messages={thread?.messages ?? []}
              mineIsAdmin
              emptyText="대화를 불러오는 중…"
            />
            {error && <p className="px-4 pb-1 text-xs text-red-500">{error}</p>}
            <Composer onSend={reply} sending={sending} placeholder="답장을 입력하세요…" />
          </>
        )}
      </section>
    </div>
  )
}

export default function SupportPage() {
  const user = useAuthStore((s) => s.user)
  const ready = useAuthStore((s) => s.ready)
  const isAdmin = (user?.email ?? '').toLowerCase() === ADMIN_EMAIL

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold sm:text-2xl">1:1 상담</h1>
        <p className="mt-1 text-sm text-muted">
          {isAdmin
            ? '들어온 상담에 직접 답장하세요.'
            : '운영자가 직접 답해드리는 상담 창구예요. (AI 상담은 우측 하단 AI 비서를 이용하세요)'}
        </p>
      </div>

      {!ready ? (
        <div className="rounded-2xl border border-border bg-surface px-4 py-16 text-center text-sm text-muted">
          불러오는 중…
        </div>
      ) : !user ? (
        <div className="rounded-2xl border border-border bg-surface px-4 py-16 text-center">
          <p className="text-sm text-muted">상담은 로그인 후 이용할 수 있어요.</p>
          <Link
            to="/login"
            className="mt-4 inline-block rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            로그인하러 가기
          </Link>
        </div>
      ) : isAdmin ? (
        <AdminView />
      ) : (
        <CustomerView />
      )}
    </div>
  )
}
