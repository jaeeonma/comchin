import { Link } from 'react-router-dom'
import { categories } from '../data/mockBuilds'

// 완본체 카테고리는 목록 페이지로, 그 외(부품·직접견적)는 견적 페이지로
const PC_KEYS = ['gaming', 'workstation', 'highend', 'office']
const linkFor = (key) => (PC_KEYS.includes(key) ? `/category/${key}` : '/builder')

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
