import { useParams, Navigate, Link } from 'react-router-dom'
import { getPCById, PC_CATEGORIES } from '../data/prebuiltPCs'
import BuilderZone from '../components/BuilderZone'
import ReviewSection from '../components/ReviewSection'
import PurchaseBar from '../components/PurchaseBar'
import TipCard from '../components/TipCard'
import { buildPcTips } from '../lib/tipEngine'

const formatPrice = (won) =>
  won == null ? '가격 미정' : `${won.toLocaleString('ko-KR')}원`

// 샘플 완본체에 기본으로 보여줄 예시 리뷰 (로그인 후 추가 작성 가능)
const SEED_REVIEWS = {
  'gaming-1': [
    { id: 's1', author: '게임러버', rating: 5, content: '발로란트 240프레임 잘 나와요. 조립도 깔끔하게 와서 만족합니다.', date: '2026-05-21' },
    { id: 's2', author: 'pc초보', rating: 4, content: '배그 풀옵 쾌적하게 돌아갑니다. 배송이 조금 늦었던 것 빼곤 좋아요.', date: '2026-05-12' },
    { id: 's3', author: '롤만해요', rating: 5, content: '소음도 적고 온도도 안정적이네요. 가성비 좋은 구성 같습니다.', date: '2026-04-30' },
  ],
  'gaming-2': [
    { id: 's1', author: '화이트덕후', rating: 5, content: '화이트 케이스 너무 예뻐요. QHD에서 게임 다 잘 돌아갑니다.', date: '2026-06-02' },
    { id: 's2', author: '직장인게이머', rating: 4, content: '성능은 만족스러운데 생각보다 커서 책상 자리 차지를 좀 하네요.', date: '2026-05-25' },
  ],
}

// 명시 리뷰가 없는 상품용 예시 리뷰 풀 (카드의 리뷰 수와 상세 리뷰 수를 맞추기 위함)
const GAME_POOL = [
  { nick: '게임유저', content: '조립 깔끔하게 왔고 성능도 기대한 만큼 잘 나옵니다.' },
  { nick: '배그한판', content: '프레임 잘 뽑히고 발열·소음도 안정적이에요.' },
  { nick: '롤린이', content: '가성비 좋네요. 처음 맞춰봤는데 만족합니다.' },
  { nick: '직장인게이머', content: '퇴근하고 게임하기 딱 좋아요. 배송도 빨랐습니다.' },
  { nick: '스팀러버', content: '최신 게임도 무리 없이 돌아갑니다. 추천해요.' },
  { nick: '화이트덕후', content: '디자인이 마음에 들어요. 켜두면 자꾸 보게 되네요.' },
  { nick: '컴알못', content: 'AS·세팅 안내가 친절해서 초보도 쓰기 편했어요.' },
  { nick: '풀옵션러', content: '옵션 풀로 올려도 쾌적합니다. 잘 산 것 같아요.' },
]
const WORK_POOL = [
  { nick: '편집실장', content: '4K 타임라인도 버벅임 없이 잘 돌아갑니다.' },
  { nick: '프리랜서', content: '렌더링 시간이 확 줄었어요. 작업 효율 좋네요.' },
  { nick: '디자이너K', content: '포토샵·일러스트 멀티태스킹이 쾌적합니다.' },
  { nick: '3D작업자', content: '모델링·렌더 둘 다 안정적이라 만족합니다.' },
  { nick: '유튜버제이', content: '편집·인코딩이 빨라져서 업로드가 수월해졌어요.' },
  { nick: '사무관리', content: '조립 깔끔하고 소음도 적어 사무실에 두기 좋아요.' },
  { nick: '재택근무러', content: '여러 프로그램 동시에 켜도 느려지지 않네요.' },
  { nick: '스튜디오', content: '장시간 작업에도 안정적이라 믿고 씁니다.' },
]
const OFFICE_POOL = [
  { nick: '사무직A', content: '문서·엑셀 작업 빠릿하고 조용해서 만족합니다.' },
  { nick: '재택근무', content: '부팅도 빠르고 여러 창 띄워도 무리 없어요.' },
  { nick: '학부모', content: '아이 인강·과제용으로 딱 좋네요. 가성비 굿입니다.' },
  { nick: '자영업', content: '매장 포스·서류용으로 쓰는데 안정적이에요.' },
  { nick: '인강러', content: '화상수업·동영상 강의 끊김 없이 잘 봅니다.' },
  { nick: '민원실', content: '작고 조용해서 책상 위에 두기 좋습니다.' },
  { nick: '알뜰소비', content: '이 가격에 이 정도면 충분히 만족해요.' },
  { nick: '총무팀', content: '설치·세팅 안내가 친절해서 바로 사용했습니다.' },
]

