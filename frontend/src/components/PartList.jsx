import { useEffect, useMemo, useState } from 'react'
import { fetchParts } from '../api/parts'
import { formatPrice, partSummary, thumbUrl } from '../lib/partFormat'
import { isPartCompatible } from '../lib/platform'
import { OS_PARTS } from '../data/osParts'

/* ============ 하위 분류(그룹) 판별 — 저성능→고성능(아래로 갈수록 고성능) ============ */
const MB_ORDER = [
  'A320', 'B350', 'B450', 'X470', 'A520', 'B550', 'X570',
  'A620', 'B650', 'B650E', 'X670', 'X670E', 'B840', 'B850', 'X870', 'X870E',
  'H610', 'B660', 'H670', 'Z690', 'H770', 'B760', 'Z790', 'H810', 'B860', 'Z890',
]
const AMD_CS = ['A320', 'B350', 'B450', 'X470', 'A520', 'B550', 'X570', 'A620', 'B650', 'B650E', 'X670', 'X670E', 'B840', 'B850', 'X870', 'X870E']
const MB_DETECT = [...MB_ORDER].sort((a, b) => b.length - a.length)

const GPU_ORDER = [
  'GTX 1650', 'GTX 1660', 'RX 6600',
  'RTX 3050', 'RTX 3060', 'RTX 4050', 'RTX 4060',
  'RX 7600', 'RX 7700', 'RX 7800', 'RX 7900',
  'RTX 4070', 'RTX 4080', 'RTX 4090',
  'RX 9070', 'RX 9070 XT',
  'RTX 5050', 'RTX 5060', 'RTX 5060 TI', 'RTX 5070', 'RTX 5070 TI', 'RTX 5080', 'RTX 5090',
]
const GPU_DETECT = [...GPU_ORDER].sort((a, b) => b.length - a.length)

