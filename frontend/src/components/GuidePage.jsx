import { useSearchParams } from 'react-router-dom'
import ComchinFace from './ComchinFace'

// 문서형(노션 스타일) 가이드 레이아웃.
// 왼쪽: 페이지(주제) 목록 — 데이터에 주제를 추가하면 자동으로 쌓임.
// 본문: 선택된 주제 하나만 표시 (?p=주제id 로 링크/새로고침 유지).
// content = { title, subtitle, sections: [{ id, title, intro?, items: [{ heading, body, tip? }] }] }
export default function GuidePage({ content }) {
  const [params, setParams] = useSearchParams()
  const sections = content.sections
  const idx = Math.max(
    0,
    sections.findIndex((s) => s.id === params.get('p')),
  )
  const current = sections[idx]
  const prev = sections[idx - 1]
  const next = sections[idx + 1]

  const goTo = (id) => {
    setParams({ p: id })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{content.title}</h1>
        <p className="mt-2 max-w-2xl text-muted">{content.subtitle}</p>
      </header>

      {/* 모바일: 주제 선택 드롭다운 */}
      <div className="mb-6 lg:hidden">
        <select
          value={current.id}
          onChange={(e) => goTo(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-base outline-none focus:border-brand"
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        {/* 사이드바: 페이지 목록 (노션 스타일) */}
        <aside className="hidden lg:block">
          <nav className="sticky top-28">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted">
              문서 ({sections.length})
            </p>
            <ul className="flex flex-col gap-0.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => goTo(s.id)}
                    className={`block w-full rounded-lg px-3 py-2.5 text-left text-[15px] transition-colors ${
                      s.id === current.id
                        ? 'bg-brand/10 font-semibold text-brand'
                        : 'text-muted hover:bg-surface-2 hover:text-text'
                    }`}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* 본문: 선택된 주제 */}
        <article className="min-w-0 max-w-3xl">
          <h2 className="text-2xl font-bold">{current.title}</h2>
          {current.intro && <p className="mt-2 text-muted">{current.intro}</p>}

          <div className="mt-6 flex flex-col gap-4">
            {current.items.map((item, i) => (
              <section
                key={i}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <h3 className="text-lg font-semibold">{item.heading}</h3>
                <div className="mt-2 flex flex-col gap-2 text-[15px] leading-relaxed text-muted">
                  {(Array.isArray(item.body) ? item.body : [item.body]).map(
                    (para, j) => (
                      <p key={j}>{para}</p>
                    ),
                  )}
                </div>
                {item.tip && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-brand/10 px-3 py-2.5 text-sm leading-relaxed text-text">
                    <ComchinFace className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>
                      <span className="font-semibold text-brand">컴친 팁</span> ·{' '}
                      {item.tip}
                    </p>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* 이전 / 다음 페이지 */}
          <nav className="mt-10 grid grid-cols-2 gap-3 border-t border-border pt-6">
            {prev ? (
              <button
                type="button"
                onClick={() => goTo(prev.id)}
                className="rounded-xl border border-border p-4 text-left transition-colors hover:border-brand"
              >
                <span className="text-xs text-muted">← 이전</span>
                <p className="mt-1 truncate font-medium">{prev.title}</p>
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button
                type="button"
                onClick={() => goTo(next.id)}
                className="rounded-xl border border-border p-4 text-right transition-colors hover:border-brand"
              >
                <span className="text-xs text-muted">다음 →</span>
                <p className="mt-1 truncate font-medium">{next.title}</p>
              </button>
            ) : (
              <span />
            )}
          </nav>
        </article>
      </div>
    </div>
  )
}