// id를 시드로 count개의 예시 리뷰를 생성 (렌더마다 동일한 결과)
function genSeed(id, count, category) {
  if (!count || count < 1) return []
  const POOL = category === 'workstation' ? WORK_POOL : category === 'office' ? OFFICE_POOL : GAME_POOL
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const out = []
  for (let i = 0; i < count; i++) {
    const item = POOL[(h + i) % POOL.length]
    const d = new Date(2026, 4, 28)
    d.setDate(d.getDate() - i * 4 - (h % 5))
    out.push({
      id: `seed-${i}`,
      author: item.nick,
      rating: 5 - (i % 2),
      content: item.content,
      date: d.toISOString().slice(0, 10),
    })
  }
  return out
}

export default function PrebuiltDetailPage() {
  const { id } = useParams()
  const pc = getPCById(id)

  // 데이터가 없거나 아직 준비 안 된(빈) 상품이면 홈으로
  if (!pc || !pc.name) return <Navigate to="/" replace />

  const category = PC_CATEGORIES[pc.category]
  const seed = SEED_REVIEWS[pc.id] ?? genSeed(pc.id, pc.reviews, pc.category)

  // 할인(추천 카드)이 있으면 할인가를 기준 가격으로 사용 (카드와 동일)
  const hasDiscount = pc.discount > 0
  const salePrice = hasDiscount ? Math.round((pc.price * (100 - pc.discount)) / 100) : pc.price

  return (
    <div className="flex flex-col gap-12 pb-28">
      {/* 빵부스러기 */}
      <nav className="text-sm text-muted">
        <Link to="/" className="hover:text-text">홈</Link>
        <span className="px-2">/</span>
        {category && (
          <>
            <Link to={`/category/${pc.category}`} className="hover:text-text">
              {category.label}
            </Link>
            <span className="px-2">/</span>
          </>
        )}
        <span className="text-text">{pc.name}</span>
      </nav>

      {/* ===== 상단: 사진 + 상품 정보 ===== */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* 사진 */}
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="flex aspect-square items-center justify-center">
            {pc.image ? (
              <img src={pc.image} alt={pc.name} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm text-gray-400">이미지 준비중</span>
            )}
          </div>
        </div>

        {/* 정보 */}
        <div className="flex flex-col">
          {pc.tag && (
            <span className="mb-3 w-fit rounded bg-rose-500 px-2.5 py-1 text-xs font-bold text-white">
              {pc.tag}
            </span>
          )}
          <h1 className="text-2xl font-bold sm:text-3xl">{pc.name}</h1>
          {pc.subtitle && <p className="mt-2 text-lg text-brand">{pc.subtitle}</p>}

          {hasDiscount ? (
            <div className="mt-5">
              <p className="text-sm text-muted line-through">{formatPrice(pc.price)}</p>
              <p className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-rose-500">{pc.discount}%</span>
                <span className="text-3xl font-bold">{formatPrice(salePrice)}</span>
              </p>
            </div>
          ) : (
            <p className="mt-5 text-3xl font-bold">{formatPrice(salePrice)}</p>
          )}
          <p className="mt-1 text-xs text-muted">VAT 포함 · 입력 시점 기준 가격</p>

          {/* 구성표 */}
          {pc.specs && (
            <table className="mt-6 w-full border-collapse overflow-hidden rounded-lg border border-border text-sm">
              <tbody>
                {pc.specs.map(([label, value]) => (
                  <tr key={label} className="border-b border-border last:border-0">
                    <th className="w-28 border-r border-border bg-surface-2 px-3 py-2.5 text-left font-normal text-muted">
                      {label}
                    </th>
                    <td className="px-3 py-2.5 text-text">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {pc.description && (
            <p className="mt-6 leading-relaxed text-muted">{pc.description}</p>
          )}

          {/* 구매/장바구니 기능은 아직 미구현 — 업그레이드 ZONE 안내로 대체 */}
          <a
            href="#upgrade-zone"
            className="mt-6 inline-block w-fit rounded-lg border border-brand px-5 py-3 text-center text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
          >
            아래 업그레이드 ZONE에서 부품 바꿔보기
          </a>
        </div>
      </div>

      {/* 컴친 팁 — 이 PC의 특징·장단점·가성비 */}
      <TipCard tips={buildPcTips(pc)} interval={6500} />

      {/* ===== 업그레이드 ZONE (직접 견적과 동일) ===== */}
      <section id="upgrade-zone" className="scroll-mt-6">
        <header className="mb-6">
          <p className="text-sm font-semibold tracking-wide text-brand">업그레이드 ZONE</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">부품을 직접 바꿔 견적 맞추기</h2>
          <p className="mt-2 text-muted">
            기본 구성을 참고해, 원하는 부품으로 교체하면 가격·전력이 자동으로 다시 계산돼요.
          </p>
        </header>

        <BuilderZone />
      </section>

      {/* ===== 리뷰 ===== */}
      <ReviewSection pcId={pc.id} seed={seed} />

      {/* 맨 아래 고정 구매 바 — 장바구니는 이 완본체를 담는다 */}
      <PurchaseBar
        basePrice={salePrice ?? 0}
        cartItem={{ id: pc.id, type: 'pc', name: pc.name, image: pc.image, price: salePrice ?? 0 }}
      />
    </div>
  )
}
