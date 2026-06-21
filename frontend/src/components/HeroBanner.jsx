import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { banners } from '../data/mockBuilds'

// 모서리(둥근 코너)만 흐리게 보이도록 가장자리를 페더 처리하는 마스크.
// 가로·세로 페더를 교차(intersect)시키면 직선 변은 거의 그대로,
// 코너는 두 페더가 겹쳐 더 부드럽게 흐려진다.
const FEATHER = '18px'
const featherGrad = (dir) =>
  `linear-gradient(to ${dir}, transparent 0, #000 ${FEATHER}, #000 calc(100% - ${FEATHER}), transparent 100%)`
const cornerFeatherMask = {
  maskImage: `${featherGrad('right')}, ${featherGrad('bottom')}`,
  maskComposite: 'intersect',
  maskRepeat: 'no-repeat',
  WebkitMaskImage: `${featherGrad('right')}, ${featherGrad('bottom')}`,
  WebkitMaskComposite: 'source-in',
  WebkitMaskRepeat: 'no-repeat',
}

// 이미지 속에 그려진 버튼 위에 덮는 '투명 클릭 영역'.
// 보이는 버튼은 이미지 원본 그대로 두고(폰트·색·위치 정확), 여기는 클릭만 받음 + 살짝 hover 표시.
function OverlayButton({ action }) {
  return (
    <Link
      to={action.to}
      aria-label={action.label}
      title={action.label}
      className="absolute rounded-[0.8cqw] transition-colors hover:bg-white/10"
      style={{ left: action.left, top: action.top, width: action.width, height: action.height }}
    />
  )
}

// 이미지 슬라이드: 이미지를 슬라이드(=무대) 전체에 깔고, 버튼을 슬라이드 기준 % 배치.
// 모든 배너가 무대와 같은 비율(≈3.56:1)이라 object-cover 크롭 없음 → 버튼 %가 곧 이미지 %.
function ImageSlide({ banner }) {
  return (
    <div
      className="@container relative h-full w-full overflow-hidden"
      style={{ backgroundColor: banner.bg }}
    >
      <img
        src={banner.image}
        alt={banner.alt ?? '컴친 배너'}
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden'
        }}
      />
      {banner.actions?.map((action, i) => (
        <OverlayButton key={i} action={action} />
      ))}
    </div>
  )
}

// 그라데이션 슬라이드
function GradientSlide({ banner }) {
  return (
    <div
      className={`flex h-full w-full flex-col justify-center gap-4 bg-gradient-to-br ${banner.gradient} p-10`}
    >
      <span className="w-fit rounded-full bg-black/30 px-3 py-1 text-xs font-bold tracking-wide text-white">
        {banner.badge}
      </span>
      <h2 className="text-3xl font-bold text-white drop-shadow sm:text-4xl">{banner.title}</h2>
      <p className="max-w-md text-white/90">{banner.subtitle}</p>
      <Link
        to="/builder"
        className="mt-2 w-fit rounded-md bg-white px-5 py-2.5 font-semibold text-gray-900 hover:bg-gray-100"
      >
        견적 맞추러 가기 →
      </Link>
    </div>
  )
}

export default function HeroBanner() {
  const total = banners.length
  // current: 0 ~ total. total = 끝에 붙인 "1번 복제본"(앞으로 자연스럽게 넘어가기 위함)
  const [current, setCurrent] = useState(0)
  const [animate, setAnimate] = useState(true)

  // 복제본을 끝에 붙인 슬라이드 목록
  const slides = [...banners, banners[0]]

  // 자동 롤링 (5초마다) — 항상 앞으로(+1)
  useEffect(() => {
    const timer = setInterval(() => setCurrent((c) => c + 1), 5000)
    return () => clearInterval(timer)
  }, [])

  // 복제본(마지막)까지 슬라이드한 뒤, 애니메이션 없이 진짜 1번(0)으로 순간이동
  const handleTransitionEnd = () => {
    if (current === total) {
      setAnimate(false)
      setCurrent(0)
    }
  }

  // 순간이동 직후 다음 프레임에 애니메이션 다시 켜기
  useEffect(() => {
    if (!animate) {
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setAnimate(true)),
      )
      return () => cancelAnimationFrame(id)
    }
  }, [animate])

  const activeIndex = current % total // 인디케이터 활성 표시 (복제본=0)
  const activeBanner = banners[activeIndex] // 블러 배경에 쓸 현재 슬라이드

  return (
    // 풀블리드 영역: 가운데 본문 폭에 배너를 두고, 좌우 남는 공간은 블러 배경으로 채움
    // (섹션 자체에는 overflow-hidden을 두지 않아 배너 그림자가 잘리지 않게 함)
    <section className="relative left-1/2 -mt-10 w-screen -translate-x-1/2">
      {/* 좌우를 채우는 블러 배경 (현재 슬라이드 이미지 확대 + 블러). 해상도 호환용 */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{ backgroundColor: activeBanner?.bg }}
        aria-hidden="true"
      >
        {activeBanner?.image && (
          <img
            src={activeBanner.image}
            alt=""
            className="h-full w-full scale-125 object-cover blur-2xl"
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden'
            }}
          />
        )}
      </div>

      {/* 실제 배너: 본문 컨테이너 폭(max-w-7xl)에 맞춰 좌우 끝 정렬 */}
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div
          className="relative aspect-[1936/544] w-full overflow-hidden rounded-2xl"
          style={cornerFeatherMask}
        >
          {/* 트랙: 슬라이드들을 가로로 늘어놓고 translateX로 이동 */}
          <div
            className={`flex h-full w-full ${
              animate ? 'transition-transform duration-500 ease-in-out' : ''
            }`}
            style={{ transform: `translateX(-${current * 100}%)` }}
            onTransitionEnd={handleTransitionEnd}
          >
            {slides.map((banner, i) => (
              <div key={i} className="h-full w-full shrink-0">
                {banner.type === 'image' ? (
                  <ImageSlide banner={banner} />
                ) : (
                  <GradientSlide banner={banner} />
                )}
              </div>
            ))}
          </div>

          {/* 인디케이터 (배너 하단 중앙) */}
          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                aria-label={`배너 ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all ${
                  i === activeIndex ? 'w-6 bg-white' : 'w-2 bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