function groupInfo(part, category) {
  const name = (part.name || '').toUpperCase()
  const s = part.specs || {}

  switch (category) {
    case 'MOTHERBOARD': {
      const cs = (s.chipset || MB_DETECT.find((c) => name.includes(c)) || '').toUpperCase()
      if (!cs) return { label: '기타 메인보드', order: 900 }
      const vendor = /AM4|AM5/.test(part.socket || '')
        ? 'AMD'
        : /LGA/.test(part.socket || '')
          ? 'Intel'
          : AMD_CS.includes(cs)
            ? 'AMD'
            : 'Intel'
      const mt = part.memoryType ? ` [${part.memoryType}]` : ''
      const idx = MB_ORDER.indexOf(cs)
      return { label: `${vendor} ${cs}${mt}`, order: idx < 0 ? 800 : idx }
    }

    case 'MEMORY': {
      const mt = part.memoryType || (/(DDR5)/i.test(name) ? 'DDR5' : /(DDR4)/i.test(name) ? 'DDR4' : '기타')
      const tuning = /RGB|튜닝|TUNING|DELTA|VENGEANCE|TRIDENT|ROYAL|로얄|NEO|네오|뱅퀴시|VANQUISH/i.test(name)
      const base = mt === 'DDR4' ? 0 : mt === 'DDR5' ? 2 : 900
      return {
        label: `${mt} ${tuning ? '고급형 튜닝/RGB ' : ''}메모리`,
        order: base === 900 ? 900 : base + (tuning ? 1 : 0),
      }
    }

    case 'CPU': {
      if (/라이젠\s*3|RYZEN\s*3/i.test(name)) return { label: 'AMD 라이젠 3', order: 0 }
      if (/라이젠\s*5|RYZEN\s*5/i.test(name)) return { label: 'AMD 라이젠 5', order: 1 }
      if (/라이젠\s*7|RYZEN\s*7/i.test(name)) return { label: 'AMD 라이젠 7', order: 2 }
      if (/라이젠\s*9|RYZEN\s*9/i.test(name)) return { label: 'AMD 라이젠 9', order: 3 }
      if (/I3|코어\s*I3/i.test(name)) return { label: 'Intel 코어 i3', order: 4 }
      if (/I5|코어\s*I5/i.test(name)) return { label: 'Intel 코어 i5', order: 5 }
      if (/I7|코어\s*I7/i.test(name)) return { label: 'Intel 코어 i7', order: 6 }
      if (/I9|코어\s*I9/i.test(name)) return { label: 'Intel 코어 i9', order: 7 }
      if (/울트라\s*5|ULTRA\s*5/i.test(name)) return { label: 'Intel 코어 울트라 5', order: 8 }
      if (/울트라\s*7|ULTRA\s*7/i.test(name)) return { label: 'Intel 코어 울트라 7', order: 9 }
      if (/울트라\s*9|ULTRA\s*9/i.test(name)) return { label: 'Intel 코어 울트라 9', order: 10 }
      return { label: '기타 CPU', order: 900 }
    }

    case 'GPU': {
      const nn = name.replace(/\s+/g, '')
      const hit = GPU_DETECT.find((m) => nn.includes(m.replace(/\s+/g, '')))
      if (hit) return { label: hit, order: GPU_ORDER.indexOf(hit) }
      return { label: '기타 그래픽카드', order: 900 }
    }

    case 'SSD': {
      const nvme = /NVME|M\.?2|PCIE/i.test(name) || /NVME|PCIE/i.test(s.interface || '')
      const sata = /SATA/i.test(name) || /SATA/i.test(s.interface || '')
      if (sata) return { label: 'SATA SSD', order: 0 }
      if (nvme) return { label: 'NVMe (M.2) SSD', order: 1 }
      return { label: '기타 SSD', order: 900 }
    }

    case 'PSU': {
      const w = Number(s.watt) || Number((name.match(/(\d{3,4})\s*W/) || [])[1]) || 0
      if (!w) return { label: '기타 파워', order: 900 }
      if (w <= 500) return { label: '500W 이하', order: 0 }
      if (w <= 650) return { label: '550~650W', order: 1 }
      if (w <= 850) return { label: '700~850W', order: 2 }
      return { label: '900W 이상', order: 3 }
    }

    case 'CASE': {
      const form = (s.form || '').toUpperCase()
      if (/ITX/.test(form) || /ITX/.test(name)) return { label: '미니 ITX', order: 0 }
      if (/M-?ATX|MATX/.test(form) || /M-ATX|미니타워/.test(name)) return { label: '미니타워 (M-ATX)', order: 1 }
      if (/E-?ATX/.test(form) || /빅타워/.test(name)) return { label: '빅타워 (E-ATX)', order: 3 }
      if (/ATX/.test(form) || /미들타워/.test(name)) return { label: '미들타워 (ATX)', order: 2 }
      return { label: '기타 케이스', order: 900 }
    }

    case 'CPU_COOLER': {
      const water = /수랭|수냉|AIO|일체형|라디에이터|360|280|240/i.test(name) || /수랭|AIO/i.test(s.type || '')
      return water ? { label: '수랭(AIO) 쿨러', order: 1 } : { label: '공랭 쿨러', order: 0 }
    }

    case 'HDD': {
      const cap = Number((name.match(/(\d+)\s*TB/i) || [])[1]) || 0
      if (cap >= 8) return { label: '8TB 이상', order: 3 }
      if (cap >= 4) return { label: '4~6TB', order: 2 }
      if (cap >= 2) return { label: '2TB', order: 1 }
      if (cap >= 1) return { label: '1TB', order: 0 }
      return { label: '기타 HDD', order: 900 }
    }

    case 'OS': {
      const pro = /프로|PRO/i.test(name)
      return pro ? { label: 'Windows 11 Pro', order: 1 } : { label: 'Windows 11 Home', order: 0 }
    }

    default:
      return { label: '전체', order: 0 }
  }
}

