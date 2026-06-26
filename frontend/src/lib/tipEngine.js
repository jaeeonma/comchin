// 컴친 팁 규칙 엔진 (AI 아님 — 부품/구성 데이터 기반 규칙).
// 상품마다 스펙이 다르면 파생되는 팁도 달라지도록, 데이터에서 최대한 많은 팁을 끌어낸다.
// 상황(완본체/부품/직접 견적 상호작용)에 맞는 팁 배열을 만들어 TipCard 에 넘긴다.
import { GENERAL_TIPS, CATEGORY_TIPS, PART_TIPS, BUILDER_TIPS } from '../data/tips'
import { prebuiltPCs } from '../data/prebuiltPCs'

const formatPrice = (won) => `${(won ?? 0).toLocaleString('ko-KR')}원`

// 프론트 카테고리 키 → 한글 라벨
const KO_OF = {
  cpu: 'CPU', cpuCooler: 'CPU 쿨러', memory: '메모리', motherboard: '메인보드',
  gpu: '그래픽카드', ssd: 'SSD', hdd: 'HDD', psu: '파워', case: '케이스', os: '윈도우',
}

// ── 공통 유틸 ──────────────────────────────────────────────
function hash(str) {
  let h = 0
  for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}
function pickSome(pool, n, seed) {
  if (!pool || pool.length === 0) return []
  const start = seed % pool.length
  const out = []
  for (let i = 0; i < Math.min(n, pool.length); i++) out.push(pool[(start + i) % pool.length])
  return out
}
function dedupe(tips) {
  const seen = new Set()
  return tips.filter((t) => t && t.text && !seen.has(t.text) && seen.add(t.text))
}
const numMatch = (re, str) => {
  const m = String(str ?? '').match(re)
  return m ? parseInt(m[1], 10) : null
}
// "1TB" "32GB" "DDR5 32GB (16GB×2)" → GB 숫자(가장 큰 총량 우선)
function capacityGB(str) {
  const s = String(str ?? '')
  const tb = s.match(/(\d+(?:\.\d+)?)\s*TB/i)
  if (tb) return Math.round(parseFloat(tb[1]) * 1024)
  const gb = s.match(/(\d+)\s*GB/i)
  return gb ? parseInt(gb[1], 10) : null
}
const wattFrom = (str) => numMatch(/(\d{3,4})\s*w/i, str)
const coresFrom = (str) => numMatch(/(\d+)\s*코어/, str)

// ── PSU 용량(W) 추출 ──
export function wattOf(psu) {
  if (!psu) return null
  const fromSpec = psu.specs?.wattage ?? psu.specs?.watt
  if (fromSpec) {
    const n = parseInt(String(fromSpec).replace(/[^\d]/g, ''), 10)
    if (n) return n
  }
  return wattFrom(psu.name)
}

function tdpSum(selected) {
  return Object.values(selected).reduce((s, p) => s + (p?.tdp ?? 0), 0)
}
function recommendedPsu(totalTdp) {
  return totalTdp > 0 ? Math.ceil((totalTdp * 1.4) / 50) * 50 : 0
}

// 대략적 등급(균형 힌트용, 정성적)
function gpuTier(name = '') {
  const n = name.toLowerCase()
  if (/(5090|4090)/.test(n)) return 5
  if (/(5080|5070\s*ti|4080|9070\s*xt)/.test(n)) return 4
  if (/(5070|4070|5060\s*ti|9070)/.test(n)) return 3
  if (/(5060|4060|3060|3050|1650)/.test(n)) return 2
  return 1
}
function cpuTier(name = '') {
  const n = name.toLowerCase()
  if (/(스레드리퍼|threadripper|i9|울트라\s*9|ultra\s*9|9950|9900)/.test(n)) return 5
  if (/(i7|울트라\s*7|ultra\s*7|9700|9800x3d|7800x3d|265k)/.test(n)) return 4
  if (/(i5|울트라\s*5|ultra\s*5|7500|7600|9600|245k|14400|14500|12400)/.test(n)) return 3
  if (/(i3|라이젠\s*3|ryzen\s*3|n100|n97|n305)/.test(n)) return 2
  return 3
}

// GPU 등급 → 어울리는 해상도 문구
function gpuResolution(name = '') {
  const t = gpuTier(name)
  if (t >= 5) return '4K 고주사율'
  if (t === 4) return 'QHD 고주사율~4K'
  if (t === 3) return 'QHD 고주사율'
  if (t === 2) return 'FHD 고주사율(필요 시 QHD)'
  return 'FHD 표준'
}
// GPU 등급 → 권장 파워(대략, W)
function recommendedPsuForGpu(name = '') {
  const t = gpuTier(name)
  return t >= 5 ? 1000 : t === 4 ? 850 : t === 3 ? 750 : t === 2 ? 650 : 550
}
// 이름에서 GPU VRAM(GB) 추출
function vramOf(part) {
  return capacityGB(part?.specs?.vram) ?? capacityGB(part?.name)
}

