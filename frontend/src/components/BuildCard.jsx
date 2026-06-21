import { Link } from 'react-router-dom'

const formatPrice = (won) => `${won.toLocaleString('ko-KR')}원`

const SPEC_ROWS = [
  ['CPU', 'cpu'],
  ['VGA', 'gpu'],
  ['RAM', 'ram'],
  ['SSD', 'ssd'],
]

// 메인 화면 추천 견적 카드 — 상품 카드(PrebuiltCard)와 동일한 형식(사진 + 사양표).
// 클릭하면 해당 상품 상세(구매) 페이지로 이동.
export default function BuildCard({ build }) {
  const finalPrice = Math.round((build.price * (100 - build.discount)) / 100)

  return (
    <article className="group overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-brand">
      {/* 사진 (상세 페이지로 이동) */}
      <Link
        to={`/pc/${build.id}`}
        className="relative flex aspect-square items-center justify-center bg-surface-2 text-sm text-muted"
      >
        {build.image ? (
          <img
            src={build.image}
            alt={build.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          '이미지 준비중'
        )}

        {/* 태그 (좌상단) */}
        {build.tag && (
          <span className="absolute left-2 top-2 rounded bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">
            {build.tag}
          </span>
        )}

        {/* 할인 (우상단) */}
        {build.discount > 0 && (
          <span className="absolute right-2 top-2 rounded bg-black/60 px-2 py-1 text-xs font-bold text-white">
            {build.discount}% 할인
          </span>
        )}
      </Link>

      {/* 본문 */}
      <div className="flex flex-col gap-2 p-3">
        <Link to={`/pc/${build.id}`} className="truncate font-medium hover:text-brand">
          {build.name}
        </Link>

        {/* 가격 (할인 적용) */}
        <div>
          {build.discount > 0 && (
            <p className="text-xs text-muted line-through">{formatPrice(build.price)}</p>
          )}
          <p className="text-xl font-bold">{formatPrice(finalPrice)}</p>
        </div>

        {/* 스펙 표 */}
        <table className="w-full border-collapse overflow-hidden rounded-md border border-border text-xs">
          <tbody>
            {SPEC_ROWS.map(([label, key]) => (
              <tr key={key} className="border-b border-border last:border-0">
                <th className="w-12 border-r border-border bg-surface-2 px-2 py-2 font-normal text-muted">
                  {label}
                </th>
                <td className="truncate px-3 py-2 text-text">{build[key] || ' '}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}
