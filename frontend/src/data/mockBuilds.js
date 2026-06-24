// 메인 페이지용 목업 데이터 (실제 데이터는 추후 백엔드 /api 연동으로 대체)

// 상단 배너 슬라이드
export const banners = [
  {
    id: 1,
    type: 'image',
    image: '/images/banners/hero-main-1.png',
    ratio: 1936 / 544, // 전체폭 3.56:1
    bg: '#eaf0fb', // 여백 색 (밝은 배너)
    gradient: 'from-slate-200 to-blue-200', // 이미지 로드 전/실패 시 폴백
    // 이미지 속 버튼 위에 덮는 투명 클릭 영역(%) — 이미지 기준 측정값
    actions: [
      { label: '견적 바로 시작하기', to: '/builder', left: '20.5%', top: '78.0%', width: '17.5%', height: '8.0%' },
      { label: '추천PC 보러가기', to: '/builder', left: '42.0%', top: '78.0%', width: '13.0%', height: '8.0%' },
    ],
  },
  {
    id: 2,
    type: 'image',
    image: '/images/banners/hero-main-2.png',
    ratio: 1952 / 544, // 전체폭 3.59:1
    bg: '#0a0b14', // 여백 색 (다크 게이밍 배너)
    gradient: 'from-slate-800 to-indigo-950',
    actions: [
      { label: '견적 바로 시작하기', to: '/builder', left: '8.0%', top: '67.0%', width: '20.0%', height: '8.0%' },
      { label: '추천 PC 둘러보기', to: '/builder', left: '30.0%', top: '67.0%', width: '17.0%', height: '8.0%' },
    ],
  },
  {
    id: 3,
    type: 'image',
    image: '/images/banners/hero-main-3.png',
    ratio: 1952 / 544, // 전체폭 3.59:1
    bg: '#efece6', // 여백 색 (밝은 우드 배너)
    gradient: 'from-slate-200 to-stone-200',
    actions: [
      { label: '지금 견적 알아보기', to: '/builder', left: '7.0%', top: '77.5%', width: '14.0%', height: '7.5%' },
      { label: '조립 알아보기', to: '/builder', left: '23.0%', top: '77.5%', width: '14.0%', height: '7.5%' },
    ],
  },
  {
    id: 4,
    type: 'image',
    image: '/images/banners/hero-main-4.png',
    ratio: 1952 / 544, // 전체폭 3.59:1
    bg: '#e9ecf5', // 여백 색 (밝은 배너)
    gradient: 'from-slate-200 to-indigo-200',
    actions: [
      { label: '견적 상담 신청하기', to: '/builder', left: '7.0%', top: '76.0%', width: '15.0%', height: '8.0%' },
      { label: '서비스 알아보기', to: '/builder', left: '21.0%', top: '76.0%', width: '13.0%', height: '8.0%' },
    ],
  },
]

// 카테고리 바로가기 (icon은 이미지 로드 실패 시 폴백)
export const categories = [
  { key: 'gaming', label: '게이밍 PC', icon: '🎮', image: '/images/categories/gaming.png' },
  { key: 'workstation', label: '작업용 PC', icon: '🖌️', image: '/images/categories/workstation.png' },
  { key: 'highend', label: '하이엔드', icon: '💎', image: '/images/categories/highend.png' },
  { key: 'office', label: '사무용', icon: '🏢', image: '/images/categories/office.png' },
  { key: 'cpu', label: 'CPU', icon: '🧠', image: '/images/categories/cpu.png' },
  { key: 'gpu', label: '그래픽카드', icon: '🎞️', image: '/images/categories/gpu.png' },
  { key: 'memory', label: '메모리', icon: '📦', image: '/images/categories/memory.png' },
  { key: 'diy', label: '직접 견적', icon: '🛠️', image: '/images/categories/diy.png' },
  { key: 'support', label: '1:1 상담', icon: '💬', image: null },
]

// 추천 견적 카드 (사진·사양은 상품 카드와 동일한 형식 + 상세 페이지 연결용 구성표/설명)
// tag(한글) → category(상세 페이지/리뷰용) 매핑
const TAG_CATEGORY = { 게이밍: 'gaming', 작업용: 'workstation', 하이엔드: 'highend', 사무용: 'office' }