// 이름 패턴 판별 (정성적 힌트용)
const isX3D = (name = '') => /x3d/i.test(name)
const isIntelK = (name = '') => /\b\d{3,5}ks?f?\b/i.test(name) && /k/i.test(name) && /인텔|intel|코어|core|울트라/i.test(name)
const isNoIGPU = (name = '') => /\b\d{3,5}kf\b|\b\d{3,5}f\b/i.test(name) // 인텔 F/KF: 내장그래픽 없음
const hasAPU = (name = '') => /\b\d{3,4}g\b|내장|라데온\s*7\d0m|벙커|apu/i.test(name) // 라이젠 G 시리즈 등 내장 강함

// ===== 완본체(PC) 상세용 팁 =====
// pc.specs = [['CPU', ...],['쿨러',...],['메인보드',...],['메모리',...],['그래픽카드',...],['SSD',...],['파워',...],['케이스',...]]
export function buildPcTips(pc) {
  if (!pc) return GENERAL_TIPS
  const seed = hash(pc.id)
  const tips = []
  // 이 구성만의 포인트(데이터에 적어둔 맞춤 팁) — 맨 앞에
  if (pc.point) tips.push({ tag: '포인트', text: pc.point })

  // 구성표를 라벨→값 맵으로
  const spec = {}
  for (const [k, v] of pc.specs ?? []) spec[k] = v
  const cpu = spec['CPU'] || pc.cpu || ''
  const gpu = spec['그래픽카드'] || pc.gpu || ''
  const ram = spec['메모리'] || pc.ram || ''
  const cooler = spec['쿨러'] || ''
  const psu = spec['파워'] || ''
  const caseStr = spec['케이스'] || ''
  const ssd = spec['SSD'] || pc.ssd || ''

  // GPU → 해상도 적합성
  if (gpu) {
    tips.push({ tag: '해상도', text: `${gpu.split('(')[0].trim()} 구성이라 ${gpuResolution(gpu)} 게이밍에 어울리는 편이에요.` })
    if (gpuTier(gpu) >= 4) tips.push({ tag: '전력', text: `상위 그래픽카드라 전력·발열이 큽니다. 이 구성의 파워(${psu || '기본 파워'})와 케이스 통풍이 받쳐주는지 함께 보세요.` })
  }
  // CPU → 코어/특성
  const cores = coresFrom(cpu)
  if (cores) {
    if (cores >= 12) tips.push({ tag: '성능', text: `${cores}코어 CPU라 영상 편집·렌더링·다중 작업 같은 멀티코어 작업에 강한 편이에요.` })
    else if (cores <= 6) tips.push({ tag: '성능', text: `${cores}코어 구성이라 게임·일반 작업엔 충분하지만, 무거운 멀티태스킹은 상위 CPU가 더 유리해요.` })
  }
  if (isX3D(cpu)) tips.push({ tag: '게임', text: '게임 특화 캐시(X3D) CPU라, 같은 등급 대비 게임 프레임에서 강점을 보이는 경향이 있어요.' })

  // 메모리 → 용량
  const ramGB = capacityGB(ram)
  if (ramGB) {
    if (ramGB >= 64) tips.push({ tag: '메모리', text: `${ramGB}GB 대용량 메모리라 대형 프로젝트·가상머신·다중 작업에도 여유로운 편이에요.` })
    else if (ramGB >= 32) tips.push({ tag: '메모리', text: `${ramGB}GB 메모리라 게임은 물론 가벼운 작업 멀티태스킹까지 무난합니다.` })
    else tips.push({ tag: '메모리', text: `${ramGB}GB 메모리예요. 일반 게임·사무엔 충분하지만, 작업을 늘릴 계획이면 32GB 업그레이드도 쉬워요.` })
  }
  // 쿨러 → 발열 대응
  if (cooler) {
    if (/수랭|수냉|aio|라디|360|커스텀/i.test(cooler)) tips.push({ tag: '쿨러', text: `${cooler} 구성이라 고발열 CPU의 온도·소음 관리에 유리한 편이에요.` })
    else if (/공랭|기본/i.test(cooler) && cpuTier(cpu) >= 4) tips.push({ tag: '주의', text: '고성능 CPU에 비해 쿨러가 기본형이에요. 풀로드가 잦다면 상위 쿨러도 고려해 보세요.' })
  }
  // 파워 → 여유
  const pw = wattFrom(psu)
  if (pw && gpu) {
    const need = recommendedPsuForGpu(gpu)
    tips.push(
      pw >= need
        ? { tag: '전력', text: `파워 ${pw}W로 이 그래픽카드(권장 약 ${need}W 이상)에 여유가 있는 편이에요.` }
        : { tag: '주의', text: `파워 ${pw}W는 이 그래픽카드 권장(약 ${need}W)에 빠듯할 수 있어요. 업그레이드 시 파워도 함께 보세요.` },
    )
  }
  // 케이스 → 외관/특성
  if (/화이트|white/i.test(caseStr)) tips.push({ tag: '디자인', text: '화이트 케이스 구성이라 책상 위 감성을 중시하는 분께 잘 어울려요.' })
  if (/커스텀\s*수냉|하드튜브|워터블록/i.test(caseStr + cooler)) tips.push({ tag: '특징', text: '커스텀 수냉 구성이라 쿨링 성능과 외관 감성이 강점이지만, 유지관리 난도는 조금 높은 편이에요.' })
  if (/빅타워|풀타워|e-atx/i.test(caseStr)) tips.push({ tag: '확장성', text: '큰 케이스라 쿨링·확장 여유가 넉넉합니다. 책상 공간은 미리 확인하세요.' })
  if (/미니|슬림|sff|m-atx/i.test(caseStr)) tips.push({ tag: '공간', text: '작은 케이스라 공간을 아끼기 좋아요. 다만 큰 그래픽카드·쿨러 호환은 확인이 필요할 수 있어요.' })
  // SSD
  const ssdGB = capacityGB(ssd)
  if (ssdGB && ssdGB <= 512) tips.push({ tag: '저장장치', text: `${ssd} 구성이에요. 게임·작업 파일이 크다면 1TB 이상으로 늘리거나 추가 저장장치를 고려하세요.` })

  // 카테고리 특징 + 가격 + 균형 + 일반
  tips.push(...pickSome(CATEGORY_TIPS[pc.category], 3, seed))
  if (pc.price >= 4000000) tips.push({ tag: '가격', text: `고가 구성이에요(${formatPrice(pc.price)}). 성능 여유는 크지만, 본인 용도에 과하지 않은지도 살펴보세요.` })
  else if (pc.price <= 900000) tips.push({ tag: '가성비', text: `합리적인 가격대(${formatPrice(pc.price)})예요. 가성비를 중시한다면 좋은 선택이 될 수 있어요.` })
  else tips.push({ tag: '가격', text: `${formatPrice(pc.price)} 구성이에요. 같은 가격대 다른 모델과 CPU·GPU를 비교해 보는 걸 추천해요.` })
  if (cpu && gpu) {
    const diff = gpuTier(gpu) - cpuTier(cpu)
    if (diff >= 2) tips.push({ tag: '성능', text: 'GPU 비중이 높은 구성이에요. 고해상도·고화질 게임에 유리한 편입니다.' })
    else if (diff <= -2) tips.push({ tag: '성능', text: 'CPU 비중이 높은 구성이에요. 작업·멀티태스킹이나 프레임 안정성에 유리한 편입니다.' })
    else tips.push({ tag: '균형', text: 'CPU와 GPU 등급이 비교적 균형 잡힌 구성이에요. 두루 쓰기 무난합니다.' })
  }
  tips.push(...pickSome(GENERAL_TIPS, 2, seed + 7))
  return dedupe(tips).slice(0, 12)
}

