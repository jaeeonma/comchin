// 부품 표시용 공통 헬퍼 (컴포넌트 아님 — fast-refresh 위해 별도 파일)

export const formatPrice = (won) => `${won.toLocaleString('ko-KR')}원`

// 네이버 쇼핑 CDN(pstatic) 이미지는 ?type=f{size} 로 리사이즈된 작은 버전을 받을 수 있다.
// 작은 표시 크기의 썸네일에 쓰면 용량이 ~10배 줄어 로딩이 훨씬 빨라진다.
// (큰 사진은 원본을 쓰고, 로컬/기타 URL·이미 쿼리가 붙은 URL은 그대로 둔다.)
export function thumbUrl(url, size = 140) {
  if (!url || url.includes('?')) return url
  return /(^|\.)pstatic\.net\//.test(url) ? `${url}?type=f${size}` : url
}

// 카테고리별로 의미 있는 스펙만 골라 한 줄 요약
export function partSummary(part) {
  const s = part.specs ?? {}
  const t = []
  switch (part.category) {
    case 'CPU':
      if (s.cores) t.push(`${s.cores}코어${s.threads ? ` ${s.threads}스레드` : ''}`)
      if (part.socket) t.push(part.socket)
      if (part.tdp) t.push(`${part.tdp}W`)
      break
    case 'CPU_COOLER':
      if (s.type) t.push(s.type)
      if (s.radiator) t.push(s.radiator)
      else if (s.height) t.push(`높이 ${s.height}`)
      break
    case 'MEMORY':
      if (part.memoryType) t.push(part.memoryType)
      if (s.capacity) t.push(s.capacity)
      if (s.speed) t.push(s.speed)
      break
    case 'MOTHERBOARD':
      if (part.socket) t.push(part.socket)
      if (s.chipset) t.push(s.chipset)
      if (s.form) t.push(s.form)
      break
    case 'GPU':
      if (s.vram) t.push(s.vram)
      if (part.tdp) t.push(`${part.tdp}W`)
      break
    case 'SSD':
      if (s.capacity) t.push(s.capacity)
      if (s.interface) t.push(s.interface)
      break
    case 'HDD':
      if (s.capacity) t.push(s.capacity)
      if (s.rpm) t.push(`${s.rpm}rpm`)
      if (s.use) t.push(s.use)
      break
    case 'PSU':
      if (s.watt) t.push(`${s.watt}W`)
      if (s.rating) t.push(s.rating)
      break
    case 'CASE':
      if (s.form) t.push(s.form)
      if (s.gpuMax) t.push(`GPU ${s.gpuMax}`)
      break
    case 'OS':
      if (s.media) t.push(s.media)
      break
    default:
      break
  }
  return [part.brand, ...t].filter(Boolean).join(' · ')
}

// 미리보기용 상세 스펙 행 (아이콘 없이 라벨/값 텍스트)
const SPEC_LABELS = {
  cores: '코어',
  threads: '스레드',
  chipset: '칩셋',
  form: '폼팩터',
  vram: '그래픽 메모리',
  capacity: '용량',
  speed: '속도',
  watt: '정격출력',
  rating: '80PLUS',
  interface: '인터페이스',
  rpm: '회전수',
  use: '용도',
  gpuMax: '최대 GPU 길이',
  height: '높이',
  radiator: '라디에이터',
  type: '형태',
  edition: '에디션',
  media: '설치 미디어',
}

export function specEntries(part) {
  const s = part.specs || {}
  const rows = []
  if (part.socket) rows.push(['소켓', part.socket])
  if (part.memoryType) rows.push(['메모리 규격', part.memoryType])
  for (const [k, label] of Object.entries(SPEC_LABELS)) {
    const v = s[k]
    if (v == null || v === '') continue
    const value =
      k === 'watt' ? `${v}W` : k === 'cores' ? `${v}코어` : k === 'threads' ? `${v}스레드` : k === 'rpm' ? `${v}rpm` : String(v)
    rows.push([label, value])
  }
  if (part.tdp) rows.push(['소비전력', `${part.tdp}W`])
  return rows.slice(0, 6)
}
