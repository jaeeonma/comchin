// 컴친 마스코트 얼굴 (파란 말풍선 + 스마일). 텍스트 없는 아이콘 버전 — 설명/팁 옆에 사용.
export default function ComchinFace({ className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="32" height="25" rx="8" fill="#3B6EF6" />
      <path d="M12 27 L12 35 L20 28 Z" fill="#3B6EF6" />
      <circle cx="15.5" cy="17" r="2.3" fill="#fff" />
      <circle cx="24.5" cy="17" r="2.3" fill="#fff" />
      <path
        d="M15 22 Q20 26 25 22"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}