// ===== 부품 상세용 팁 =====
export function buildPartTips(part) {
  if (!part) return GENERAL_TIPS
  const seed = hash(part.id)
  const tips = []
  const s = part.specs ?? {}
  const name = part.name ?? ''

  switch (part.category) {
    case 'CPU': {
      const cores = s.cores ?? coresFrom(name)
      if (cores) tips.push({ tag: '성능', text: `${cores}코어${s.threads ? ` ${s.threads}스레드` : ''} CPU예요. ${cores >= 12 ? '멀티코어 작업(영상·렌더·다중작업)에 강한 편' : cores >= 8 ? '게임·작업을 두루 소화하기 좋은 편' : '게임·일반 작업에 적합한 편'}이에요.` })
      if (part.socket) tips.push({ tag: '호환성', text: `소켓은 ${part.socket}이에요. 같은 ${part.socket} 소켓 메인보드와 맞춰야 장착됩니다.` })
      if (part.memoryType) tips.push({ tag: '호환성', text: `${part.memoryType} 메모리를 쓰는 세대예요. 메인보드·메모리도 ${part.memoryType}로 맞추세요.` })
      if (isX3D(name)) tips.push({ tag: '게임', text: '게임 특화 캐시(X3D) 모델이라 게임 프레임에서 강점을 보이는 경향이 있어요.' })
      if (isIntelK(name)) tips.push({ tag: '쿨러', text: '오버클럭 가능(K) 모델이라 발열이 큰 편이에요. 기본 쿨러보다 상위 공랭·수랭을 권장합니다.' })
      if (isNoIGPU(name)) tips.push({ tag: '주의', text: '내장 그래픽이 없는 모델(F)이에요. 별도 그래픽카드가 반드시 필요합니다.' })
      else if (hasAPU(name)) tips.push({ tag: '특징', text: '내장 그래픽이 강한 모델이라, 별도 그래픽카드 없이도 사무·가벼운 작업이 가능해요.' })
      if (part.tdp >= 120) tips.push({ tag: '전력', text: `소비전력 ${part.tdp}W로 발열이 있는 편이에요. 쿨러 성능과 케이스 통풍을 함께 챙기세요.` })
      break
    }
    case 'GPU': {
      const vram = vramOf(part)
      tips.push({ tag: '해상도', text: `${name.split('(')[0].trim() || '이 그래픽카드'}는 ${gpuResolution(name)} 게이밍에 어울리는 편이에요.` })
      if (vram) tips.push({ tag: '메모리', text: `VRAM ${vram}GB예요. ${vram >= 16 ? '고해상도·고텍스처·일부 작업에도 여유가 있는 편' : vram >= 12 ? 'QHD 고옵션까지 무난한 편' : 'FHD~QHD에 적합한 편'}이에요.` })
      if (vram && vram <= 8) tips.push({ tag: '주의', text: 'VRAM 8GB는 일부 최신 게임의 고텍스처·고해상도 옵션에선 빠듯할 수 있어요.' })
      const need = recommendedPsuForGpu(name)
      tips.push({ tag: '전력', text: `이 GPU엔 약 ${need}W 이상 파워를 권장해요. 보조전원 커넥터 종류도 확인하세요.` })
      if (part.tdp >= 300) tips.push({ tag: '주의', text: `소비전력 ${part.tdp}W로 큰 편이에요. 파워 여유와 케이스 통풍이 중요합니다.` })
      if (/rtx/i.test(name)) tips.push({ tag: '기능', text: 'RTX 계열이라 레이트레이싱·DLSS 업스케일링을 지원해요. 최신 게임에서 체감 요소가 됩니다.' })
      if (/rx\s*9070|라데온|radeon/i.test(name)) tips.push({ tag: '특징', text: '라데온 계열이라 같은 가격대에서 VRAM 용량이 넉넉한 경우가 많아요.' })
      tips.push({ tag: '호환성', text: '큰 그래픽카드는 케이스에 안 들어갈 수 있어요. 케이스의 장착 가능 길이를 확인하세요.' })
      break
    }
    case 'MEMORY': {
      const cap = capacityGB(s.capacity) ?? capacityGB(name)
      if (part.memoryType) tips.push({ tag: '호환성', text: `${part.memoryType} 규격이에요. 메인보드가 같은 ${part.memoryType}를 지원해야 꽂힙니다.` })
      if (cap) tips.push({ tag: '용량', text: `${cap}GB 구성이에요. ${cap >= 64 ? '대용량 작업·가상머신까지 여유로운 편' : cap >= 32 ? '게임·가벼운 작업 멀티태스킹에 넉넉한 편' : '일반 사용엔 충분하고, 작업이 많다면 32GB 이상 권장'}이에요.` })
      if (s.speed) tips.push({ tag: '성능', text: `속도 ${s.speed}예요. 메인보드·CPU가 지원하는 속도 범위인지 확인하면 제 성능을 냅니다.` })
      tips.push({ tag: '팁', text: '같은 용량이면 1개보다 2개로 나눠(듀얼채널) 꽂는 게 성능에 유리해요.' })
      tips.push({ tag: '주의', text: '2026년은 메모리 가격이 높은 편이라, 필요한 용량을 합리적으로 맞추는 걸 권장해요.' })
      break
    }
    case 'SSD': {
      const cap = capacityGB(s.capacity) ?? capacityGB(name)
      if (cap) tips.push({ tag: '용량', text: `${s.capacity ?? `${cap >= 1024 ? cap / 1024 + 'TB' : cap + 'GB'}`} 용량이에요. ${cap >= 1024 ? '게임·작업 파일을 넉넉히 담기 좋은 편' : 'OS·주요 프로그램용으론 충분하지만, 게임을 많이 깔면 빠듯할 수 있어요'}.` })
      if (s.interface) tips.push({ tag: '성능', text: `${s.interface} 인터페이스예요. ${/nvme|m\.?2|pcie/i.test(s.interface) ? 'SATA SSD보다 훨씬 빠른 편이라 부팅·로딩이 쾌적합니다.' : 'SATA 방식이라 NVMe보단 느리지만 체감 부팅 속도는 충분해요.'}` })
      else if (/nvme|m\.?2/i.test(name)) tips.push({ tag: '성능', text: 'NVMe(M.2) 방식이라 SATA SSD보다 빠릅니다. 메인보드 M.2 슬롯을 확인하세요.' })
      tips.push({ tag: '관리', text: 'SSD는 여유 공간을 조금 남겨두면 수명·성능에 좋아요. 끝까지 채우지 마세요.' })
      break
    }
    case 'HDD': {
      const cap = capacityGB(s.capacity) ?? capacityGB(name)
      if (cap) tips.push({ tag: '용량', text: `${s.capacity ?? `${Math.round(cap / 1024)}TB`} 대용량 보관용이에요. 사진·영상·백업을 담기 좋습니다.` })
      if (s.rpm) tips.push({ tag: '성능', text: `${s.rpm}rpm이에요. 회전수가 높을수록 빠르지만, 체감 속도는 SSD가 훨씬 앞섭니다.` })
      tips.push({ tag: '팁', text: 'OS·프로그램은 SSD, 대용량 보관은 HDD로 나누면 비용·속도 균형이 좋아요.' })
      tips.push({ tag: '관리', text: 'HDD는 충격에 약해요. 케이스 내부에 단단히 고정해 쓰는 걸 권장합니다.' })
      break
    }
    case 'PSU': {
      const w = wattOf(part)
      if (w) tips.push({ tag: '전력', text: `${w}W 파워예요. 보통 전체 소비전력의 1.3~1.5배 용량을 권장하니, 구성 합계와 비교해 보세요.` })
      if (s.rating) tips.push({ tag: '효율', text: `80PLUS ${s.rating} 등급이에요. 등급이 높을수록 효율과 발열 면에서 유리합니다.` })
      if (/모듈러|modular/i.test(name)) tips.push({ tag: '편의', text: '모듈러 방식이라 필요한 케이블만 연결해 선정리가 깔끔해요.' })
      tips.push({ tag: '호환성', text: '상위 그래픽카드는 전용 보조전원 커넥터가 필요해요. 커넥터 종류·개수를 확인하세요.' })
      tips.push({ tag: '팁', text: '파워는 오래 쓰는 부품이라, 약간 넉넉하고 검증된 제품이 다음 업그레이드에도 편해요.' })
      break
    }
    case 'CASE': {
      if (s.form) tips.push({ tag: '호환성', text: `${s.form} 규격이에요. 메인보드 폼팩터(ATX/M-ATX/ITX)가 케이스와 맞아야 합니다.` })
      if (s.gpuMax) tips.push({ tag: '호환성', text: `그래픽카드 최대 ${s.gpuMax}까지 장착돼요. 큰 GPU를 쓸 계획이면 길이를 꼭 비교하세요.` })
      if (/화이트|white/i.test(name)) tips.push({ tag: '디자인', text: '화이트 케이스라 밝은 책상 분위기에 잘 어울려요. 내부 부품도 화이트로 맞추면 통일감이 좋아요.' })
      if (/강화유리|파노라마|글라스/i.test(name)) tips.push({ tag: '특징', text: '강화유리 구성이라 내부 RGB·부품이 보여 튜닝 감성에 좋아요.' })
      tips.push({ tag: '쿨링', text: '팬 장착 공간과 통풍이 좋은 케이스가 온도 관리에 유리해요. 먼지 필터가 있으면 청소도 편합니다.' })
      break
    }
    case 'MOTHERBOARD': {
      if (part.socket) tips.push({ tag: '호환성', text: `소켓 ${part.socket}이에요. 같은 ${part.socket} CPU만 장착됩니다.` })
      if (part.memoryType) tips.push({ tag: '호환성', text: `${part.memoryType} 메모리 전용이에요. 메모리도 ${part.memoryType}로 맞추세요.` })
      if (s.chipset) {
        const c = String(s.chipset).toUpperCase()
        const note = /^Z|X6|X7|X8|TRX/.test(c) ? '오버클럭·확장에 유리한 상위 칩셋' : /^B/.test(c) ? '가성비 좋은 메인스트림 칩셋' : /^[HA]/.test(c) ? '보급형 칩셋(기본 기능 위주)' : '메인보드 칩셋'
        tips.push({ tag: '칩셋', text: `${s.chipset} — ${note}이에요. 용도에 과하거나 부족하지 않은지 보세요.` })
      }
      if (s.form) tips.push({ tag: '확장성', text: `${s.form} 폼팩터예요. 케이스 크기와 맞춰야 하고, 보드가 클수록 슬롯·포트 확장이 넉넉한 편이에요.` })
      tips.push({ tag: '전력', text: '고성능 CPU를 쓸수록 전원부(VRM)가 튼튼한 보드가 안정적이에요.' })
      break
    }
    case 'CPU_COOLER': {
      const type = s.type ?? (/수랭|수냉|aio/i.test(name) ? '수랭' : /공랭/i.test(name) ? '공랭' : null)
      if (type) tips.push({ tag: '형태', text: `${type} 쿨러예요. ${/수랭|수냉/i.test(type) ? '고발열 CPU의 온도·소음 관리에 유리한 편' : '설치가 간단하고 가성비가 좋은 편'}이에요.` })
      if (s.radiator) tips.push({ tag: '성능', text: `${s.radiator} 라디에이터라 큰 쿨링 용량을 가져요. 케이스가 이 라디에이터를 지원하는지 확인하세요.` })
      if (s.height) tips.push({ tag: '호환성', text: `높이 ${s.height}예요. 케이스의 쿨러 높이 제한보다 작아야 들어갑니다.` })
      tips.push({ tag: '팁', text: '조용함을 원하면 큰 공랭·수랭이, 가성비를 원하면 검증된 공랭이 무난해요.' })
      break
    }
    case 'OS': {
      if (s.edition) tips.push({ tag: '에디션', text: `${s.edition} 에디션이에요. 일반 사용은 홈으로 충분하고, 프로는 일부 업무·고급 기능이 더해져요.` })
      if (s.media) tips.push({ tag: '설치', text: `${s.media} 설치 미디어예요. 처음 조립이라 OS가 없다면 함께 챙기면 편합니다.` })
      break
    }
    default:
      break
  }

  // 가격 한마디 + 종류별 풀에서 보충
  tips.push({ tag: '가격', text: `현재가 ${formatPrice(part.price)}예요. 입력 시점 기준이라 실제 시세와 다를 수 있어요.` })
  tips.push(...pickSome(PART_TIPS[part.category], 4, seed))
  return dedupe(tips).slice(0, 12)
}

