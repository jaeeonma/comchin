import { Link } from 'react-router-dom'

const formatPrice = (won) =>
  won == null ? '가격 미정' : `${won.toLocaleString('ko-KR')}원`

const SPEC_ROWS = [
  ['CPU', 'cpu'],
  ['VGA', 'gpu'],
  ['RAM', 'ram'],
  ['SSD', 'ssd'],
]

// 완본체 상품 카드 (coolzen 스타일). 값이 비어있으면 placeholder로 표시.
// 상품명이 있는 카드만 상세 페이지로 이동 가능.
export default function PrebuiltCard({ pc }) {
  const ready = Boolean(pc.name)

  // 이미지 영역 — 준비된 상품이면 상세 페이지로 이동하는 링크
  const imageBox = (
    <div className="relative flex aspect-square items-center justify-center bg-surface-2 text-sm text-muted">
      {pc.image ? (
        <img src={pc.image} alt={pc.name || '추천 PC'} className="h-full w-full object-cover" />
      ) : (
        '이미지 준비중'
      )}

      {/* 인기 뱃지 (좌상단) */}
      {pc.tag && (
        <span className="absolute left-2 top-2 rounded bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
          {pc.tag}
        </span>
      )}

      {/* 리뷰 뱃지 (우하단) */}
      {pc.reviews != null && (
        <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-xs text-white">
          ★ 리뷰 {pc.reviews}개
        </span>
      )}
    </div>
  )

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-brand">
      {ready ? (
        <Link to={`/pc/${pc.id}`} className="block">
          {imageBox}
        </Link>
      ) : (
        imageBox
      )}

      {/* 본문 */}
      <div className="flex flex-col gap-2 p-3">
        {ready ? (
          <Link to={`/pc/${pc.id}`} className="truncate font-medium hover:text-brand">
            {pc.name}
          </Link>
        ) : (
          <h3 className="truncate font-medium text-muted">상품명 준비중</h3>
        )}

        {pc.subtitle && (
          <p className="truncate text-sm font-medium text-brand">{pc.subtitle}</p>
        )}

        <p className="text-xl font-bold">{formatPrice(pc.price)}</p>

        {/* 스펙 표 */}
        <table className="w-full border-collapse overflow-hidden rounded-md border border-border text-xs">
          <tbody>
            {SPEC_ROWS.map(([label, key]) => (
              <tr key={key} className="border-b border-border last:border-0">
                <th className="w-12 border-r border-border bg-surface-2 px-2 py-2 font-normal text-muted">
                  {label}
                </th>
                <td className="truncate px-3 py-2 text-text">{pc[key] || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}
