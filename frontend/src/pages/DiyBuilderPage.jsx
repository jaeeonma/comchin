import { Link, Navigate } from 'react-router-dom'
import BuilderZone from '../components/BuilderZone'
import PurchaseBar from '../components/PurchaseBar'

// DIY 플랫폼별 소개 정보. 이미지는 public/images/diy/ 에 넣으면 자동 반영.
const DIY = {
  intel: {
    label: 'DIY 인텔',
    title: '컴친 DIY PC 인텔',
    subtitle: '인텔 기반으로 원하는 부품을 직접 구성하세요',
    image: '/images/diy/diy-intel.jpg',
    desc:
      '인텔 CPU와 인텔 호환 메인보드(LGA 소켓)만 추려서 보여드려요. 호환 걱정 없이 부품을 골라 견적을 맞출 수 있고, ' +
      '메모리·그래픽카드·SSD·파워·케이스·쿨러는 자유롭게 선택할 수 있어요. 아래에서 부품을 고르면 가격·전력이 자동으로 계산됩니다.',
    badge: 'bg-blue-600',
  },
  amd: {
    label: 'DIY AMD',
    title: '컴친 DIY PC AMD',
    subtitle: 'AMD 라이젠 기반으로 원하는 부품을 직접 구성하세요',
    image: '/images/diy/diy-amd.jpg',
    desc:
      'AMD 라이젠 CPU와 AMD 호환 메인보드(AM4·AM5 소켓)만 추려서 보여드려요. 호환 걱정 없이 부품을 골라 견적을 맞출 수 있고, ' +
      '메모리·그래픽카드·SSD·파워·케이스·쿨러는 자유롭게 선택할 수 있어요. 아래에서 부품을 고르면 가격·전력이 자동으로 계산됩니다.',
    badge: 'bg-red-600',
  },
}

const imgFallback = (e) => {
  e.currentTarget.replaceWith(
    Object.assign(document.createElement('span'), {
      className: 'px-6 text-center text-sm text-gray-400',
      textContent: 'DIY 사진을 등록해주세요 (public/images/diy/)',
    }),
  )
}

export default function DiyBuilderPage({ platform }) {
  const info = DIY[platform]
  if (!info) return <Navigate to="/builder" replace />

  return (
    <div className="flex flex-col gap-12 pb-28">
      {/* 빵부스러기 */}
      <nav className="text-sm text-muted">
        <Link to="/" className="hover:text-text">홈</Link>
        <span className="px-2">/</span>
        <Link to="/builder" className="hover:text-text">직접 견적</Link>
        <span className="px-2">/</span>
        <span className="text-text">{info.label}</span>
      </nav>

      {/* ===== 상단: 사진 + 정보 (완본체 상품 페이지와 동일한 구성) ===== */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* 사진 */}
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="flex aspect-square items-center justify-center">
            <img src={info.image} alt={info.title} className="h-full w-full object-cover" onError={imgFallback} />
          </div>
        </div>

        {/* 정보 */}
        <div className="flex flex-col">
          <span className={`mb-3 w-fit rounded px-2.5 py-1 text-xs font-bold text-white ${info.badge}`}>
            DIY 견적
          </span>
          <h1 className="text-2xl font-bold sm:text-3xl">{info.title}</h1>
          <p className="mt-2 text-lg text-brand">{info.subtitle}</p>

          <p className="mt-5 text-sm text-muted">선택한 부품 합계</p>
          <p className="mt-1 text-3xl font-bold">아래에서 부품 선택</p>
          <p className="mt-1 text-xs text-muted">부품을 고르면 가격·전력이 자동 계산돼요 (VAT 포함)</p>

          <p className="mt-6 leading-relaxed text-muted">{info.desc}</p>

          <a
            href="#diy-zone"
            className="mt-6 inline-block w-fit rounded-lg border border-brand px-5 py-3 text-center text-sm font-semibold text-brand transition-colors hover:bg-brand/10"
          >
            아래에서 부품 고르기
          </a>
        </div>
      </div>

      {/* ===== DIY 견적 존 (플랫폼 호환 부품만) ===== */}
      <section id="diy-zone" className="scroll-mt-6">
        <header className="mb-6">
          <p className="text-sm font-semibold tracking-wide text-brand">DIY 견적 존</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{info.label} 부품으로 견적 맞추기</h2>
          <p className="mt-2 text-muted">
            CPU·메인보드는 {platform === 'intel' ? '인텔(LGA)' : 'AMD(AM4·AM5)'} 호환만 보여드려요. 나머지 부품은 자유롭게 골라보세요.
          </p>
        </header>

        <BuilderZone enableSave platform={platform} />
      </section>

      {/* 맨 아래 고정 구매 바 — 선택 부품 합계 기준. 구매하기 시 3D PC 팝업(재미 요소). */}
      <PurchaseBar basePrice={0} includeBuild playfulBuy />
    </div>
  )
}
