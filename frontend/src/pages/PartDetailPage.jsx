import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { fetchPart } from '../api/parts'
import { formatPrice, partSummary, specEntries } from '../lib/partFormat'
import ReviewSection from '../components/ReviewSection'
import PurchaseBar from '../components/PurchaseBar'
import TipCard from '../components/TipCard'
import { buildPartTips } from '../lib/tipEngine'

const ENUM_LABEL = {
  CPU: 'CPU', CPU_COOLER: 'CPU 쿨러', MEMORY: '메모리', MOTHERBOARD: '메인보드',
  GPU: '그래픽카드', SSD: 'SSD', HDD: 'HDD', PSU: '파워', CASE: '케이스',
}

// 부품용 예시 리뷰 풀 + 생성 (카드의 리뷰 수와 상세 리뷰 수를 맞추기 위함)
const PART_REVIEW_POOL = [
  { nick: '조립러', content: '성능·발열 다 만족스럽고 정품이라 안심돼요.' },
  { nick: '가성비왕', content: '이 가격에 이 정도면 가성비 훌륭합니다.' },
  { nick: '업글했어요', content: '기존 부품에서 교체했는데 체감이 확실하네요.' },
  { nick: '배송빠름', content: '포장 꼼꼼하고 배송도 빨랐어요. 추천합니다.' },
  { nick: '무난해요', content: '설치 간단하고 잘 작동합니다. 만족해요.' },
  { nick: '재구매', content: '두 번째 구매인데 품질이 일정해서 좋네요.' },
]
function hashId(id) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}
function genSeed(id) {
  const count = 2 + (hashId(id) % 6) // 2~7개
  const out = []
  const h = hashId(id)
  for (let i = 0; i < count; i++) {
    const item = PART_REVIEW_POOL[(h + i) % PART_REVIEW_POOL.length]
    const d = new Date(2026, 4, 28)
    d.setDate(d.getDate() - i * 5 - (h % 6))
    out.push({
      id: `seed-${i}`,
      author: item.nick,
      rating: 5 - (i % 2),
      content: item.content,
      date: d.toISOString().slice(0, 10),
    })
  }
  return out
}

export default function PartDetailPage() {
  const { id } = useParams()
  const [part, setPart] = useState(null)
  const [status, setStatus] = useState('loading') // loading | success | error | notfound

  useEffect(() => {
    let alive = true
    setStatus('loading')
    fetchPart(id)
      .then((p) => {
        if (!alive) return
        setPart(p)
        setStatus('success')
      })
      .catch((err) => {
        if (!alive) return
        setStatus(err?.response?.status === 404 ? 'notfound' : 'error')
      })
    return () => {
      alive = false
    }
  }, [id])

  if (status === 'notfound') return <Navigate to="/parts" replace />

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
        <p>부품을 불러오는 중…</p>
      </div>
    )
  }

  if (status === 'error' || !part) {
    return (
      <p className="py-24 text-center text-muted">
        부품을 불러오지 못했습니다. 백엔드 서버가 켜져 있는지 확인해주세요.
      </p>
    )
  }

  const entries = specEntries(part)
  const seed = genSeed(part.id)

  return (
    <div className="flex flex-col gap-12 pb-28">
      {/* 빵부스러기 */}
      <nav className="text-sm text-muted">
        <Link to="/" className="hover:text-text">홈</Link>
        <span className="px-2">/</span>
        <Link to="/parts" className="hover:text-text">부품</Link>
        <span className="px-2">/</span>
        <span className="text-text">{part.name}</span>
      </nav>

      {/* ===== 상단: 사진 + 부품 정보 ===== */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* 사진 */}
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="flex aspect-square items-center justify-center p-6">
            {part.imageUrl ? (
              <img src={part.imageUrl} alt={part.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-sm text-gray-400">이미지 준비중</span>
            )}
          </div>
        </div>

        {/* 정보 */}
        <div className="flex flex-col">
          <span className="mb-3 w-fit rounded bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">
            {ENUM_LABEL[part.category] ?? '부품'}
          </span>
          <h1 className="text-2xl font-bold sm:text-3xl">{part.name}</h1>
          {partSummary(part) && <p className="mt-2 text-lg text-brand">{partSummary(part)}</p>}

          <p className="mt-5 text-3xl font-bold">{formatPrice(part.price)}</p>
          <p className="mt-1 text-xs text-muted">VAT 포함 · 입력 시점 기준 가격</p>

          {/* 스펙 표 */}
          {entries.length > 0 && (
            <table className="mt-6 w-full border-collapse overflow-hidden rounded-lg border border-border text-sm">
              <tbody>
                {entries.map(([label, value]) => (
                  <tr key={label} className="border-b border-border last:border-0">
                    <th className="w-28 border-r border-border bg-surface-2 px-3 py-2.5 text-left font-normal text-muted">
                      {label}
                    </th>
                    <td className="px-3 py-2.5 text-text">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* 직접 견적 안내 (완본체의 업그레이드 ZONE 대신) */}
          <Link
            to="/builder"
            className="mt-6 inline-block w-fit rounded-lg border border-brand px-5 py-3 text-center text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
          >
            직접 견적에서 다른 부품과 함께 맞춰보기
          </Link>
        </div>
      </div>

      {/* 컴친 팁 — 이 부품의 특징·호환성·선택 요령 */}
      <TipCard tips={buildPartTips(part)} interval={6500} />

      {/* ===== 리뷰 ===== */}
      <ReviewSection pcId={part.id} seed={seed} />

      {/* 맨 아래 고정 구매 바 (부품 단일 금액) — 장바구니는 이 부품을 담는다 */}
      <PurchaseBar
        basePrice={part.price}
        includeBuild={false}
        cartItem={{ id: part.id, type: 'part', name: part.name, image: part.imageUrl, price: part.price }}
      />
    </div>
  )
}