// 업그레이드 ZONE 우측에 인라인으로 뜨는 부품 목록.
// 그룹(하위 분류) + 그룹 내 가격 오름차순. 호버 시 onHover, 클릭 시 onSelect.
// platform('intel'|'amd')이 있으면 CPU·메인보드는 호환 소켓만 보여준다(다른 부품은 공용).
export default function PartList({ categoryEnum, selectedId, onHover, onSelect, platform }) {
  const [parts, setParts] = useState([])
  const [status, setStatus] = useState('loading') // loading | success | error
  const [retryKey, setRetryKey] = useState(0)

  // 운영체제(OS)는 백엔드 부품이 아니라 정적 데이터 → API 호출/상태 갱신 없이 바로 사용
  const isOS = categoryEnum === 'OS'

  useEffect(() => {
    if (isOS) return
    let alive = true
    const load = async () => {
      setStatus('loading')
      try {
        const data = await fetchParts(categoryEnum)
        if (!alive) return
        setParts(data)
        setStatus('success')
      } catch {
        if (alive) setStatus('error')
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [categoryEnum, retryKey, isOS])

  const sourceParts = isOS ? OS_PARTS : parts
  const effStatus = isOS ? 'success' : status

  // 플랫폼 필터 — CPU·메인보드만 호환 소켓으로 거른다(나머지는 공용)
  const viewParts = useMemo(() => {
    if (!platform) return sourceParts
    return sourceParts.filter((p) => isPartCompatible(p, platform))
  }, [sourceParts, platform])

  const groups = useMemo(() => {
    const map = new Map()
    for (const p of viewParts) {
      const { label, order } = groupInfo(p, categoryEnum)
      if (!map.has(label)) map.set(label, { order, items: [] })
      map.get(label).items.push(p)
    }
    const arr = [...map.entries()].map(([label, { order, items }]) => ({
      label,
      order,
      items: items.slice().sort((a, b) => a.price - b.price),
    }))
    arr.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'ko'))
    return arr
  }, [viewParts, categoryEnum])

  if (effStatus === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
        <p>부품을 불러오는 중…</p>
      </div>
    )
  }

  if (effStatus === 'error') {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-muted">부품을 불러오지 못했습니다. 백엔드 서버가 켜져 있는지 확인해주세요.</p>
        <button
          type="button"
          onClick={() => setRetryKey((k) => k + 1)}
          className="rounded-md border border-border px-4 py-2 text-sm hover:border-brand"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (viewParts.length === 0) {
    return (
      <p className="py-12 text-center text-muted">
        {platform ? '이 플랫폼에 맞는 부품이 없어요.' : '등록된 부품이 없습니다.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.label}>
          {/* 그룹 헤더 (크고 굵게) */}
          <div className="mb-3 flex items-baseline gap-2 border-b-2 border-border pb-2">
            <h4 className="text-xl font-extrabold text-text">{group.label}</h4>
            <span className="text-sm text-muted">{group.items.length}개</span>
          </div>

          {/* 그룹 내 부품 (가격 오름차순) */}
          <ul className="flex flex-col gap-2">
            {group.items.map((part) => {
              const active = selectedId === part.id
              return (
                <li key={part.id}>
                  <button
                    type="button"
                    onMouseEnter={(e) => onHover?.(part, e.currentTarget.getBoundingClientRect())}
                    onFocus={(e) => onHover?.(part, e.currentTarget.getBoundingClientRect())}
                    onMouseLeave={() => onHover?.(null, null)}
                    onClick={() => onSelect?.(part)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      active ? 'border-brand bg-brand/5' : 'border-border bg-surface-2 hover:border-brand'
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                      {part.imageUrl ? (
                        <img
                          src={thumbUrl(part.imageUrl, 140)}
                          alt={part.name}
                          width="48"
                          height="48"
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.replaceWith(
                              Object.assign(document.createElement('span'), {
                                className: 'text-[10px] font-semibold text-gray-400',
                                textContent: '이미지 없음',
                              }),
                            )
                          }}
                        />
                      ) : (
                        <span className="text-[10px] font-semibold text-gray-400">이미지 없음</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{part.name}</p>
                      {partSummary(part) && (
                        <p className="mt-0.5 truncate text-xs text-muted">{partSummary(part)}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-bold">{formatPrice(part.price)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
