import { useEffect, useRef, useState } from 'react'
import { useBuildStore, CATEGORIES } from '../store/useBuildStore'
import { useAiStore } from '../store/useAiStore'
import { apiAiChat } from '../api/ai'

const CAT_LABEL = {
  cpu: 'CPU', cpuCooler: 'CPU 쿨러', memory: '메모리', motherboard: '메인보드',
  gpu: '그래픽카드', ssd: 'SSD', hdd: 'HDD', psu: '파워', case: '케이스', os: '윈도우',
}

const GREETING = {
  role: 'assistant',
  content:
    '안녕하세요! 컴친 AI 비서예요. 🖥️\n견적 추천, 부품 호환성, 제품 검색을 도와드려요.\n예) "60만원대 게이밍 PC 추천해줘", "9800X3D랑 호환되는 메인보드 뭐야?"',
}

const SUGGESTIONS = ['80만원대 게이밍 PC 추천해줘', '사무용 견적 짜줘', '지금 담은 견적 호환돼?']

export default function AiAssistant() {
  const open = useAiStore((s) => s.open)
  const toggle = useAiStore((s) => s.toggle)
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)
  const selectedParts = useBuildStore((s) => s.selectedParts)

  // 메시지 추가 시 맨 아래로 스크롤
  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading, open])

  const send = async (text) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setLoading(true)
    try {
      // 현재 담은 견적을 함께 보내 호환성/추천 정확도를 높인다
      const build = CATEGORIES.filter((c) => selectedParts[c]).map((c) => ({
        category: CAT_LABEL[c] ?? c,
        name: selectedParts[c].name,
        price: selectedParts[c].price ?? 0,
      }))
      const data = await apiAiChat({ messages: next, build })
      if (data?.notConfigured) {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'AI 비서가 아직 준비 중이에요. (관리자 설정 필요) 잠시 후 다시 시도해 주세요.' },
        ])
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
      }
    } catch (e) {
      // 429: 속도 제한(연타) 또는 Gemini 무료 한도 초과 → 서버가 준 안내 그대로
      const content =
        e?.response?.status === 429
          ? e.response.data?.message ?? '지금 이용량이 많아요. 잠시 후 다시 시도해 주세요. 🙏'
          : '응답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요. 🙏'
      setMessages((m) => [...m, { role: 'assistant', content }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* 플로팅 런처 버튼 */}
      <button
        type="button"
        onClick={toggle}
        aria-label="컴친 AI 비서 열기"
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl transition-transform hover:scale-105 active:scale-95"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-6 w-6">
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h8M8 14h5M21 12a8 8 0 0 1-8 8H7l-4 3v-4.6A8 8 0 1 1 21 12Z"
            />
          </svg>
        )}
      </button>

      {/* 채팅 패널 */}
      {open && (
        <div className="fixed bottom-24 right-6 z-40 flex h-128 max-h-[calc(100vh-8rem)] w-88 max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          {/* 헤더 */}
          <div className="flex items-center gap-2 border-b border-border bg-surface-2/60 px-4 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-brand">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2 4 4 .5-3 3 .8 4.5L12 17l-3.8 2 .8-4.5-3-3 4-.5z" />
              </svg>
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-text">컴친 AI 비서</p>
              <p className="text-xs text-muted">견적·호환성·제품 상담</p>
            </div>
          </div>

          {/* 메시지 목록 */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-brand text-white'
                      : 'rounded-bl-sm bg-surface-2 text-text'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-surface-2 px-3.5 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
                </div>
              </div>
            )}

            {/* 추천 질문 (대화 시작 전에만) */}
            {messages.length === 1 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-brand hover:text-brand"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 입력 */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="무엇이든 물어보세요…"
              className="min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="보내기"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
