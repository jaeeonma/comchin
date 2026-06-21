import { useEffect, useRef, useState } from 'react'

// 컴친 팁 카드. tips=[{tag,text}] 를 받아 보여준다.
// - rotate=true: interval(ms)마다 다음 팁으로 자동 전환(호버 시 일시정지). 점을 눌러 이동도 가능.
// - 상호작용으로 tips 가 바뀌면 부모에서 key 를 바꿔 첫 팁부터 보이게 하면 된다.
// 눈에 잘 들어오도록: 진한 브랜드 그라데이션 + 굵은 테두리 + 왼쪽 액센트 바 + 큰 굵은 글씨.
export default function TipCard({ tips, rotate = true, interval = 6000, className = '' }) {
  const [i, setI] = useState(0)
  const paused = useRef(false)

  useEffect(() => {
    if (!rotate || !tips || tips.length <= 1) return undefined
    const id = setInterval(() => {
      if (!paused.current) setI((prev) => (prev + 1) % tips.length)
    }, interval)
    return () => clearInterval(id)
  }, [rotate, tips, interval])

  if (!tips || tips.length === 0) return null
  const idx = Math.min(i, tips.length - 1)
  const tip = tips[idx]

  return (
    <div
      onMouseEnter={() => {
        paused.current = true
      }}
      onMouseLeave={() => {
        paused.current = false
      }}
      className={`relative overflow-hidden rounded-2xl border-2 border-brand/50 bg-linear-to-br from-brand/20 via-brand/10 to-surface p-4 shadow-md shadow-brand/15 sm:p-5 ${className}`}
      aria-live="polite"
    >
      {/* 왼쪽 액센트 바 */}
      <span className="absolute inset-y-0 left-0 w-1.5 bg-brand" aria-hidden="true" />

      <div className="pl-2">
        <div className="mb-2.5 flex items-center gap-2">
          <span className="rounded-md bg-brand px-2.5 py-1 text-sm font-extrabold tracking-tight text-white shadow-sm">
            컴친 팁
          </span>
          {tip.tag && (
            <span className="rounded-full border border-brand/50 bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
              {tip.tag}
            </span>
          )}
        </div>

        <p
          key={idx}
          style={{ animation: 'tip-in 0.35s ease' }}
          className="text-base font-semibold leading-relaxed text-text sm:text-lg"
        >
          {tip.text}
        </p>

        {tips.length > 1 && (
          <div className="mt-3 flex items-center gap-1.5">
            {tips.slice(0, 10).map((_, d) => (
              <button
                key={d}
                type="button"
                aria-label={`팁 ${d + 1}`}
                onClick={() => setI(d)}
                className={`h-2 rounded-full transition-all ${
                  d === idx ? 'w-5 bg-brand' : 'w-2 bg-brand/30 hover:bg-brand/60'
                }`}
              />
            ))}
            {tips.length > 10 && <span className="ml-1 text-xs font-medium text-brand">+{tips.length - 10}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
