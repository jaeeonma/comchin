import { useCallback, useEffect, useRef, useState } from 'react'
import { useBuildStore, CATEGORIES } from '../store/useBuildStore'
import { useAiStore } from '../store/useAiStore'
import { useAuthStore } from '../store/useAuthStore'
import { useSavedBuildStore } from '../store/useSavedBuildStore'
import { useFavoriteStore } from '../store/useFavoriteStore'
import { prebuiltPCs } from '../data/prebuiltPCs'
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

// 창 크기 한계(px)
const DEFAULT_W = 352
const DEFAULT_H = 512
const MIN_W = 300
const MIN_H = 360

export default function AiAssistant() {
  const open = useAiStore((s) => s.open)
  const toggle = useAiStore((s) => s.toggle)
  const bottomBar = useAiStore((s) => s.bottomBar) // 하단 구매바 있으면 위로 띄움
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)
  const selectedParts = useBuildStore((s) => s.selectedParts)
  const user = useAuthStore((s) => s.user)
  const addBuild = useSavedBuildStore((s) => s.addBuild)
  const toggleFav = useFavoriteStore((s) => s.toggle)
  const isFav = useFavoriteStore((s) => s.isFavorite)

  // 창 크기/위치 — pos가 null이면 기본 위치(우하단 도킹), 값이 있으면 자유 위치(left/top px)
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H })
  const [pos, setPos] = useState(null)
  const [moved, setMoved] = useState(false) // 한 번이라도 옮겼는지 → 닫기 X 노출

  // 이동/크기조절은 데스크톱(>=640px)에서만 — 모바일에서는 끈다
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const onChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // 창을 기본 상태(우하단 도킹·기본 크기)로 되돌린다
  const resetWindow = () => {
    setPos(null)
    setSize({ w: DEFAULT_W, h: DEFAULT_H })
    setMoved(false)
  }

  // 메시지 추가 시 맨 아래로 스크롤
  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading, open])

  // 브라우저 창이 작아지면 패널이 화면 밖으로 나가지 않게 위치를 보정
  useEffect(() => {
    if (!pos) return
    const onResize = () => {
      setPos((p) => {
        if (!p) return p
        const maxLeft = window.innerWidth - 80
        const maxTop = window.innerHeight - 60
        return {
          left: Math.min(Math.max(p.left, 8 - size.w + 80), maxLeft),
          top: Math.min(Math.max(p.top, 8), maxTop),
        }
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [pos, size.w])

  // 드래그(이동)/리사이즈 공통 시작 — 진행 중에만 전역 리스너를 붙였다 뗀다.
  // (ref를 읽지 않고, 이벤트 대상에서 패널 DOM을 찾아 시작 좌표를 얻는다)
  const beginInteraction = useCallback((e, kind, dir) => {
    e.preventDefault()
    const panel = e.currentTarget.closest('[data-ai-panel]')
    if (!panel) return
    const r = panel.getBoundingClientRect()
    // 진행 중 드래그 정보는 클로저 지역변수로 보관(리렌더 무관)
    const s = { startX: e.clientX, startY: e.clientY, left: r.left, top: r.top, w: r.width, h: r.height }
    // 어떤 조작이든 자유 위치로 전환(도킹 해제). 단, 닫기 X는 "이동"했을 때만 띄운다.
    setPos({ left: r.left, top: r.top })
    setSize({ w: r.width, h: r.height })
    if (kind === 'move') setMoved(true)

    const onMove = (ev) => {
      const dx = ev.clientX - s.startX
      const dy = ev.clientY - s.startY
      if (kind === 'move') {
        const maxLeft = window.innerWidth - 80
        const maxTop = window.innerHeight - 60
        setPos({
          left: Math.min(Math.max(s.left + dx, 8 - s.w + 80), maxLeft),
          top: Math.min(Math.max(s.top + dy, 8), maxTop),
        })
      } else {
        let { left, top, w, h } = s
        if (dir.includes('e')) w = s.w + dx
        if (dir.includes('s')) h = s.h + dy
        if (dir.includes('w')) { w = s.w - dx; left = s.left + dx }
        if (dir.includes('n')) { h = s.h - dy; top = s.top + dy }
        // 최소 크기 보정 (좌/상단 핸들이면 위치도 같이 보정)
        if (w < MIN_W) { if (dir.includes('w')) left = s.left + (s.w - MIN_W); w = MIN_W }
        if (h < MIN_H) { if (dir.includes('n')) top = s.top + (s.h - MIN_H); h = MIN_H }
        // 화면 안으로 제한
        w = Math.min(w, window.innerWidth - 16)
        h = Math.min(h, window.innerHeight - 16)
        setSize({ w, h })
        setPos({ left, top })
      }
    }
    const onUp = () => {
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

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
        // AI가 직접 견적을 확정했으면 자동 저장 — 로그인 사용자는 계정에, 게스트는 안내와 함께
        if (data?.savedBuild?.parts && Object.keys(data.savedBuild.parts).length) {
          const sb = data.savedBuild
          const name = `제미나이 추천 ${sb.name || 'PC'}`.slice(0, 40)
          addBuild({ name, caseImage: sb.caseImage ?? null, price: sb.price ?? 0, parts: sb.parts })
          const note = user
            ? `✅ 이 견적을 '${name}'(으)로 직접 견적에 저장해뒀어요.\n'직접 견적 → 저장한 견적'에서 언제든 불러와 담을 수 있어요. 🛠️`
            : `📌 이 견적을 '${name}'(으)로 담아뒀어요.\n⚠️ 다만 로그인을 안 하셔서, 새로고침하거나 창을 닫으면 사라져요. 로그인하면 계정에 안전하게 저장돼요!`
          setMessages((m) => [...m, { role: 'assistant', content: note }])
        }
        // AI가 추천 완본체를 저장 요청받았으면 즐겨찾기에 담는다 (완본체는 직접견적이 아니라 찜에 저장)
        if (data?.savePc?.id) {
          const pc = prebuiltPCs.find((p) => p.id === data.savePc.id)
          if (pc) {
            const already = isFav('pc', pc.id)
            if (!already) {
              toggleFav({ id: pc.id, type: 'pc', name: pc.name, image: pc.image, price: pc.price })
            }
            const note = already
              ? `⭐ '${pc.name}'은(는) 이미 즐겨찾기에 있어요.`
              : user
                ? `⭐ '${pc.name}'을(를) 즐겨찾기에 저장했어요.\n상단 ♥(즐겨찾기)에서 언제든 볼 수 있어요!`
                : `⭐ '${pc.name}'을(를) 즐겨찾기에 담아뒀어요.\n⚠️ 다만 로그인을 안 하셔서, 새로고침하면 사라져요. 로그인하면 계정에 저장돼요!`
            setMessages((m) => [...m, { role: 'assistant', content: note }])
          }
        }
      }
    } catch (e) {
      // 429(속도제한/한도)·503(모델 과부하) → 서버가 준 친절 안내를 그대로 보여준다
      const status = e?.response?.status
      const content =
        status === 429 || status === 503
          ? e.response.data?.message ?? '지금 이용량이 많아요. 잠시 후 다시 시도해 주세요. 🙏'
          : '응답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요. 🙏'
      setMessages((m) => [...m, { role: 'assistant', content }])
    } finally {
      setLoading(false)
    }
  }

  // 패널 위치/크기 스타일 — 데스크톱에서 옮겼으면 자유 위치, 그 외엔 우하단 도킹(기본 크기)
  const panelStyle =
    isDesktop && pos
      ? { left: pos.left, top: pos.top, width: size.w, height: size.h }
      : {
          right: 24,
          bottom: bottomBar ? 192 : 96,
          width: isDesktop ? size.w : DEFAULT_W,
          height: isDesktop ? size.h : DEFAULT_H,
        }

  // 리사이즈 핸들 (가장자리 4 + 모서리 4)
  const HANDLES = [
    { dir: 'n', cls: 'left-2 right-2 top-0 h-1.5 cursor-ns-resize' },
    { dir: 's', cls: 'left-2 right-2 bottom-0 h-1.5 cursor-ns-resize' },
    { dir: 'w', cls: 'top-2 bottom-2 left-0 w-1.5 cursor-ew-resize' },
    { dir: 'e', cls: 'top-2 bottom-2 right-0 w-1.5 cursor-ew-resize' },
    { dir: 'nw', cls: 'left-0 top-0 h-3 w-3 cursor-nwse-resize' },
    { dir: 'ne', cls: 'right-0 top-0 h-3 w-3 cursor-nesw-resize' },
    { dir: 'sw', cls: 'left-0 bottom-0 h-3 w-3 cursor-nesw-resize' },
    { dir: 'se', cls: 'right-0 bottom-0 h-3 w-3 cursor-nwse-resize' },
  ]

  return (
    <>
      {/* 플로팅 런처 버튼 */}
      <button
        type="button"
        onClick={toggle}
        aria-label="컴친 AI 비서 열기"
        className={`fixed right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl transition-all hover:scale-105 active:scale-95 ${
          bottomBar ? 'bottom-32' : 'bottom-6'
        }`}
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

      {/* 채팅 패널 — 헤더를 잡고 이동, 가장자리를 잡고 크기 조절 */}
      {open && (
        <div
          data-ai-panel
          style={{ ...panelStyle, maxWidth: 'calc(100vw - 16px)', maxHeight: 'calc(100vh - 16px)' }}
          className="fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        >
          {/* 헤더 (데스크톱에서 드래그 핸들) */}
          <div
            onMouseDown={
              isDesktop
                ? (e) => {
                    // 버튼(닫기 X) 위에서 시작한 건 드래그로 보지 않는다
                    if (e.target.closest('[data-no-drag]')) return
                    beginInteraction(e, 'move')
                  }
                : undefined
            }
            className={`flex shrink-0 select-none items-center gap-2 border-b border-border bg-surface-2/60 px-4 py-3 ${
              isDesktop ? 'cursor-move' : ''
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/15 text-brand">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l2 4 4 .5-3 3 .8 4.5L12 17l-3.8 2 .8-4.5-3-3 4-.5z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-bold text-text">컴친 AI 비서</p>
              <p className="truncate text-xs text-muted">견적·호환성·제품 상담</p>
            </div>
            {/* 닫기 X — 창을 옮긴 뒤부터 노출(런처 버튼이 멀어지므로). 닫으면 원래 위치/크기로 리셋 */}
            {isDesktop && moved && (
              <button
                type="button"
                data-no-drag
                onClick={() => {
                  resetWindow()
                  toggle()
                }}
                aria-label="AI 비서 닫기"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-4 w-4">
                  <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
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
            className="flex shrink-0 items-center gap-2 border-t border-border p-3"
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

          {/* 리사이즈 핸들 (데스크톱 전용 — 가장자리·모서리) */}
          {isDesktop &&
            HANDLES.map((h) => (
              <div
                key={h.dir}
                onMouseDown={(e) => beginInteraction(e, 'resize', h.dir)}
                className={`absolute z-10 ${h.cls}`}
              />
            ))}
        </div>
      )}
    </>
  )
}
