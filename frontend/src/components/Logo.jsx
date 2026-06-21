// 컴친 로고 — 업로드한 이미지(아이콘 + "컴친" 글자) 사용.
// 다크 테마에서는 글자가 안 보이므로 index.css 의 .logo-img 필터로 보정.
export default function Logo({ className = 'h-11' }) {
  return (
    <img
      src="/images/comchin_logo.png"
      alt="컴친"
      className={`logo-img w-auto ${className}`}
    />
  )
}
