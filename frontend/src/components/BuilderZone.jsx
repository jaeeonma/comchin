import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CATEGORY_ENUM, useBuildStore } from '../store/useBuildStore'
import { useSavedBuildStore } from '../store/useSavedBuildStore'
import PartList from './PartList'
import TipCard from './TipCard'
import { builderTips } from '../lib/tipEngine'
import { formatPrice, partSummary } from '../lib/partFormat'
import { isPartCompatible, PLATFORM_LABEL } from '../lib/platform'

const CATEGORY_LABELS = {
  cpu: 'CPU',
  cpuCooler: 'CPU 쿨러',
  memory: '메모리 (RAM)',
  motherboard: '메인보드',
  gpu: '그래픽카드 (GPU)',
  ssd: 'SSD',
  hdd: 'HDD',
  psu: '파워 (PSU)',
  case: '케이스',
  os: '윈도우 (OS)',
}

// 썸네일에 이미지가 없을 때 보여줄 짧은 글자 표식 (아이콘/이모지 미사용)
const CATEGORY_SHORT = {
  cpu: 'CPU',
  cpuCooler: '쿨러',
  memory: 'RAM',
  motherboard: 'M/B',
  gpu: 'GPU',
  ssd: 'SSD',
  hdd: 'HDD',
  psu: 'PSU',
  case: 'CASE',
  os: 'OS',
}

// 일부 카테고리는 미선택 안내 문구를 따로 지정
const CATEGORY_PLACEHOLDER = {
  os: '윈도우 선택하세요 (기본 미설치)',
}

// 기본 가이드 사진 (직접 업로드). 부품 선택을 시작하기 전엔 이 사진을 표시.
const GUIDE_IMG = '/images/guide/builder-guide.png'

const ESSENTIAL = ['cpu', 'cpuCooler', 'memory', 'motherboard', 'gpu', 'ssd', 'psu', 'case']
const ADDITIONAL = ['hdd', 'os']

