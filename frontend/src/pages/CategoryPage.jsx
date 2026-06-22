import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { PC_CATEGORIES, getPCsByCategory } from '../data/prebuiltPCs'
import PrebuiltCard from '../components/PrebuiltCard'
import TipCard from '../components/TipCard'
import FilterDrawer, { FilterButton } from '../components/FilterDrawer'
import { CATEGORY_TIPS } from '../data/tips'

// 가격대 필터 — 라벨 + 범위(min < price <= max)
const PRICE_RANGES = [
  { label: '100만원 이하', min: 0, max: 1000000 },
  { label: '100~150만원', min: 1000000, max: 1500000 },
  { label: '150~200만원', min: 1500000, max: 2000000 },
  { label: '200~300만원', min: 2000000, max: 3000000 },
  { label: '300만원 이상', min: 3000000, max: Infinity },
]
const CPU_FILTERS = ['AMD 라이젠5', 'AMD 라이젠7', 'AMD 라이젠9', '인텔 코어i5', '인텔 코어 울트라5', '인텔 코어 울트라7']
const GPU_FILTERS = ['RTX 5060', 'RTX 5070', 'RTX 5080', 'RTX 5090', 'RX 9070', 'RX 9070 XT']
const SORTS = ['인기순', '리뷰순', '낮은 가격순', '높은 가격순']

// 체크박스 필터 그룹 (제어 컴포넌트)
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

// 배열 토글 헬퍼
const toggle = (arr, value) =>
  arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]

export default function CategoryPage() {
  const { key } = useParams()
  const meta = PC_CATEGORIES[key]

  const [priceSel, setPriceSel] = useState([]) // 선택된 가격대 라벨
  const [cpuSel, setCpuSel] = useState([])
  const [gpuSel, setGpuSel] = useState([])
  const [filterOpen, setFilterOpen] = useState(false) // 모바일 필터 드로어

  // 잘못된 카테고리는 홈으로
  if (!meta) return <Navigate to="/" replace />

  const pcs = getPCsByCategory(key)
  const hasFilter = priceSel.length + cpuSel.length + gpuSel.length > 0

  // 선택된 태그 중 "하나라도" 맞으면 표시 (OR). 필터 없으면 전체.
  const matches = (pc) => {
    if (!hasFilter) return true
    const priceHit = priceSel.some((label) => {
      const r = PRICE_RANGES.find((x) => x.label === label)
      return r && pc.price != null && pc.price > r.min && pc.price <= r.max
    })
    const cpuHit = cpuSel.some((c) => pc.cpu && pc.cpu.includes(c))
    const gpuHit = gpuSel.some((g) => pc.gpu && pc.gpu.includes(g))
    return priceHit || cpuHit || gpuHit
  }

  const visible = pcs.filter(matches)

  const resetFilters = () => {
    setPriceSel([])
    setCpuSel([])
    setGpuSel([])
  }

  // 데스크톱 사이드바와 모바일 드로어가 공유하는 필터 본문
  const activeFilterCount = priceSel.length + cpuSel.length + gpuSel.length
  const filterBody = (
    <>
      <FilterGroup title="가격대" items={PRICE_RANGES.map((r) => r.label)} selected={priceSel} onToggle={(v) => setPriceSel((s) => toggle(s, v))} />
      <FilterGroup title="CPU" items={CPU_FILTERS} selected={cpuSel} onToggle={(v) => setCpuSel((s) => toggle(s, v))} />
      <FilterGroup title="그래픽카드" items={GPU_FILTERS} selected={gpuSel} onToggle={(v) => setGpuSel((s) => toggle(s, v))} />
    </>
  )

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{meta.label}</h1>
        <p className="mt-1 text-muted">{meta.desc}</p>
      </header>

      {/* 컴친 팁 — 이 카테고리 특징·장단점 */}
      {CATEGORY_TIPS[key] && <TipCard tips={CATEGORY_TIPS[key]} interval={6500} className="mb-6" />}

      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        {/* 사이드바 필터 — 스크롤해도 같이 따라오며 고정 */}
        <aside className="hidden self-start lg:sticky lg:top-11 lg:block lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">필터</h2>
            {hasFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-muted hover:text-brand"
              >
                초기화
              </button>
            )}
          </div>
          {filterBody}
        </aside>

        {/* 목록 */}
        <div>
          {/* 정렬 바 — 스크롤해도 상단(접힌 헤더 아래)에 고정 */}
          <div className="sticky top-11 z-10 mb-4 flex items-center justify-between gap-2 border-b border-border bg-bg pb-3 pt-2">
            <div className="flex items-center gap-2">
              <FilterButton onClick={() => setFilterOpen(true)} activeCount={activeFilterCount} />
              <p className="text-sm text-muted">
                총 <span className="font-semibold text-text">{visible.length}</span>개의 상품
              </p>
            </div>
            <select className="shrink-0 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-brand">
              {SORTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 상품 카드 그리드 — 페이지와 함께 스크롤 (헤더·필터·정렬바는 고정) */}
          {visible.length === 0 ? (
            <p className="py-16 text-center text-muted">선택한 조건에 맞는 상품이 없어요.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {visible.map((pc) => (
                <PrebuiltCard key={pc.id} pc={pc} />
              ))}
            </div>
          )}

          {!hasFilter && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                className="rounded-md border border-border px-6 py-2.5 text-sm text-muted hover:border-brand hover:text-text"
              >
                더보기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 모바일 필터 드로어 */}
      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={resetFilters}
        activeCount={activeFilterCount}
        resultLabel={`결과 ${visible.length}개 보기`}
      >
        {filterBody}
      </FilterDrawer>
    </div>
  )
}