// ===== 부품 비교용: 같은 칸 부품을 교체할 때 "이전 ↔ 새 부품" 차이 =====
function compareParts(category, part, prev) {
  const out = []
  if (!prev || prev.id === part.id) return out
  const dPrice = (part.price ?? 0) - (prev.price ?? 0)
  const priceTxt = dPrice === 0 ? '가격은 같고' : dPrice > 0 ? `${formatPrice(dPrice)} 비싸지고` : `${formatPrice(-dPrice)} 저렴해지고`
  const dTdp = (part.tdp ?? 0) - (prev.tdp ?? 0)
  const powerTxt = dTdp ? `, 소비전력은 ${dTdp > 0 ? '+' : ''}${dTdp}W` : ''
  out.push({ tag: '비교', text: `이전 부품과 비교하면 ${priceTxt}${powerTxt} 바뀌어요.` })

  switch (category) {
    case 'cpu': {
      const dc = (coresFrom(part.name) ?? part.specs?.cores ?? 0) - (coresFrom(prev.name) ?? prev.specs?.cores ?? 0)
      if (dc) out.push({ tag: '성능', text: `코어 수가 ${dc > 0 ? `+${dc}코어 늘어` : `${dc}코어 줄어`}들어요. ${dc > 0 ? '멀티작업에 더 유리' : '멀티작업은 다소 불리'}한 방향이에요.` })
      if (isX3D(part.name) && !isX3D(prev.name)) out.push({ tag: '게임', text: '게임 특화 캐시(X3D)로 바뀌어 게임 프레임에 유리한 방향이에요.' })
      if (part.socket && prev.socket && part.socket !== prev.socket) out.push({ tag: '주의', text: `소켓이 ${prev.socket} → ${part.socket}로 달라졌어요. 메인보드도 ${part.socket}로 맞춰야 합니다.` })
      break
    }
    case 'gpu': {
      const dv = (vramOf(part) ?? 0) - (vramOf(prev) ?? 0)
      if (dv) out.push({ tag: '메모리', text: `VRAM이 ${dv > 0 ? `+${dv}GB` : `${dv}GB`} 바뀌어요. ${dv > 0 ? '고해상도·고텍스처에 더 여유로워져요.' : '고해상도에서는 다소 빠듯해질 수 있어요.'}` })
      const dt = gpuTier(part.name) - gpuTier(prev.name)
      if (dt) out.push({ tag: '해상도', text: `그래픽 등급이 ${dt > 0 ? '올라가' : '내려가'} ${gpuResolution(part.name)}급으로 바뀌어요.` })
      break
    }
    case 'memory': {
      const dcap = (capacityGB(part.specs?.capacity) ?? capacityGB(part.name) ?? 0) - (capacityGB(prev.specs?.capacity) ?? capacityGB(prev.name) ?? 0)
      if (dcap) out.push({ tag: '용량', text: `메모리 용량이 ${dcap > 0 ? `+${dcap}GB` : `${dcap}GB`} 바뀌어요. ${dcap > 0 ? '멀티태스킹·작업에 더 여유로워져요.' : '작업이 많다면 줄어든 용량이 빠듯할 수 있어요.'}` })
      if (part.memoryType && prev.memoryType && part.memoryType !== prev.memoryType) out.push({ tag: '주의', text: `메모리 규격이 ${prev.memoryType} → ${part.memoryType}로 달라졌어요. 메인보드 지원 규격과 맞는지 확인하세요.` })
      break
    }
    case 'ssd':
    case 'hdd': {
      const dcap = (capacityGB(part.specs?.capacity) ?? capacityGB(part.name) ?? 0) - (capacityGB(prev.specs?.capacity) ?? capacityGB(prev.name) ?? 0)
      if (dcap) out.push({ tag: '용량', text: `저장 용량이 ${dcap > 0 ? `+${Math.round(dcap)}GB 늘어` : `${Math.round(dcap)}GB 줄어`}들어요.` })
      break
    }
    case 'psu': {
      const dw = (wattOf(part) ?? 0) - (wattOf(prev) ?? 0)
      if (dw) out.push({ tag: '전력', text: `파워 용량이 ${dw > 0 ? `+${dw}W` : `${dw}W`} 바뀌어요. 구성 전체 소비전력과 비교해 여유가 있는지 보세요.` })
      break
    }
    default:
      break
  }
  return out
}