// 직접 견적 페이지와 완본체 상세 페이지에서 공통으로 쓰는 업그레이드 ZONE 본문.
// enableSave=true(직접 견적)일 때만 상단에 "저장한 견적" 목록을 보여준다.
// platform('intel'|'amd')이 있으면(DIY 견적) CPU·메인보드를 호환 소켓만 보여준다.
export default function BuilderZone({ enableSave = false, platform }) {
  const selectedParts = useBuildStore((s) => s.selectedParts)
  const selectPart = useBuildStore((s) => s.selectPart)
  const removePart = useBuildStore((s) => s.removePart)
  const totalPrice = useBuildStore((s) => s.totalPrice)
  const totalPower = useBuildStore((s) => s.totalPower)
  const resetBuild = useBuildStore((s) => s.resetBuild)
  const loadBuild = useBuildStore((s) => s.loadBuild)

  const savedBuilds = useSavedBuildStore((s) => s.builds)
  const removeBuild = useSavedBuildStore((s) => s.removeBuild)

  // 업그레이드 ZONE을 벗어나면(다른 페이지 이동 등) 부품 선택을 초기화 — 페이지 간에 남지 않게.
  useEffect(() => () => resetBuild(), [resetBuild])

  // 우측(가이드 영역) 상태
  const [activeCategory, setActiveCategory] = useState(null) // 목록을 보여줄 카테고리
  const [photoPart, setPhotoPart] = useState(null) // 클릭으로 선택돼 가이드 영역에 사진 표시 중인 부품
  const [hover, setHover] = useState(null) // 호버 팝업 { part, rect }

  // 컴친 팁(상호작용) 상태
  const [lastPick, setLastPick] = useState(null) // 마지막으로 고른 칸
  const [prevPart, setPrevPart] = useState(null) // 그 칸에 있던 이전 부품(교체 차이 계산용)
  const [tipNonce, setTipNonce] = useState(0) // 상호작용마다 팁 카드 갱신
  const [loadNotice, setLoadNotice] = useState(null) // 저장 견적 불러올 때 제외 안내

  // 저장한 견적 불러오기. DIY(platform) 빌더면 호환 안 되는 CPU·메인보드는 빼고 불러온다.
  const handleLoad = (parts, meta) => {
    if (!platform) {
      loadBuild(parts, meta)
      setLoadNotice(null)
      return
    }
    const next = {}
    const dropped = []
    for (const [cat, part] of Object.entries(parts)) {
      if (isPartCompatible(part, platform)) next[cat] = part
      else dropped.push(part)
    }
    loadBuild(next, meta)
    setTipNonce((n) => n + 1)
    setLoadNotice(
      dropped.length
        ? `${PLATFORM_LABEL[platform]} 호환이 아닌 부품 ${dropped.length}개(${dropped
            .map((d) => d.name)
            .join(', ')})는 제외하고 불러왔어요.`
        : null,
    )
  }

  const openPicker = (category) => {
    setHover(null)
    setPhotoPart(null)
    setActiveCategory((cur) => (cur === category ? null : category)) // 같은 항목 다시 누르면 닫힘
  }
  const handleSelect = (part) => {
    // 클릭하면 선택 확정 + 가이드 영역에 부품 사진 표시 (목록은 닫힘)
    const cat = activeCategory
    const prev = selectedParts[cat]
    selectPart(cat, part)
    setPhotoPart({ category: cat, part })
    setActiveCategory(null)
    setHover(null)
    // 컴친 팁 갱신
    setLastPick(cat)
    setPrevPart(prev ?? null)
    setTipNonce((n) => n + 1)
  }
  const handleRemove = (category) => {
    removePart(category)
    setLastPick(null)
    setPrevPart(null)
    setTipNonce((n) => n + 1)
  }

  // 마지막 상호작용/완성 상태에 맞는 팁
  const tipList = useMemo(
    () => builderTips({ selected: selectedParts, lastPick, prevPart }),
    [selectedParts, lastPick, prevPart],
  )

  const selectedCount = Object.keys(selectedParts).length
  const total = ESSENTIAL.length + ADDITIONAL.length
  const progress = Math.round((selectedCount / total) * 100)
  const power = totalPower()
  const price = totalPrice()
  const recommendedPsu = power > 0 ? Math.ceil((power * 1.4) / 50) * 50 : 0

  return (
    <div className="flex flex-col gap-6">
      {/* ---------- 상단: 저장한 견적 (직접 견적 전용) ---------- */}
      {enableSave && savedBuilds.length > 0 && (
        <SavedBuildsStrip builds={savedBuilds} onLoad={handleLoad} onRemove={removeBuild} />
      )}

      {/* DIY 에서 호환 안 되는 부품을 빼고 불러왔을 때 안내 */}
      {loadNotice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-text">
          <span>{loadNotice}</span>
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setLoadNotice(null)}
            className="shrink-0 text-muted hover:text-text"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
      {/* ---------- 왼쪽: 부품 선택(구성) 목록 ---------- */}
      <div className="flex flex-col gap-6">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-lg font-bold">필수 구성</h3>
            <span className="text-sm text-muted">
              {ESSENTIAL.filter((c) => selectedParts[c]).length} / {ESSENTIAL.length} 선택
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {ESSENTIAL.map((category) => (
              <PartRow
                key={category}
                category={category}
                part={selectedParts[category]}
                active={activeCategory === category}
                onPick={() => openPicker(category)}
                onRemove={() => handleRemove(category)}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-lg font-bold">추가 구성 부품</h3>
            <span className="text-sm text-muted">선택 사항</span>
          </div>
          <div className="flex flex-col gap-3">
            {ADDITIONAL.map((category) => (
              <PartRow
                key={category}
                category={category}
                part={selectedParts[category]}
                active={activeCategory === category}
                optional
                onPick={() => openPicker(category)}
                onRemove={() => handleRemove(category)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* ---------- 오른쪽(가이드 영역): 목록 / 선택사진 / 가이드 ---------- */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
        {/* 컴친 팁 — 부품을 고를 때마다 호환성·차이·추천이 갱신됨 (맨 위 고정) */}
        <TipCard key={tipNonce} tips={tipList} interval={7000} />

        {activeCategory ? (
          <ListPanel
            category={activeCategory}
            selectedId={selectedParts[activeCategory]?.id}
            onHover={(part, rect) => setHover(part ? { part, rect } : null)}
            onSelect={handleSelect}
            platform={platform}
          />
        ) : photoPart ? (
          <SelectedPhoto
            category={photoPart.category}
            part={photoPart.part}
            onClose={() => setPhotoPart(null)}
          />
        ) : (
          <GuideStage />
        )}

        {/* 요약 / 총액 / AI — 항상 표시 */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">선택 진행</span>
            <span className="font-semibold">
              {selectedCount} / {total} 부품
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
            <span className="text-muted">예상 소비전력</span>
            <span className="font-semibold">{power} W</span>
          </div>
          <p className="mt-1 text-right text-xs text-muted">
            {recommendedPsu > 0 ? `권장 파워 약 ${recommendedPsu}W 이상` : '부품을 선택하면 계산돼요'}
          </p>
        </div>

        <div className="rounded-2xl bg-linear-to-br from-brand to-brand-hover p-5 text-white shadow-lg shadow-brand/20">
          <p className="text-sm text-white/80">총 견적 금액</p>
          <p className="mt-1 text-3xl font-bold">{formatPrice(price)}</p>
          <p className="mt-2 text-xs text-white/80">VAT 포함 · 입력 시점 기준 가격</p>
        </div>
      </aside>

        {/* 호버 시 사진 팝업 (떠 있는 카드) */}
        {hover && <HoverPopup part={hover.part} rect={hover.rect} />}
      </div>
    </div>
  )
}

/* ===================== 저장한 견적 스트립 ===================== */
function SavedBuildsStrip({ builds, onLoad, onRemove }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="mb-3 text-lg font-bold">저장한 견적</h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {builds.map((b) => (
          <div key={b.id} className="relative w-36 shrink-0">
            <button
              type="button"
              onClick={() =>
                onLoad(b.parts, { id: b.id, name: b.name, caseImage: b.caseImage, price: b.price })
              }
              title={`${b.name} 불러오기`}
              className="block w-full overflow-hidden rounded-xl border border-border text-left transition-colors hover:border-brand"
            >
              <div className="flex aspect-square items-center justify-center bg-white">
                {b.caseImage ? (
                  <img src={b.caseImage} alt={b.name} className="h-full w-full object-contain p-2" />
                ) : (
                  <span className="text-xs text-gray-400">케이스 없음</span>
                )}
              </div>
              <div className="p-2">
                <p className="truncate text-sm font-medium" title={b.name}>
                  {b.name}
                </p>
                <p className="text-xs text-muted">{formatPrice(b.price)}</p>
              </div>
            </button>
            <button
              type="button"
              aria-label="삭제"
              onClick={() => onRemove(b.id)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5">
                <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ===================== 우측 인라인 목록 ===================== */
function ListPanel({ category, selectedId, onHover, onSelect, platform }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-surface"
      onMouseLeave={() => onHover(null, null)}
    >
      <div className="border-b border-border px-5 py-3">
        <h3 className="text-lg font-bold">{CATEGORY_LABELS[category]} 선택</h3>
        <p className="mt-0.5 text-xs text-muted">부품에 마우스를 올리면 사진이, 클릭하면 적용돼요.</p>
      </div>
      <div className="show-scrollbar max-h-[640px] overflow-y-auto p-4">
        <PartList
          key={category}
          categoryEnum={CATEGORY_ENUM[category]}
          selectedId={selectedId}
          onHover={onHover}
          onSelect={onSelect}
          platform={platform}
        />
      </div>
    </div>
  )
}

/* ===================== 호버 팝업 ===================== */
function HoverPopup({ part, rect }) {
  if (!part || !rect) return null

  const W = 460
  // 항목 왼쪽에 띄우되, 공간이 부족하면 오른쪽에
  let left = rect.left - W - 16
  if (left < 8) left = Math.min(rect.right + 16, window.innerWidth - W - 8)
  let top = rect.top
  const maxTop = window.innerHeight - 580
  if (top > maxTop) top = Math.max(8, maxTop)

  return createPortal(
    <div
      className="pointer-events-none fixed z-50 rounded-xl border border-border bg-surface p-3 shadow-2xl"
      style={{ left, top, width: W }}
    >
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white">
        {part.imageUrl ? (
          <img src={part.imageUrl} alt={part.name} className="h-full w-full object-contain p-2" />
        ) : (
          <span className="text-sm text-gray-400">이미지 없음</span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-sm font-semibold">{part.name}</p>
      {partSummary(part) && <p className="mt-0.5 text-xs text-muted">{partSummary(part)}</p>}
      <p className="mt-1 text-base font-bold text-brand">{formatPrice(part.price)}</p>
    </div>,
    document.body,
  )
}

/* ===================== 선택된 부품 사진 (가이드 영역) ===================== */
function SelectedPhoto({ category, part, onClose }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface">
      {/* 작은 닫기 버튼 — 사진 오른쪽 위 모서리에 겹침 */}
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-xl leading-none text-white transition-colors hover:bg-black/75"
      >
        ×
      </button>

      <div className="flex aspect-[540/670] items-center justify-center bg-white">
        {part.imageUrl ? (
          <img src={part.imageUrl} alt={part.name} className="h-full w-full object-contain p-4" />
        ) : (
          <span className="text-sm text-gray-400">이미지 없음</span>
        )}
      </div>

      <div className="p-5">
        <p className="text-xs font-medium text-muted">{CATEGORY_LABELS[category]}</p>
        <p className="mt-1 font-semibold">{part.name}</p>
        <p className="mt-1 text-lg font-bold text-brand">{formatPrice(part.price)}</p>
        {part.brand && <p className="mt-2 text-sm text-muted">{part.brand}</p>}
      </div>
    </div>
  )
}

/* ===================== 좌측 부품 한 줄 ===================== */
function PartRow({ category, part, active, optional, onPick, onRemove }) {
  return (
    <article
      className={`flex items-center gap-3 rounded-xl border bg-surface p-3 transition-colors ${
        active ? 'border-brand' : 'border-border hover:border-brand/50'
      }`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2">
        {part?.imageUrl ? (
          <img
            src={part.imageUrl}
            alt={part.name}
            className="h-full w-full bg-white object-contain"
            onError={(e) => {
              e.currentTarget.replaceWith(
                Object.assign(document.createElement('span'), {
                  className: 'text-xs font-semibold text-muted',
                  textContent: CATEGORY_SHORT[category],
                }),
              )
            }}
          />
        ) : (
          <span className="text-xs font-semibold text-muted">{CATEGORY_SHORT[category]}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-muted">{CATEGORY_LABELS[category]}</span>
        {part ? (
          <>
            <p className="truncate text-sm font-semibold">{part.name}</p>
            <p className="text-sm font-bold text-brand">{formatPrice(part.price)}</p>
          </>
        ) : (
          <p className="mt-0.5 text-sm text-muted">
            {CATEGORY_PLACEHOLDER[category] ??
              (optional ? `${CATEGORY_LABELS[category]}는 선택 사항이에요` : `${CATEGORY_LABELS[category]}를 선택하세요`)}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={onPick}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          {active ? '접기' : part ? '변경' : '선택'}
        </button>
        {part && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-muted transition-colors hover:text-text"
          >
            제거
          </button>
        )}
      </div>
    </article>
  )
}

/* ===================== 기본 가이드 사진 ===================== */
function GuideStage() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex aspect-[540/670] items-center justify-center bg-white">
        <img
          src={GUIDE_IMG}
          alt="견적 가이드"
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.replaceWith(
              Object.assign(document.createElement('span'), {
                className: 'px-6 text-center text-sm text-gray-400',
                textContent: '가이드 사진을 등록해주세요 (public/images/guide/builder-guide.png)',
              }),
            )
          }}
        />
      </div>
    </div>
  )
}
