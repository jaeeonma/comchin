import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchParts } from '../api/parts'
import { formatPrice, partSummary } from '../lib/partFormat'

// 부품 종류(이름) 필터 — key / 라벨 / 백엔드 enum
const PART_TYPES = [
  { key: 'cpu', label: 'CPU', enum: 'CPU' },
  { key: 'gpu', label: '그래픽카드', enum: 'GPU' },
  { key: 'motherboard', label: '메인보드', enum: 'MOTHERBOARD' },
  { key: 'memory', label: '메모리', enum: 'MEMORY' },
  { key: 'ssd', label: 'SSD', enum: 'SSD' },
  { key: 'psu', label: '파워', enum: 'PSU' },
  { key: 'case', label: '케이스', enum: 'CASE' },
  { key: 'cpuCooler', label: 'CPU 쿨러', enum: 'CPU_COOLER' },
  { key: 'hdd', label: 'HDD', enum: 'HDD' },
]
const ENUM_OF = Object.fromEntries(PART_TYPES.map((t) => [t.key, t.enum]))
const ALL_KEYS = PART_TYPES.map((t) => t.key)

// id + seed 기반 의사난수. seed 가 바뀌면(=새로 방문) 순서가 달라지고,
// 같은 seed 안에서는 안정적이라 더보기/필터 시 카드가 튀지 않는다.
function seededRank(id, seed) {
  let h = seed >>> 0
  for (const c of id) h = (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0
  return h
}
const ENUM_LABEL = {
  CPU: 'CPU', CPU_COOLER: 'CPU 쿨러', MEMORY: '메모리', MOTHERBOARD: '메인보드',
  GPU: '그래픽카드', SSD: 'SSD', HDD: 'HDD', PSU: '파워', CASE: '케이스',
}

// 가격대 필터 (min < price <= max)
const PRICE_RANGES = [
  { label: '5만원 이하', min: 0, max: 50000 },
  { label: '5~10만원', min: 50000, max: 100000 },
  { label: '10~30만원', min: 100000, max: 300000 },
  { label: '30~50만원', min: 300000, max: 500000 },
  { label: '50만원 이상', min: 500000, max: Infinity },
]

const SORTS = ['인기순', '낮은 가격순', '높은 가격순', '이름순']
const PAGE = 24

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

function FilterGroup({ title, items, selected, onToggle }) {
  return (
    <div className="mb-6">
      <h3 className="mb-2 font-semibold">{title}</h3>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li key={item}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted hover:text-text">
              <input
                type="checkbox"
                className="accent-brand"
                checked={selected.includes(item)}
                onChange={() => onToggle(item)}
              />
              {item}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

// 부품 카드 (상품 카드와 비슷한 구성: 사진 + 이름 + 요약 + 가격). 클릭 시 부품 상세로 이동.
function PartCard({ part }) {
  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-brand">
      <Link to={`/part/${part.id}`} className="flex aspect-square items-center justify-center bg-white p-3">
        {part.imageUrl ? (
          <img
            src={part.imageUrl}
            alt={part.name}
            className="h-full w-full object-contain"
            onError={(e) => {
              e.currentTarget.replaceWith(
                Object.assign(document.createElement('span'), {
                  className: 'text-xs font-semibold text-gray-400',
                  textContent: '이미지 없음',
                }),
              )
            }}
          />
        ) : (
          <span className="text-xs font-semibold text-gray-400">이미지 없음</span>
        )}
      </Link>

      <div className="flex flex-col gap-1 p-3">
        <span className="text-xs font-medium text-muted">{ENUM_LABEL[part.category] ?? '부품'}</span>
        <Link to={`/part/${part.id}`} className="truncate font-medium hover:text-brand" title={part.name}>
          {part.name}
        </Link>
        {partSummary(part) && (
          <p className="truncate text-xs text-muted">{partSummary(part)}</p>
        )}
        <p className="mt-1 text-lg font-bold">{formatPrice(part.price)}</p>
      </div>
    </article>
  )
}

export default function PartsPage() {
  // 기본은 아무 종류도 선택 안 함 → 모든 종류를 랜덤으로 섞어 보여줌
  const [typeSel, setTypeSel] = useState([])
  const [priceSel, setPriceSel] = useState([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('인기순')
  const [visible, setVisible] = useState(PAGE)

  const [partsByCat, setPartsByCat] = useState({}) // { cpu: [...] } 캐시
  const [status, setStatus] = useState('idle') // idle | loading | error
  // 방문(마운트)마다 새 시드 → 항상 다른 랜덤 순서
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31))

  // 선택 종류가 없으면 전체(ALL_KEYS)를 대상으로
  const effective = typeSel.length > 0 ? typeSel : ALL_KEYS

  // 대상 종류 중 캐시에 없는 것만 조회
  useEffect(() => {
    const missing = effective.filter((k) => !partsByCat[k])
    if (missing.length === 0) return
    let alive = true
    setStatus('loading')
    Promise.all(missing.map((k) => fetchParts(ENUM_OF[k]).then((parts) => [k, parts])))
      .then((results) => {
        if (!alive) return
        setPartsByCat((prev) => {
          const next = { ...prev }
          for (const [k, parts] of results) next[k] = parts
          return next
        })
        setStatus('idle')
      })
      .catch(() => {
        if (alive) setStatus('error')
      })
    return () => {
      alive = false
    }
  }, [effective, partsByCat])

  // 필터/검색/정렬 변경 시 더보기 개수도 초기화하는 헬퍼
  const toggleType = (key) => {
    setTypeSel((s) => toggle(s, key))
    setVisible(PAGE)
  }
  const togglePrice = (label) => {
    setPriceSel((s) => toggle(s, label))
    setVisible(PAGE)
  }
  const onSearch = (v) => {
    setQuery(v)
    setVisible(PAGE)
  }
  const onSort = (v) => {
    setSort(v)
    setVisible(PAGE)
  }
  const resetFilters = () => {
    setTypeSel([])
    setPriceSel([])
    setQuery('')
    setVisible(PAGE)
  }

  // 대상 종류의 부품들을 합치고 → 가격/검색 필터 → 정렬(인기순=랜덤 배치)
  const filtered = useMemo(() => {
    let list = effective.flatMap((k) => partsByCat[k] || [])

    if (priceSel.length > 0) {
      list = list.filter((p) =>
        priceSel.some((label) => {
          const r = PRICE_RANGES.find((x) => x.label === label)
          return r && p.price > r.min && p.price <= r.max
        }),
      )
    }

    const q = query.trim().toLowerCase()
    if (q) list = list.filter((p) => p.name.toLowerCase().includes(q))

    const sorted = [...list]
    if (sort === '낮은 가격순') sorted.sort((a, b) => a.price - b.price)
    else if (sort === '높은 가격순') sorted.sort((a, b) => b.price - a.price)
    else if (sort === '이름순') sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    else sorted.sort((a, b) => seededRank(a.id, seed) - seededRank(b.id, seed)) // 인기순 → 랜덤 배치
    return sorted
  }, [effective, partsByCat, priceSel, query, sort, seed])

  const visibleParts = filtered.slice(0, visible)
  const hasFilter = priceSel.length > 0 || query.trim() !== ''

  // 무한 스크롤 — 하단 센티넬이 보이면 자동으로 다음 페이지(PAGE개)를 더 보여준다.
  const sentinelRef = useRef(null)
  const loadMore = useCallback(() => setVisible((v) => v + PAGE), [])
  useEffect(() => {
    if (visible >= filtered.length) return undefined
    const el = sentinelRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '600px' }, // 바닥에 닿기 전에 미리 로드
    )
    io.observe(el)
    return () => io.disconnect()
  }, [visible, filtered.length, loadMore])

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">부품</h1>
        <p className="mt-1 text-muted">필요한 부품을 종류·가격으로 골라보고 검색해보세요.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* 사이드바 필터 — 스크롤해도 같이 따라오며 고정 */}
        <aside className="hidden self-start lg:sticky lg:top-11 lg:block lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">필터</h2>
            {(hasFilter || typeSel.length > 0) && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-muted hover:text-brand"
              >
                초기화
              </button>
            )}
          </div>
          <FilterGroup
            title="부품 종류"
            items={PART_TYPES.map((t) => t.label)}
            selected={typeSel.map((k) => PART_TYPES.find((t) => t.key === k).label)}
            onToggle={(label) => toggleType(PART_TYPES.find((t) => t.label === label).key)}
          />
          <FilterGroup
            title="가격대"
            items={PRICE_RANGES.map((r) => r.label)}
            selected={priceSel}
            onToggle={togglePrice}
          />
        </aside>

        {/* 목록 */}
        <div>
          {/* 검색 + 정렬 바 — 스크롤해도 상단(접힌 헤더 아래)에 고정 */}
          <div className="sticky top-11 z-10 mb-3 flex items-center gap-3 border-b border-border bg-bg pb-3 pt-2">
            <input
              type="search"
              value={query}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="부품 이름을 검색해보세요"
              className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <select
              value={sort}
              onChange={(e) => onSort(e.target.value)}
              className="shrink-0 rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {SORTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <p className="mb-4 text-sm text-muted">
            총 <span className="font-semibold text-text">{filtered.length}</span>개의 부품
          </p>

          {/* 상태별 표시 */}
          {status === 'loading' && filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-muted">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
              <p>부품을 불러오는 중…</p>
            </div>
          ) : status === 'error' ? (
            <p className="py-16 text-center text-muted">
              부품을 불러오지 못했습니다. 백엔드 서버가 켜져 있는지 확인해주세요.
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-muted">조건에 맞는 부품이 없어요.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {visibleParts.map((part) => (
                  <PartCard key={part.id} part={part} />
                ))}
              </div>

              {/* 무한 스크롤 센티넬 — 보이면 자동으로 더 불러옴 */}
              {visible < filtered.length && (
                <div ref={sentinelRef} className="mt-8 flex justify-center py-4">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-brand" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
