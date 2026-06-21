import { Link } from 'react-router-dom'
import { useFavoriteStore } from '../store/useFavoriteStore'

const formatPrice = (won) => `${(won ?? 0).toLocaleString('ko-KR')}원`

const detailPath = (it) => {
  if (it.type === 'pc') return `/pc/${it.id}`
  if (it.type === 'build') return '/builder'
  return `/part/${it.id}`
}
const typeLabel = (type) => {
  if (type === 'pc') return '완성PC'
  if (type === 'build') return '내 견적'
  return '부품'
}

function FavoriteCard({ item, onRemove }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-brand/50">
      {/* 삭제 */}
      <button
        type="button"
        aria-label="즐겨찾기 해제"
        onClick={() => onRemove(item.key)}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface/80 text-rose-500 backdrop-blur transition-colors hover:bg-rose-500 hover:text-white"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
        </svg>
      </button>

      <Link to={detailPath(item)} className="flex flex-1 flex-col">
        {/* 이미지 */}
        <div className="flex h-44 items-center justify-center overflow-hidden border-b border-border bg-white">
          {item.image ? (
            <img src={item.image} alt={item.name} className="h-full w-full object-contain p-2" />
          ) : (
            <span className="text-xs text-gray-400">이미지 없음</span>
          )}
        </div>

        {/* 정보 */}
        <div className="flex flex-1 flex-col p-4">
          <span className="mb-1 inline-block w-fit rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">
            {typeLabel(item.type)}
          </span>
          <p className="line-clamp-2 flex-1 font-medium group-hover:text-brand" title={item.name}>
            {item.name}
          </p>
          <p className="mt-2 text-lg font-bold text-text">{formatPrice(item.price)}</p>
        </div>
      </Link>
    </div>
  )
}

export default function FavoritesPage() {
  const items = useFavoriteStore((s) => s.items)
  const remove = useFavoriteStore((s) => s.remove)
  const clear = useFavoriteStore((s) => s.clear)

  if (items.length === 0) {
    return (
      <div className="py-24 text-center">
        <h1 className="text-2xl font-bold">즐겨찾기</h1>
        <p className="mt-4 text-muted">아직 즐겨찾기한 상품이 없어요.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hover">
            완성PC 보러가기
          </Link>
          <Link to="/parts" className="rounded-lg border border-border px-5 py-2.5 font-semibold hover:border-brand">
            부품 보러가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-12">
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">
          즐겨찾기 <span className="text-lg font-medium text-muted">{items.length}</span>
        </h1>
        <button type="button" onClick={clear} className="text-sm text-muted hover:text-rose-500">
          전체 비우기
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <FavoriteCard key={item.key} item={item} onRemove={remove} />
        ))}
      </div>
    </div>
  )
}
