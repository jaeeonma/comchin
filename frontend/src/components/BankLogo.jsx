import { useState } from 'react'
import { bankByName, bankBySlug, bankLogoSrc } from '../lib/banks'

// 은행/카드 로고. /images/banks/<slug>.png 를 흰 타일 위에 보여주고,
// 파일이 없으면(onError) 브랜드 색 + 이름 앞글자 칩으로 폴백한다.
// name 또는 slug 중 하나로 식별한다.
export default function BankLogo({ name, slug, className = '' }) {
  const meta = slug ? bankBySlug(slug) : bankByName(name)
  const [failed, setFailed] = useState(false)
  const label = name ?? meta?.name ?? ''

  if (!meta || failed) {
    return (
      <div
        className={`flex items-center justify-center rounded-md text-[10px] font-bold leading-none text-white ${className}`}
        style={{ backgroundColor: meta?.color ?? '#3a3f4b' }}
        aria-label={label}
      >
        {label.slice(0, 2)}
      </div>
    )
  }

  return (
    <div className={`flex items-center justify-center overflow-hidden rounded-md bg-white ${className}`}>
      <img
        src={bankLogoSrc(meta.slug)}
        alt={label}
        onError={() => setFailed(true)}
        className="h-full w-full object-contain p-1.5"
      />
    </div>
  )
}