// ===== 직접 견적 / 업그레이드 존: 상호작용 팁 (AI 비서처럼 가능한 경우의 수를 짚어줌) =====
// category: 방금 고른 칸, part: 새로 고른 부품, selected: 갱신된 선택, prev: 그 칸에 있던 이전 부품
export function interactionTips(category, part, selected, prev) {
  const tips = []
  const ko = KO_OF[category] ?? '부품'
  // 1) 무엇을 골랐는지 + 그 부품의 핵심 한마디
  tips.push({ tag: ko, text: `${ko} "${part.name}"를 골랐어요.` })
  const own = buildPartTips(part)
  if (own[0]) tips.push(own[0]) // 그 부품의 가장 핵심적인 파생 팁 1개

  // 2) 이전 부품과의 구체적 비교
  tips.push(...compareParts(category, part, prev))

  // 3) 나머지 구성과의 호환성/균형 — 가능한 경우의 수
  const { cpu, motherboard, memory, psu, gpu, case: pcCase } = selected

  // CPU ↔ 메인보드 소켓
  if (category === 'cpu' || category === 'motherboard') {
    if (cpu?.socket && motherboard?.socket) {
      tips.push(
        cpu.socket === motherboard.socket
          ? { tag: '호환성', text: `좋아요 — CPU와 메인보드 소켓이 모두 ${cpu.socket}로 맞습니다.` }
          : { tag: '주의', text: `소켓 불일치 — CPU는 ${cpu.socket}, 메인보드는 ${motherboard.socket}이에요. 이대로면 장착되지 않습니다.` },
      )
    } else if (category === 'cpu' && cpu?.socket && !motherboard) {
      tips.push({ tag: '다음', text: `이제 ${cpu.socket} 소켓 메인보드를 고르면 호환이 맞아요.` })
    } else if (category === 'motherboard' && motherboard?.socket && !cpu) {
      tips.push({ tag: '다음', text: `이 메인보드는 ${motherboard.socket} 소켓이에요. 같은 소켓 CPU를 고르세요.` })
    }
  }
  // 내장그래픽 없는 CPU(F 모델)인데 그래픽카드가 아직 없으면 화면 출력 불가
  if (category === 'cpu' && isNoIGPU(part.name) && !gpu) {
    tips.push({ tag: '주의', text: '내장 그래픽이 없는 CPU(F 모델)예요. 화면 출력을 위해 그래픽카드가 꼭 필요합니다.' })
  }
  // 메모리 ↔ 메인보드 규격
  if (category === 'memory' || category === 'motherboard') {
    const mt = memory?.memoryType
    const bt = motherboard?.memoryType
    if (mt && bt) {
      tips.push(
        mt === bt
          ? { tag: '호환성', text: `메모리 규격이 ${mt}로 메인보드와 일치해요.` }
          : { tag: '주의', text: `메모리 규격 불일치 — 메모리 ${mt}, 메인보드 ${bt}예요. 같은 규격으로 맞추세요.` },
      )
    }
    if (category === 'memory') tips.push({ tag: '팁', text: '같은 용량이면 2개로 나눠(듀얼채널) 구성하는 게 성능에 유리해요.' })
  }
  // GPU ↔ 파워/케이스
  if (category === 'gpu') {
    const need = recommendedPsuForGpu(part.name)
    const w = wattOf(psu)
    if (w) {
      tips.push(
        w >= need
          ? { tag: '전력', text: `현재 파워 ${w}W — 이 그래픽카드 권장(약 ${need}W) 이상이라 여유 있어요.` }
          : { tag: '주의', text: `이 그래픽카드엔 약 ${need}W 이상을 권장해요. 현재 파워(${w}W)로 충분한지 확인하세요.` },
      )
    } else {
      tips.push({ tag: '다음', text: `이 그래픽카드엔 약 ${need}W 이상 파워를 권장해요. 파워도 함께 골라보세요.` })
    }
    if (part.tdp >= 300) tips.push({ tag: '전력', text: '전력이 큰 그래픽카드예요. 보조전원 커넥터와 케이스 통풍을 꼭 확인하세요.' })
    if (pcCase?.specs?.gpuMax) tips.push({ tag: '호환성', text: `케이스 GPU 장착 한계는 ${pcCase.specs.gpuMax}예요. 이 그래픽카드 길이가 그 안에 드는지 확인하세요.` })
    else tips.push({ tag: '호환성', text: 'GPU 길이가 케이스보다 길면 안 들어가요. 케이스 장착 길이도 확인하세요.' })
    const vg = vramOf(part)
    if (vg && vg <= 8) tips.push({ tag: '주의', text: 'VRAM 8GB라 최신 게임 고옵션·QHD 이상에선 다소 빠듯할 수 있어요.' })
    tips.push({ tag: '모니터', text: `${gpuResolution(part.name)}에 어울리는 등급이에요. 모니터 해상도·주사율도 여기에 맞추면 제값을 합니다.` })
  }
  // 쿨러 ↔ CPU 발열
  if (category === 'cpuCooler' && cpu) {
    if ((cpu.tdp ?? 0) >= 120 || cpuTier(cpu.name) >= 4) {
      const ok = /수랭|수냉|aio|라디|360|240/i.test(part.name) || /수랭|수냉|aio/i.test(part.specs?.type ?? '')
      tips.push(
        ok
          ? { tag: '쿨러', text: '고발열 CPU에 어울리는 쿨러예요. 온도·소음 관리에 유리합니다.' }
          : { tag: '주의', text: '고발열 CPU인데 쿨러가 기본·소형일 수 있어요. 상위 공랭·수랭을 권장합니다.' },
      )
    } else {
      tips.push({ tag: '팁', text: '쿨러는 케이스 높이 제한과 호환되는지 함께 확인하세요.' })
    }
  }
  // 파워 적정성 (파워를 골랐거나, 다른 부품을 골라 권장이 바뀌었을 때)
  if (category === 'psu' || (psu && category !== 'psu')) {
    const total = tdpSum(selected)
    const need = recommendedPsu(total)
    const w = wattOf(psu)
    if (w && need) {
      tips.push(
        w >= need
          ? { tag: '전력', text: `구성 합계 기준 권장 약 ${need}W — 현재 파워 ${w}W로 여유 있어요.` }
          : { tag: '주의', text: `부품이 늘며 권장 파워가 약 ${need}W가 됐어요. 현재 파워(${w}W)로 충분한지 확인하세요.` },
      )
    }
  }
  // CPU·GPU 균형(병목)
  if (cpu && gpu) {
    const diff = gpuTier(gpu.name) - cpuTier(cpu.name)
    if (diff >= 2) tips.push({ tag: '균형', text: 'GPU가 CPU보다 높은 편이에요. 일부 게임에서 CPU가 따라가지 못할 수 있어요(병목).' })
    else if (diff <= -2) tips.push({ tag: '균형', text: 'CPU가 GPU보다 높은 편이에요. 게임 위주라면 GPU를 한 단계 올리는 것도 방법이에요.' })
    else tips.push({ tag: '균형', text: 'CPU와 GPU 등급이 비교적 잘 맞아요. 균형 잡힌 구성이에요.' })
  }

  return dedupe(tips).slice(0, 8)
}

