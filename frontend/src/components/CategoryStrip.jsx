import { Link } from 'react-router-dom'
import { categories } from '../data/mockBuilds'

// 완본체 카테고리 → 목록 페이지, 부품 카테고리 → 부품 페이지(해당 필터 적용), 그 외(직접견적) → 견적 페이지
const PC_KEYS = ['gaming', 'workstation', 'highend', 'office']
const PART_KEYS = ['cpu', 'gpu', 'memory', 'motherboard', 'ssd', 'psu', 'case', 'cpuCooler', 'hdd']
const linkFor = (key) => {
  if (PC_KEYS.includes(key)) return `/category/${key}`
  if (PART_KEYS.includes(key)) return `/parts?type=${key}` // 부품 페이지에서 해당 종류 필터 자동 적용
  return '/builder'
}

export default function CategoryStrip() {
  return (
    <section>
      <ul className="grid grid-cols-4 gap-4 sm:grid-cols-8">
        {categories.map((cat) => (
          <li key={cat.key}>
            <Link
              to={linkFor(cat.key)}
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-3 py-6 text-center transition-colors hover:border-brand hover:bg-surface-2"
            >
              {/* 이미지 (로드 실패 시 이모지 폴백) */}
              {cat.image ? (
                <img
                  src={cat.image}
                  alt={cat.label}
                  className="h-20 w-20 object-contain"
                  onError={(e) => {
                    e.currentTarget.replaceWith(
                      Object.assign(document.createElement('span'), {
                        className: 'text-4xl',
                        textContent: cat.icon,
                      }),
                    )
                  }}
                />
              ) : (
                <span className="text-4xl">{cat.icon}</span>
              )}
              <span className="text-sm text-muted">{cat.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
