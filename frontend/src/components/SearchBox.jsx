import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { fetchParts } from '../api/parts'
import { prebuiltPCs } from '../data/prebuiltPCs'
import { recommendedBuilds } from '../data/mockBuilds'
import { indexStrings, matchName, splitHighlight } from '../lib/koreanSearch'

const PART_LABEL = {
  CPU: 'CPU', CPU_COOLER: 'CPU 쿨러', MEMORY: '메모리', MOTHERBOARD: '메인보드',
  GPU: '그래픽카드', SSD: 'SSD', HDD: 'HDD', PSU: '파워', CASE: '케이스',
}
const PC_LABEL = {
  gaming: '게이밍 PC', workstation: '작업용 PC', highend: '하이엔드', office: '사무용',
}
// 일치하는 모든 항목을 보여주되(과한 렌더 방지용 상한), 드롭다운은 5행 높이로 스크롤
const MAX_RESULTS = 50

// 부품(DB) + 완성형 PC(정적) 색인을 한 번만 만들어 캐시
let indexPromise = null
function loadIndex() {
  if (indexPromise) return indexPromise
  indexPromise = (async () => {
    const parts = await fetchParts() // 카테고리 없이 = 전체 부품
    const partEntries = parts.map((p) => ({
      kind: 'part',
      id: p.id,
      name: p.name,
      image: p.imageUrl,
      sub: PART_LABEL[p.category] ?? '부품',
      ...indexStrings(p.name),
    }))
    const pcSource = [...prebuiltPCs, ...recommendedBuilds]
    const pcEntries = pcSource.map((pc) => ({
      kind: 'pc',
      id: pc.id,
      name: pc.name,
      image: pc.image,
      sub: PC_LABEL[pc.category] ?? '완성PC',
      ...indexStrings(pc.name),
    }))
    return [...pcEntries, ...partEntries]
  })()
  return indexPromise
}

function Highlight({ name, start, len }) {
  const { before, hit, after } = splitHighlight(name, start, len)
  return (
    <span className="truncate">
      {before}
      <span className="font-semibold text-brand">{hit}</span>
      {after}
    </span>
  )
}

export default function SearchBox() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState(null)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState(null) // 드롭다운 위치(입력창 기준, fixed)
  const boxRef = useRef(null)
  const dropRef = useRef(null)

  // 첫 포커스 때 색인 로드 (페이지마다 매번 받지 않도록 캐시)
  const ensureIndex = () => {
    if (entries) return
    loadIndex().then(setEntries)
  }

  // 바깥 클릭 시 닫기 (드롭다운은 portal 이라 dropRef 도 함께 검사)
  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current?.contains(e.target)) return
      if (dropRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const results = useMemo(() => {
    const query = q.trim()
    if (!query || !entries) return []
    const qi = indexStrings(query)
    const scored = []
    for (const e of entries) {
      const m = matchName(e, qi)
      if (m) scored.push({ e, ...m })
    }
    scored.sort((a, b) => a.rank - b.rank || a.e.name.length - b.e.name.length)
    return scored.slice(0, MAX_RESULTS)
  }, [q, entries])

  const showDropdown = open && q.trim() !== ''

  // 드롭다운이 열려 있는 동안 입력창 위치를 따라가도록 측정 (헤더 접힘/스크롤/리사이즈 대응)
  useEffect(() => {
    if (!showDropdown) return undefined
    const measure = () => {
      const el = boxRef.current
      if (el) {
        const r = el.getBoundingClientRect()
        setPos({ left: r.left, top: r.bottom + 8, width: r.width })
      }
    }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [showDropdown])

  // 키보드로 이동할 때 활성 항목을 보이게 스크롤
  useEffect(() => {
    const items = dropRef.current?.querySelectorAll('li')
    items?.[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = (e) => {
    navigate(e.kind === 'pc' ? `/pc/${e.id}` : `/part/${e.id}`)
    setQ('')
    setOpen(false)
  }

  const onKeyDown = (ev) => {
    if (!open || results.length === 0) return
    if (ev.key === 'ArrowDown') {
      ev.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (ev.key === 'Enter') {
      ev.preventDefault()
      go(results[Math.min(active, results.length - 1)].e)
    } else if (ev.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className="relative w-full max-w-2xl">
      <input
        type="search"
        value={q}
        placeholder="부품·견적을 검색해보세요"
        autoComplete="off"
        onFocus={() => {
          ensureIndex()
          setOpen(true)
        }}
        onChange={(e) => {
          setQ(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
        className="w-full rounded-full border border-border bg-surface-2 py-2.5 pl-5 pr-11 text-base outline-none focus:border-brand"
      />
      <svg
        className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
      </svg>

      {/* 자동완성 드롭다운 — 헤더의 overflow-hidden 에 안 잘리도록 body 로 portal,
          일치하는 모든 항목을 보여주되 5행 높이의 스크롤 박스로 표시 */}
      {showDropdown &&
        pos &&
        createPortal(
          <div
            ref={dropRef}
            style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width, zIndex: 50 }}
            className="overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
          >
            {!entries ? (
              <p className="px-4 py-3 text-sm text-muted">검색 준비 중…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted">검색 결과가 없어요.</p>
            ) : (
              // 약 5행(≈300px)만 보이고 나머지는 스크롤
              <ul className="max-h-75 overflow-y-auto text-left">
                {results.map((r, i) => (
                  <li key={`${r.e.kind}:${r.e.id}`}>
                    <button
                      type="button"
                      // input blur 전에 클릭이 먹도록
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(r.e)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                        i === active ? 'bg-surface-2' : ''
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
                        {r.e.image ? (
                          <img src={r.e.image} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-gray-400">없음</span>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <Highlight name={r.e.name} start={r.start} len={r.len} />
                        <span className="truncate text-xs text-muted">{r.e.sub}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body,
        )}
    </div>
  )
}
