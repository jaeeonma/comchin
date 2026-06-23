import { useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { PC_CATEGORIES, getPCsByCategory } from '../data/prebuiltPCs'
import PrebuiltCard from '../components/PrebuiltCard'
import TipCard from '../components/TipCard'
import FilterDrawer, { FilterButton } from '../components/FilterDrawer'
import { CATEGORY_TIPS } from '../data/tips'

// 가격대 필터 — 라벨 + 범위(min < price <= max)
const PRICE_RANGES = [
  { label: '50만원 이하', min: 0, max: 500000 },
  { label: '50~100만원', min: 500000, max: 1000000 },
  { label: '100~150만원', min: 1000000, max: 1500000 },
  { label: '150~200만원', min: 1500000, max: 2000000 },
  { label: '200~300만원', min: 2000000, max: 3000000 },
  { label: '300~500만원', min: 3000000, max: 5000000 },
  { label: '500만원 이상', min: 5000000, max: Infinity },
]
const CPU_FILTERS = ['AMD 라이젠5', 'AMD 라이젠7', 'AMD 라이젠9', '인텔 코어i5', '인텔 코어i7', '인텔 코어 울트라5', '인텔 코어 울트라7', '인텔 코어 울트라9']
const GPU_FILTERS = ['내장 그래픽', 'RTX 4060', 'RTX 5050', 'RTX 5060', 'RTX 5060 Ti', 'RTX 5070', 'RTX 5070 Ti', 'RTX 5080', 'RTX 5090', 'RX 9070', 'RX 9070 XT']

// 완본체 ram/ssd 문자열에서 "총 용량(GB)" 추출 — 첫 숫자가 총량 (예: 'DDR5 32GB (16GB×2)' → 32)
const firstCapGB = (s) => {
  const str = String(s ?? '')
  const tb = str.match(/(\d+(?:\.\d+)?)\s*TB/i)
  if (tb) return parseFloat(tb[1]) * 1024
  const gb = str.match(/(\d+)\s*GB/i)
  return gb ? parseInt(gb[1], 10) : 0
}
const RAM_FILTERS = [
  { label: '16GB 이하', test: (g) => g > 0 && g <= 16 },
  { label: '32GB', test: (g) => g > 16 && g <= 32 },
  { label: '64GB', test: (g) => g > 32 && g <= 64 },
  { label: '128GB 이상', test: (g) => g > 64 },
]
const SSD_FILTERS = [
  { label: '512GB 이하', test: (g) => g > 0 && g <= 512 },
  { label: '1TB', test: (g) => g > 512 && g <= 1024 },
  { label: '2TB', test: (g) => g > 1024 && g <= 2048 },
  { label: '4TB 이상', test: (g) => g > 2048 },
]
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
  const [ramSel, setRamSel] = useState([])
  const [ssdSel, setSsdSel] = useState([])
  const [filterOpen, setFilterOpen] = useState(false) // 모바일 필터 드로어

  // 잘못된 카테고리는 홈으로
  if (!meta) return <Navigate to="/" replace />

  const pcs = getPCsByCategory(key)
  const hasFilter = priceSel.length + cpuSel.length + gpuSel.length + ramSel.length + ssdSel.length > 0

  // 그룹 간 AND, 그룹 내 OR — 선택할수록 결과가 좁혀진다.
  const matches = (pc) => {
    if (
      priceSel.length &&
      !priceSel.some((label) => {
        const r = PRICE_RANGES.find((x) => x.label === label)
        return r && pc.price != null && pc.price > r.min && pc.price <= r.max
      })
    )
      return false
    if (cpuSel.length && !cpuSel.some((c) => pc.cpu?.includes(c))) return false
    if (gpuSel.length && !gpuSel.some((g) => pc.gpu?.includes(g))) return false
    if (ramSel.length && !ramSel.some((l) => RAM_FILTERS.find((r) => r.label === l)?.test(firstCapGB(pc.ram)))) return false
    if (ssdSel.length && !ssdSel.some((l) => SSD_FILTERS.find((r) => r.label === l)?.test(firstCapGB(pc.ssd)))) return false
    return true
  }

  const visible = pcs.filter(matches)

  const resetFilters = () => {
    setPriceSel([])
    setCpuSel([])
    setGpuSel([])
    setRamSel([])
    setSsdSel([])
  }

  // 데스크톱 사이드바와 모바일 드로어가 공유하는 필터 본문
  const activeFilterCount = priceSel.length + cpuSel.length + gpuSel.length + ramSel.length + ssdSel.length
  const filterBody = (
    <>
      <FilterGroup title="가격대" items={PRICE_RANGES.map((r) => r.label)} selected={priceSel} onToggle={(v) => setPriceSel((s) => toggle(s, v))} />
      <FilterGroup title="CPU" items={CPU_FILTERS} selected={cpuSel} onToggle={(v) => setCpuSel((s) => toggle(s, v))} />
      <FilterGroup title="그래픽카드" items={GPU_FILTERS} selected={gpuSel} onToggle={(v) => setGpuSel((s) => toggle(s, v))} />
      <FilterGroup title="메모리(RAM)" items={RAM_FILTERS.map((r) => r.label)} selected={ramSel} onToggle={(v) => setRamSel((s) => toggle(s, v))} />
      <FilterGroup title="저장용량(SSD)" items={SSD_FILTERS.map((r) => r.label)} selected={ssdSel} onToggle={(v) => setSsdSel((s) => toggle(s, v))} />
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