function rec(o) {
  return {
    id: o.id,
    category: TAG_CATEGORY[o.tag],
    name: o.name,
    subtitle: o.subtitle,
    tag: o.tag,
    image: o.image,
    cpu: o.cpu,
    gpu: o.gpu,
    ram: o.ram,
    ssd: o.ssd,
    price: o.price,
    discount: o.discount,
    reviews: o.reviews,
    specs: [
      ['CPU', o.cpuFull ?? o.cpu],
      ['쿨러', o.cooler],
      ['메인보드', o.mb],
      ['메모리', o.ram],
      ['그래픽카드', o.gpuFull ?? o.gpu],
      ['SSD', o.ssd],
      ['파워', o.psu],
      ['케이스', o.case],
    ],
    description: o.description,
  }
}

export const recommendedBuilds = [
  rec({
    id: 'b1', name: '가성비 롤 입문 PC', subtitle: '롤·오버워치 입문에 딱 맞는 가성비', tag: '게이밍',
    image: '/images/builds/gaming-3.jpg', price: 590000, discount: 8, reviews: 5,
    cpu: 'AMD 라이젠5 8500G', gpu: '내장 라데온 그래픽', ram: 'DDR5 16GB', ssd: 'NVMe 500GB',
    cpuFull: 'AMD 라이젠5 8500G (6코어 12스레드)', cooler: '기본 공랭 쿨러', mb: 'AMD A620 칩셋 메인보드',
    gpuFull: '라데온 내장 그래픽', psu: '500W 80PLUS 브론즈', case: '미니타워 (M-ATX)',
    description: '내장 그래픽으로 롤·오버워치 등 인기 온라인 게임을 가볍게 즐기기 좋은 입문용 가성비 구성입니다.',
  }),
  rec({
    id: 'b2', name: '배그 240프레임 PC', subtitle: '배틀그라운드를 240프레임으로', tag: '게이밍',
    image: '/images/builds/gaming-5.jpg', price: 1190000, discount: 12, reviews: 7,
    cpu: '인텔 코어i5-14400F', gpu: 'RTX 4060 8GB', ram: 'DDR5 16GB', ssd: 'NVMe 1TB',
    cpuFull: '인텔 코어i5-14400F (10코어 16스레드)', cooler: '120mm 공랭 쿨러', mb: '인텔 B760 칩셋 메인보드',
    gpuFull: 'GeForce RTX 4060 8GB', psu: '600W 80PLUS 브론즈', case: '강화유리 미들타워',
    description: '배틀그라운드를 높은 프레임으로 쾌적하게 즐기도록 잡은 인기 게이밍 구성입니다.',
  }),
  rec({
    id: 'b3', name: '영상편집 워크스테이션', subtitle: 'FHD~4K 영상편집을 위한 작업용', tag: '작업용',
    image: '/images/builds/workstation-4.jpg', price: 1890000, discount: 5, reviews: 4,
    cpu: 'AMD 라이젠7 7700', gpu: 'RTX 4070 Super 12GB', ram: 'DDR5 32GB', ssd: 'NVMe 2TB',
    cpuFull: 'AMD 라이젠7 7700 (8코어 16스레드)', cooler: '240mm 수랭 쿨러', mb: 'AMD B650 칩셋 메인보드',
    gpuFull: 'GeForce RTX 4070 Super 12GB', psu: '750W 80PLUS 골드', case: '미들타워 (ATX)',
    description: '프리미어·다빈치 등으로 영상 편집·인코딩을 빠르게 처리하는 작업용 워크스테이션 구성입니다.',
  }),
  rec({
    id: 'b4', name: '하이엔드 RGB 게이밍', subtitle: 'RGB 감성과 고성능을 동시에', tag: '하이엔드',
    image: '/images/builds/highend-1.jpg', price: 3290000, discount: 7, reviews: 5,
    cpu: '인텔 코어i7-14700K', gpu: 'RTX 4080 Super 16GB', ram: 'DDR5 32GB', ssd: 'NVMe 2TB',
    cpuFull: '인텔 코어i7-14700K (20코어 28스레드)', cooler: '360mm 수랭 쿨러', mb: '인텔 Z790 칩셋 메인보드',
    gpuFull: 'GeForce RTX 4080 Super 16GB', psu: '1000W 80PLUS 골드', case: 'RGB 강화유리 미들타워',
    description: '화려한 RGB 감성과 4K 고주사율 성능을 모두 잡은 하이엔드 게이밍 구성입니다.',
  }),
  rec({
    id: 'b5', name: '사무용 미니 PC', subtitle: '책상 공간을 아끼는 미니 사무용', tag: '사무용',
    image: '/images/builds/office-1.jpg', price: 490000, discount: 10, reviews: 6,
    cpu: '인텔 코어i3-14100', gpu: '내장 UHD 730', ram: 'DDR4 8GB', ssd: 'NVMe 256GB',
    cpuFull: '인텔 코어i3-14100 (4코어 8스레드)', cooler: '저소음 기본 쿨러', mb: '인텔 H610 칩셋 메인보드',
    gpuFull: '인텔 UHD 730 내장 그래픽', psu: '슬림 400W', case: '초소형 미니PC 케이스',
    description: '문서·웹·인강용으로 딱 맞는 초소형 사무용 미니PC입니다. 책상 위 공간을 거의 차지하지 않습니다.',
  }),
  rec({
    id: 'b6', name: 'AI 학습용 빌드', subtitle: 'AI·딥러닝 학습을 위한 대용량 구성', tag: '작업용',
    image: '/images/builds/workstation-9.jpg', price: 4590000, discount: 3, reviews: 3,
    cpu: 'AMD 라이젠9 7900X', gpu: 'RTX 4090 24GB', ram: 'DDR5 64GB', ssd: 'NVMe 2TB',
    cpuFull: 'AMD 라이젠9 7900X (12코어 24스레드)', cooler: '360mm 수랭 쿨러', mb: 'AMD X670 칩셋 메인보드',
    gpuFull: 'GeForce RTX 4090 24GB', psu: '1200W 80PLUS 플래티넘', case: '미들타워 (ATX)',
    description: 'RTX 4090과 64GB 메모리로 AI·딥러닝 학습과 대용량 데이터 작업을 빠르게 처리하는 구성입니다.',
  }),
  rec({
    id: 'b7', name: '발로란트 고주사율 PC', subtitle: '발로란트 고주사율을 위한 게이밍', tag: '게이밍',
    image: '/images/builds/gaming-6.jpg', price: 1490000, discount: 9, reviews: 4,
    cpu: '인텔 코어i5-14600K', gpu: 'RTX 4060 Ti 16GB', ram: 'DDR5 16GB', ssd: 'NVMe 1TB',
    cpuFull: '인텔 코어i5-14600K (14코어 20스레드)', cooler: '240mm 수랭 쿨러', mb: '인텔 B760 칩셋 메인보드',
    gpuFull: 'GeForce RTX 4060 Ti 16GB', psu: '750W 80PLUS 브론즈', case: '강화유리 미들타워',
    description: '발로란트 등 경쟁 게임을 초고주사율로 즐기려는 분께 맞춘 게이밍 구성입니다.',
  }),
  rec({
    id: 'b8', name: '미니 ITX 감성 PC', subtitle: '작고 감각적인 화이트 감성 빌드', tag: '하이엔드',
    image: '/images/builds/gaming-2.jpg', price: 2190000, discount: 6, reviews: 3,
    cpu: 'AMD 라이젠7 7800X3D', gpu: 'RTX 4070 12GB', ram: 'DDR5 32GB', ssd: 'NVMe 1TB',
    cpuFull: 'AMD 라이젠7 7800X3D (8코어 16스레드)', cooler: '240mm 수랭 쿨러 (화이트)', mb: 'AMD B650 칩셋 메인보드',
    gpuFull: 'GeForce RTX 4070 12GB', psu: '750W 80PLUS 골드', case: '화이트 강화유리 케이스',
    description: '게이밍 최강 가성비 7800X3D를 작고 감각적인 화이트 케이스에 담은 감성 하이엔드 구성입니다.',
  }),
]
