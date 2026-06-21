import { useMemo, useState } from 'react'

// 보안 인증 — 랜덤 숫자를 비뚤비뚤한 그림으로 띄우고, 그 숫자를 그대로 입력하면 통과.
const genCode = () => String(Math.floor(100000 + Math.random() * 900000)) // 6자리
const COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#ef4444', '#10b981', '#a855f7']
const rand = (a, b) => a + Math.random() * (b - a)

export default function Captcha({ onValidChange }) {
  const [code, setCode] = useState(genCode)
  const [val, setVal] = useState('')

  // 코드가 바뀔 때마다 각 숫자의 회전·색·위치 + 노이즈 선을 새로 정함(렌더마다 흔들리지 않게 useMemo)
  const { glyphs, lines } = useMemo(() => {
    const glyphs = [...code].map((d, i) => ({
      d,
      x: 22 + i * 26 + rand(-3, 3),
      y: 40 + rand(-5, 5),
      rot: rand(-28, 28),
      color: COLORS[Math.floor(rand(0, COLORS.length))],
      size: rand(28, 36),
    }))
    const lines = Array.from({ length: 4 }, () => ({ x1: rand(0, 180), y1: rand(0, 60), x2: rand(0, 180), y2: rand(0, 60) }))
    return { glyphs, lines }
  }, [code])

  const refresh = () => {
    setCode(genCode())
    setVal('')
    onValidChange?.(false)
  }
  const onInput = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 6)
    setVal(digits)
    onValidChange?.(digits === code)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <svg
          viewBox="0 0 180 60"
          className="h-14 w-44 select-none rounded-lg border border-border"
          role="img"
          aria-label="보안문자 이미지"
        >
          <rect width="180" height="60" fill="#161922" />
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#3a3f4b" strokeWidth="1" />
          ))}
          {glyphs.map((g, i) => (
            <text
              key={i}
              x={g.x}
              y={g.y}
              fontSize={g.size}
              fontWeight="800"
              fill={g.color}
              transform={`rotate(${g.rot} ${g.x} ${g.y})`}
              fontFamily="monospace"
            >
              {g.d}
            </text>
          ))}
        </svg>
        <button
          type="button"
          onClick={refresh}
          className="flex h-14 w-12 shrink-0 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-brand hover:text-text"
          aria-label="새로고침"
          title="다른 숫자로 바꾸기"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M5 9a7 7 0 0 1 12-3l3 3M19 15a7 7 0 0 1-12 3l-3-3" />
          </svg>
        </button>
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={val}
        onChange={(e) => onInput(e.target.value)}
        placeholder="위 숫자 6자리를 입력하세요"
        className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-brand"
      />
    </div>
  )
}
