import { Link } from 'react-router-dom'
import { useAiStore } from '../store/useAiStore'
import HeroBanner from '../components/HeroBanner'
import CategoryStrip from '../components/CategoryStrip'
import BuildCard from '../components/BuildCard'
import TipCard from '../components/TipCard'
import { recommendedBuilds } from '../data/mockBuilds'
import { GENERAL_TIPS } from '../data/tips'

function SectionHeader({ title, desc, to }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      </div>
      {to && (
        <Link to={to} className="text-sm text-muted hover:text-brand">
          더보기 →
        </Link>
      )}
    </div>
  )
}

export default function HomePage() {
  const gamingBuilds = recommendedBuilds.filter((b) => b.tag === '게이밍')
  const openChat = useAiStore((s) => s.openChat)

  return (
    <div className="flex flex-col gap-12">
      <HeroBanner />

      <CategoryStrip />

      {/* 컴친 팁 — 5~7초마다 순서대로 회전 */}
      <TipCard tips={GENERAL_TIPS} interval={6000} />

      {/* AI 견적 유도 배너 */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3 sm:items-center">
          {/* 제미나이 로고 */}
          <img
            src="/images/logos/Gemini_logo.png"
            alt="Gemini"
            className="gemini-logo h-6 w-auto shrink-0 object-contain sm:h-9"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="min-w-0">
            <h2 className="text-base font-bold sm:text-lg">어떤 부품을 골라야 할지 모르겠나요?</h2>
            <p className="mt-1 text-sm text-muted">
              컴친 AI가 부품 호환성·병목·주의할 점을 실시간으로 알려드려요.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openChat}
          className="w-full shrink-0 whitespace-nowrap rounded-md bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-hover sm:w-auto"
        >
          AI 견적 시작하기
        </button>
      </section>

      {/* 컴친 추천 견적 */}
      <section>
        <SectionHeader
          title="컴친 추천 견적"
          desc="용도별로 검증된 조합을 바로 담아보세요"
          to="/builder"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {recommendedBuilds.map((build) => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      </section>

      {/* 게이밍 PC 모음 */}
      <section>
        <SectionHeader
          title="인기 게이밍 PC"
          desc="롤·배그·발로란트 부드럽게"
          to="/builder"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {gamingBuilds.map((build) => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      </section>
    </div>
  )
}