// ===== 직접 견적 완료(필수 부품 다 고름) 시 팁 =====
const ESSENTIAL = ['cpu', 'cpuCooler', 'memory', 'motherboard', 'gpu', 'ssd', 'psu', 'case']
export function completionTips(selected) {
  const tips = []
  const total = Object.values(selected).reduce((s, p) => s + (p?.price ?? 0), 0)
  const power = tdpSum(selected)
  const need = recommendedPsu(power)
  tips.push({ tag: '완성', text: `필수 구성을 다 골랐어요! 합계 약 ${formatPrice(total)}, 예상 소비전력 약 ${power}W.` })

  const w = wattOf(selected.psu)
  if (w && need) {
    tips.push(
      w >= need
        ? { tag: '전력', text: `파워 ${w}W — 권장(약 ${need}W) 이상이라 안정적이에요.` }
        : { tag: '주의', text: `파워 ${w}W는 권장(약 ${need}W)보다 낮아요. 더 큰 용량을 고려하세요.` },
    )
  }
  // CPU·GPU 균형
  if (selected.cpu && selected.gpu) {
    const diff = gpuTier(selected.gpu.name) - cpuTier(selected.cpu.name)
    if (diff >= 2) tips.push({ tag: '균형', text: '완성 구성이 GPU 쪽으로 무게가 실려 있어요. 고해상도 게임에 유리합니다.' })
    else if (diff <= -2) tips.push({ tag: '균형', text: '완성 구성이 CPU 쪽으로 무게가 실려 있어요. 작업·멀티태스킹에 유리합니다.' })
  }
  // 모니터 페어링 안내 (GPU 등급 → 어울리는 해상도)
  if (selected.gpu) {
    tips.push({ tag: '모니터', text: `이 구성은 ${gpuResolution(selected.gpu.name)} 게이밍에 어울려요. 모니터도 그 해상도·주사율로 맞추면 제값을 합니다.` })
  }
  // 가격대 등급 한마디
  const tierLabel = total >= 3000000 ? '하이엔드' : total >= 1500000 ? '상급' : total >= 800000 ? '메인스트림' : '입문'
  tips.push({ tag: '등급', text: `합계 기준 ${tierLabel} 가격대 구성이에요. 용도에 잘 맞는지 한 번 더 점검해 보세요.` })

  // 비슷한 완성형 PC 추천 (가격 근접 + 가능하면 같은 분류)
  const rec = recommendSimilar(selected, total)
  if (rec) tips.push({ tag: '추천', text: `이 구성과 비슷한 가격대의 완성형 PC: "${rec.name}" (${formatPrice(rec.price)}). 비교에 참고하세요.` })

  // 추가 구성 안내
  if (!selected.os) tips.push({ tag: '추가구성', text: 'OS가 아직 없어요. 새로 조립이라면 윈도우(OS)도 함께 챙기는 걸 잊지 마세요.' })
  if (!selected.hdd) tips.push({ tag: '추가구성', text: '대용량 보관이 필요하면 HDD를 추가하는 것도 좋아요(선택 사항).' })

  return dedupe(tips).slice(0, 7)
}

function recommendSimilar(selected, total) {
  if (!prebuiltPCs?.length) return null
  const gt = selected.gpu ? gpuTier(selected.gpu.name) : null
  let best = null
  let bestScore = Infinity
  for (const pc of prebuiltPCs) {
    const priceGap = Math.abs((pc.price ?? 0) - total)
    const tierGap = gt != null ? Math.abs(gpuTier(pc.gpu ?? '') - gt) * 300000 : 0
    const score = priceGap + tierGap
    if (score < bestScore) {
      bestScore = score
      best = pc
    }
  }
  return best
}

// ===== 직접 견적 종합: 마지막 상호작용/완료 상태에 맞는 팁 =====
export function builderTips({ selected, lastPick, prevPart }) {
  const complete = ESSENTIAL.every((c) => selected[c])
  if (lastPick && selected[lastPick]) {
    const inter = interactionTips(lastPick, selected[lastPick], selected, prevPart)
    return complete ? dedupe([...inter, ...completionTips(selected)]).slice(0, 8) : inter
  }
  if (complete) return completionTips(selected)
  return BUILDER_TIPS
}
