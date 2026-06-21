import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'

const stars = (n) => '★★★★★☆☆☆☆☆'.slice(5 - n, 10 - n)

function storageKey(pcId) {
  return `comchin:reviews:${pcId}`
}

function loadReviews(pcId, seed) {
  try {
    const raw = localStorage.getItem(storageKey(pcId))
    if (raw) return JSON.parse(raw)
  } catch {
    // 무시
  }
  return seed ?? []
}

function saveReviews(pcId, reviews) {
  try {
    localStorage.setItem(storageKey(pcId), JSON.stringify(reviews))
  } catch {
    // 무시
  }
}

const today = () => new Date().toISOString().slice(0, 10)

// 완본체 상세 페이지 하단의 리뷰 섹션.
// 로그인한 사용자만 리뷰를 작성할 수 있다. (coolzen 리뷰 영역 벤치마킹)
export default function ReviewSection({ pcId, seed = [] }) {
  const user = useAuthStore((s) => s.user)
  const [reviews, setReviews] = useState(() => loadReviews(pcId, seed))
  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = content.trim()
    if (!text || !user) return
    const next = [
      {
        id: `${Date.now()}`,
        author: user.nickname,
        rating,
        content: text,
        date: today(),
      },
      ...reviews,
    ]
    setReviews(next)
    saveReviews(pcId, next)
    setContent('')
    setRating(5)
  }

  return (
    <section className="mt-12">
      <div className="mb-4 flex items-baseline justify-between border-b border-border pb-3">
        <h2 className="text-xl font-bold">
          상품 리뷰 <span className="text-brand">{reviews.length}</span>
        </h2>
        <span className="text-sm text-muted">실제 구매 고객님들의 후기입니다</span>
      </div>

      {/* 작성 영역 — 로그인했을 때만 입력 가능 */}
      {user ? (
        <form
          onSubmit={handleSubmit}
          className="mb-8 rounded-xl border border-border bg-surface p-5"
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm font-semibold">{user.nickname}</span>
            {/* 별점 선택 */}
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n}점`}
                  className={`text-xl leading-none ${
                    n <= rating ? 'text-amber-400' : 'text-border'
                  }`}
                >
                  ★
                </button>
              ))}
              <span className="ml-1 text-sm text-muted">{rating}.0</span>
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="상품에 대한 후기를 남겨주세요."
            className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={!content.trim()}
              className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              리뷰 등록
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-muted">리뷰는 로그인 후 작성할 수 있어요.</p>
          <Link
            to="/login"
            className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            로그인하러 가기
          </Link>
        </div>
      )}

      {/* 리뷰 목록 */}
      {reviews.length === 0 ? (
        <p className="py-10 text-center text-muted">아직 등록된 리뷰가 없어요. 첫 리뷰를 남겨보세요!</p>
      ) : (
        <ul className="flex flex-col">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-border py-4 last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.author}</span>
                  <span className="text-amber-400">{stars(r.rating)}</span>
                </div>
                <span className="text-xs text-muted">{r.date}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-text">{r.content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
