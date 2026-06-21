// 네이버 쇼핑 검색 API로 부품을 대량 수집 (이름 + 이미지 + 가격).
// 스펙(소켓·DDR·코어·VRAM·TDP)은 상품명에서 추출 + 알려진 모델 규칙으로 채움(모르면 빈칸, 가짜 없음).
// 기존 부품(직접 입력한 큐레이션)은 유지하고, 중복은 건너뜀.
//
// 사용법: cd backend && node scripts/collect-from-naver.js
//   .env 에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 필요.

import { env } from '../src/config/env.js'
import { prisma } from '../src/lib/prisma.js'

const ID = env.naverClientId
const SECRET = env.naverClientSecret
if (!ID || !SECRET) {
  console.error('❌ .env 에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 필요')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const stripTags = (s) =>
  (s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// 중복 제거용 정규화 키 (괄호·광고문구 제거)
const normKey = (name) =>
  name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/정품|벌크|멀티팩|쿨러팩|병행수입|국내정식|당일발송|무료배송|new|신제품/gi, '')
    .replace(/[\s\-_/·.]/g, '')

async function search(query, start) {
  const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(
    query,
  )}&display=100&start=${start}&sort=sim`
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': ID, 'X-Naver-Client-Secret': SECRET },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`)
  return (await res.json()).items || []
}

// ───────── 스펙 추출기 (상품명 기반) ─────────

// 메모리: DDR세대·용량·클럭이 이름에 들어있음
// 주의: PC4-21300 / PC5-44800 은 "대역폭 코드"라 클럭이 아님 → 유효 클럭 범위만 채택
function parseMemory(name) {
  const memoryType = /DDR5/i.test(name) ? 'DDR5' : /DDR4/i.test(name) ? 'DDR4' : null
  const cap = name.match(/(\d+)\s?GB/i)
  const specs = {}
  if (cap) specs.capacity = `${cap[1]}GB`
  const nums = (name.match(/\d{4,5}/g) || []).map(Number)
  let speed = null
  if (memoryType === 'DDR5') speed = nums.find((x) => x >= 4000 && x <= 8800)
  else if (memoryType === 'DDR4') speed = nums.find((x) => x >= 2000 && x <= 4400)
  if (speed) specs.speed = `${speed}MHz`
  return { memoryType, specs }
}

// SSD: 용량·인터페이스
function parseSsd(name) {
  const tb = name.match(/(\d+)\s?TB/i)
  const gb = name.match(/(\d+)\s?GB/i)
  const specs = {}
  if (tb) specs.capacity = `${tb[1]}TB`
  else if (gb) specs.capacity = `${gb[1]}GB`
  if (/NVMe|M\.?2|Gen\s?[345]/i.test(name)) specs.interface = 'NVMe'
  else if (/SATA/i.test(name)) specs.interface = 'SATA'
  return { specs }
}

// HDD: 용량·rpm
function parseHdd(name) {
  const tb = name.match(/(\d+)\s?TB/i)
  const gb = name.match(/(\d+)\s?GB/i)
  const specs = {}
  if (tb) specs.capacity = `${tb[1]}TB`
  else if (gb) specs.capacity = `${gb[1]}GB`
  const rpm = name.match(/(5400|5640|5900|7200)\s?rpm/i)
  if (rpm) specs.rpm = Number(rpm[1])
  return { specs }
}

// 파워: 정격(W)·80+ 등급
function parsePsu(name) {
  const watt = name.match(/(\d{3,4})\s?W\b/i)
  const specs = {}
  if (watt) specs.watt = Number(watt[1])
  if (/티타늄|titanium/i.test(name)) specs.rating = '80+ Titanium'
  else if (/플래티넘|platinum/i.test(name)) specs.rating = '80+ Platinum'
  else if (/골드|gold/i.test(name)) specs.rating = '80+ Gold'
  else if (/실버|silver/i.test(name)) specs.rating = '80+ Silver'
  else if (/브론즈|bronze/i.test(name)) specs.rating = '80+ Bronze'
  return { specs }
}

// CPU: 소켓·DDR은 세대 규칙(사실)으로, 코어/TDP는 알려진 모델만
const CPU_MODELS = {
  // AMD AM5/DDR5 (라이젠 7000/8000/9000)
  '7600': { cores: 6, threads: 12, tdp: 65 }, '7600x': { cores: 6, threads: 12, tdp: 105 },
  '7700': { cores: 8, threads: 16, tdp: 65 }, '7700x': { cores: 8, threads: 16, tdp: 105 },
  '7800x3d': { cores: 8, threads: 16, tdp: 120 }, '7900': { cores: 12, threads: 24, tdp: 65 },
  '7900x': { cores: 12, threads: 24, tdp: 170 }, '7950x': { cores: 16, threads: 32, tdp: 170 },
  '7950x3d': { cores: 16, threads: 32, tdp: 120 }, '7500f': { cores: 6, threads: 12, tdp: 65 },
  '8400f': { cores: 6, threads: 12, tdp: 65 }, '8500g': { cores: 6, threads: 12, tdp: 65 },
  '9600x': { cores: 6, threads: 12, tdp: 65 }, '9700x': { cores: 8, threads: 16, tdp: 65 },
  '9800x3d': { cores: 8, threads: 16, tdp: 120 }, '9900x': { cores: 12, threads: 24, tdp: 120 },
  '9950x': { cores: 16, threads: 32, tdp: 170 }, '9950x3d': { cores: 16, threads: 32, tdp: 170 },
  // AMD AM4/DDR4 (라이젠 5000)
  '5600': { cores: 6, threads: 12, tdp: 65 }, '5600x': { cores: 6, threads: 12, tdp: 65 },
  '5700x': { cores: 8, threads: 16, tdp: 65 }, '5700x3d': { cores: 8, threads: 16, tdp: 105 },
  '5800x3d': { cores: 8, threads: 16, tdp: 105 }, '5900x': { cores: 12, threads: 24, tdp: 105 },
  // Intel LGA1700 (12~14세대)
  '12400f': { cores: 6, threads: 12, tdp: 65 }, '13400f': { cores: 10, threads: 16, tdp: 65 },
  '13500': { cores: 14, threads: 20, tdp: 65 }, '13600k': { cores: 14, threads: 20, tdp: 125 },
  '13700k': { cores: 16, threads: 24, tdp: 125 }, '13900k': { cores: 24, threads: 32, tdp: 125 },
  '14100f': { cores: 4, threads: 8, tdp: 65 }, '14400f': { cores: 10, threads: 16, tdp: 65 },
  '14600k': { cores: 14, threads: 20, tdp: 125 }, '14700k': { cores: 20, threads: 28, tdp: 125 },
  '14900k': { cores: 24, threads: 32, tdp: 125 },
}
function parseCpu(name) {
  const n = name.toLowerCase()
  let socket = null, memoryType = null
  // 소켓/DDR 규칙 (사실)
  if (/라이젠|ryzen|\br[3579]\s?\d{4}/.test(n)) {
    if (/\b[789]\d{3}/.test(n)) { socket = 'AM5'; memoryType = 'DDR5' }
    else if (/\b[1235]\d{3}/.test(n)) { socket = 'AM4'; memoryType = 'DDR4' }
  } else if (/코어\s?울트라|core\s?ultra|울트라\s?[579]/.test(n)) {
    socket = 'LGA1851'; memoryType = 'DDR5'
  } else if (/코어|core|인텔|intel/.test(n)) {
    if (/\b1[234]\d{3}/.test(n)) { socket = 'LGA1700' } // 12~14세대만(현행)
  }
  // 코어/TDP: 알려진 모델만
  const specs = {}
  for (const [key, v] of Object.entries(CPU_MODELS)) {
    if (n.replace(/[\s-]/g, '').includes(key)) {
      specs.cores = v.cores; specs.threads = v.threads
      return { socket, memoryType, tdp: v.tdp, specs }
    }
  }
  return { socket, memoryType, specs }
}

// GPU: 칩셋 → VRAM/TDP (알려진 것만)
const GPU_MODELS = {
  'rtx 5090': { vram: '32GB GDDR7', tdp: 575 }, 'rtx 5080': { vram: '16GB GDDR7', tdp: 360 },
  'rtx 5070 ti': { vram: '16GB GDDR7', tdp: 300 }, 'rtx 5070': { vram: '12GB GDDR7', tdp: 250 },
  'rtx 5060 ti': { vram: '16GB GDDR7', tdp: 180 }, 'rtx 5060': { vram: '8GB GDDR7', tdp: 145 },
  'rtx 4090': { vram: '24GB GDDR6X', tdp: 450 }, 'rtx 4080 super': { vram: '16GB GDDR6X', tdp: 320 },
  'rtx 4070 ti super': { vram: '16GB GDDR6X', tdp: 285 }, 'rtx 4070 super': { vram: '12GB GDDR6X', tdp: 220 },
  'rtx 4070': { vram: '12GB GDDR6X', tdp: 200 }, 'rtx 4060 ti': { vram: '8GB GDDR6', tdp: 160 },
  'rtx 4060': { vram: '8GB GDDR6', tdp: 115 }, 'rtx 3070': { vram: '8GB GDDR6', tdp: 220 },
  'rtx 3060': { vram: '12GB GDDR6', tdp: 170 }, 'rtx 3050': { vram: '8GB GDDR6', tdp: 130 },
  'rx 9070 xt': { vram: '16GB GDDR6', tdp: 304 }, 'rx 9070': { vram: '16GB GDDR6', tdp: 220 },
  'rx 7900 xtx': { vram: '24GB GDDR6', tdp: 355 }, 'rx 7900 xt': { vram: '20GB GDDR6', tdp: 315 },
  'rx 7900 gre': { vram: '16GB GDDR6', tdp: 260 }, 'rx 7800 xt': { vram: '16GB GDDR6', tdp: 263 },
  'rx 7700 xt': { vram: '12GB GDDR6', tdp: 245 }, 'rx 7600': { vram: '8GB GDDR6', tdp: 165 },
  'rx 6650 xt': { vram: '8GB GDDR6', tdp: 180 }, 'rx 6600': { vram: '8GB GDDR6', tdp: 132 },
}
function parseGpu(name) {
  const n = name.toLowerCase().replace(/\s+/g, ' ')
  const specs = {}
  let tdp
  // 긴 키부터 매칭
  for (const key of Object.keys(GPU_MODELS).sort((a, b) => b.length - a.length)) {
    if (n.includes(key)) { specs.vram = GPU_MODELS[key].vram; tdp = GPU_MODELS[key].tdp; break }
  }
  return { tdp, specs }
}

// 메인보드: 칩셋 → 소켓·DDR
function parseMotherboard(name) {
  const n = name.toUpperCase()
  let socket = null, memoryType = null, chipset = null
  const m = n.match(/\b([ABXZ]\d{3}E?|A\d{3})\b/) // B650, X670E, B760, Z790, B860, X870, A620...
  if (m) chipset = m[1]
  if (/\b(A620|B650|B840|B850|X670|X870)/.test(n)) { socket = 'AM5'; memoryType = 'DDR5' }
  else if (/\b(A520|B450|B550|X570)/.test(n)) { socket = 'AM4'; memoryType = 'DDR4' }
  else if (/\b(B760|B660|H770|H610|Z790|Z690)/.test(n)) { socket = 'LGA1700'; if (/DDR4|D4/.test(n)) memoryType = 'DDR4' }
  else if (/\b(B860|H810|Z890)/.test(n)) { socket = 'LGA1851'; memoryType = 'DDR5' }
  const specs = {}
  if (chipset) specs.chipset = chipset
  if (/M-?ATX|마이크로|MATX/i.test(name)) specs.form = 'mATX'
  else if (/ITX/i.test(name)) specs.form = 'ITX'
  else if (/ATX/i.test(name)) specs.form = 'ATX'
  return { socket, memoryType, specs }
}

// 쿨러: 공/수랭
function parseCooler(name) {
  const specs = {}
  if (/수랭|AIO|라디에이터|liquid/i.test(name)) specs.type = '수랭'
  else if (/공랭|타워|air/i.test(name)) specs.type = '공랭'
  return { specs }
}

// 케이스: 폼팩터
function parseCase(name) {
  const specs = {}
  if (/M-?ATX|마이크로/i.test(name)) specs.form = 'mATX'
  else if (/ITX/i.test(name)) specs.form = 'ITX'
  else if (/ATX|미들|빅타워/i.test(name)) specs.form = 'ATX'
  return { specs }
}

// 서버·중고·노트북용·병행 등 노이즈 제외
const EXCLUDE = /중고|리퍼|렌탈|xeon|제온|epyc|옵테론|opteron|threadripper|스레드리퍼|서버\s?용|병행수입|해외직구|노트북|랩탑|so-?dimm|sodimm|\bE[357]-?\d{3,4}\b|fclga|2011|1366|lga\s?775|중고나라/i

// ───────── 카테고리 설정 ─────────
// target = 이번 실행에서 "새로(중복 제외) 추가"할 개수
const CATEGORIES = [
  { cat: 'CPU', queries: ['AMD 라이젠 CPU', '인텔 코어 CPU', '인텔 코어 울트라', '라이젠5', '라이젠7', '라이젠9', '코어i3', '코어i5', '코어i7', '코어i9', '라이젠 7600', '라이젠 7700', '라이젠 9600X', '라이젠 9700X', '라이젠 9800X3D', '라이젠 9950X', '라이젠 8500G', '라이젠 8700G', '코어 울트라5', '코어 울트라7', '코어 울트라9', '인텔 14400F', '인텔 14600K', '인텔 14700K', '인텔 14900K'], match: ['CPU'], target: 70, parse: parseCpu, requireSocket: true },
  { cat: 'GPU', queries: ['그래픽카드', '지포스 RTX', '라데온 RX', '갤럭시 그래픽카드', '이엠텍 그래픽카드', '조텍 그래픽카드', 'MSI 그래픽카드', '기가바이트 그래픽카드', 'ASUS 그래픽카드', '컬러풀 그래픽카드', 'PNY 그래픽카드', '이엠텍 RTX', 'RTX 5090', 'RTX 5080', 'RTX 5070 Ti', 'RTX 5070', 'RTX 5060 Ti', 'RTX 5060', 'RTX 4060', 'RTX 4060 Ti', 'RTX 4070', 'RTX 4070 Super', 'RTX 4080', 'RX 7600', 'RX 7700 XT', 'RX 7800 XT', 'RX 7900 XT', 'RX 9070', 'RX 9070 XT', '지포스 4060', '지포스 5070', '라데온 7800'], match: ['그래픽카드'], target: 330, parse: parseGpu },
  { cat: 'MOTHERBOARD', queries: ['메인보드', 'ASUS 메인보드', 'MSI 메인보드', '기가바이트 메인보드', 'ASRock 메인보드', '바이오스타 메인보드', 'B650 메인보드', 'B760 메인보드', 'B850 메인보드', 'B860 메인보드', 'X670 메인보드', 'X870 메인보드', 'Z790 메인보드', 'Z890 메인보드', 'B550 메인보드', 'A620 메인보드', 'H610 메인보드', 'ASUS B650', 'MSI B760', '기가바이트 B850', 'ASRock B650', 'TUF 메인보드', 'MSI 박격포', 'MSI 토마호크', 'ASUS 프라임 메인보드', 'ASUS 스트릭스 메인보드'], match: ['메인보드'], target: 320, parse: parseMotherboard, requireSocket: true },
  { cat: 'MEMORY', queries: ['DDR5 데스크탑 메모리', 'DDR4 데스크탑 메모리', '삼성 메모리 램', 'SK하이닉스 메모리', '팀그룹 메모리', '커세어 메모리', 'G.SKILL 메모리', '에센코어 메모리', '킹스톤 메모리', '마이크론 메모리', '클레브 메모리', 'GeIL 메모리', '한성 메모리', 'TeamGroup DDR5', 'DDR5 16GB', 'DDR5 32GB', 'DDR4 16GB', 'DDR5 6000', 'DDR5 5600'], match: ['RAM', '메모리'], target: 220, parse: parseMemory },
  { cat: 'SSD', queries: ['SSD', 'NVMe SSD', 'M.2 SSD', '삼성 SSD', 'SK하이닉스 SSD', '마이크론 SSD', 'WD SSD', '키오시아 SSD', '솔리다임 SSD', '팀그룹 SSD', '1TB SSD', '2TB SSD', '4TB SSD', '500GB SSD', '삼성 990', '삼성 980', 'WD 블랙 SSD', '시게이트 SSD', 'ADATA SSD', '렉사 SSD', 'PNY SSD', '마이크론 P3', 'SK하이닉스 P31', 'Gen4 SSD', 'Gen5 SSD'], match: ['SSD'], target: 320, parse: parseSsd },
  { cat: 'HDD', queries: ['하드디스크 HDD', '시게이트 하드', 'WD 하드', '도시바 하드', '4TB 하드디스크', '8TB 하드디스크', '2TB 하드디스크', '6TB 하드디스크', '10TB 하드디스크', 'WD Blue 하드', '시게이트 바라쿠다', 'WD 레드', '시게이트 아이언울프'], match: ['HDD', '하드'], target: 90, parse: parseHdd },
  { cat: 'PSU', queries: ['파워서플라이', '마이크로닉스 파워', '시소닉 파워', '잘만 파워', 'FSP 파워', '슈퍼플라워 파워', '커세어 파워', '안텍 파워', '쿨러마스터 파워', '800W 파워', '750W 파워', '골드 파워', '600W 파워', '850W 파워', '1000W 파워', '마이크로닉스 클래식', '시소닉 포커스', '에너맥스 파워', 'be quiet 파워', 'ATX 3.1 파워', '풀모듈러 파워'], match: ['파워'], target: 250, parse: parsePsu },
  { cat: 'CASE', queries: ['컴퓨터 케이스', '앱코 케이스', '다크플래쉬 케이스', '마이크로닉스 케이스', '쿨러마스터 케이스', '리안리 케이스', 'NZXT 케이스', '커세어 케이스', '3RSYS 케이스', '잘만 케이스', '프랙탈 케이스', 'ATX 케이스', '미니타워 케이스', '강화유리 케이스', '화이트 케이스', '빅타워 케이스', 'M-ATX 케이스', 'ITX 케이스', '대양케이스', 'GMC 케이스', 'darkFlash 케이스', '리안리 오뉴', '앱코 수트'], match: ['케이스'], target: 320, parse: parseCase },
  { cat: 'CPU_COOLER', queries: ['CPU 쿨러', '공랭 쿨러', '수랭 쿨러', '쿨러마스터 쿨러', '딥쿨 쿨러', '써멀라이트 쿨러', 'PCCOOLER 쿨러', '잘만 쿨러', '3RSYS 쿨러', '녹투아 쿨러', 'NZXT 수랭', '360 수랭', '240 수랭', '공랭 CPU 쿨러', '딥쿨 AK620', '써멀라이트 PA120', '아크틱 수랭', '잘만 수랭', '써모랩 쿨러', '한성 쿨러', '타워형 쿨러', 'CPU 수랭쿨러'], match: ['쿨러'], target: 280, parse: parseCooler },
]

function brandFrom(name) {
  const b = name.trim().split(/[\s[\]]/)[0]
  return b && b.length <= 12 ? b : null
}

async function main() {
  console.log('🛒 네이버 부품 대량 수집 시작...\n')
  // 기존 이름(중복 방지)
  const existing = await prisma.part.findMany({ select: { name: true } })
  const seen = new Set(existing.map((p) => normKey(p.name)))
  console.log(`기존 부품 ${existing.length}개 (중복 제외용)\n`)

  const toInsert = []

  for (const conf of CATEGORIES) {
    let collected = 0
    for (const q of conf.queries) {
      if (collected >= conf.target) break
      for (let start = 1; start <= 1000 && collected < conf.target; start += 100) {
        let items
        try {
          items = await search(q, start)
        } catch (e) {
          console.log(`  ⚠ ${conf.cat} "${q}" start=${start} 오류: ${e.message}`)
          await sleep(300)
          continue
        }
        for (const it of items) {
          const cats = [it.category1, it.category2, it.category3, it.category4].join(' ')
          if (!conf.match.some((k) => cats.includes(k))) continue // 카테고리 불일치 제외
          const name = stripTags(it.title)
          const price = parseInt(it.lprice, 10)
          if (!name || !price || price < 1000) continue
          if (EXCLUDE.test(name)) continue // 서버·중고·노트북용 등 제외
          const key = normKey(name)
          if (seen.has(key)) continue
          const parsed = conf.parse(name)
          if (conf.requireSocket && !parsed.socket) continue // 소켓 식별 안 되면 제외(현행 제품만)
          seen.add(key)
          toInsert.push({
            category: conf.cat,
            name,
            brand: brandFrom(name),
            price,
            tdp: parsed.tdp ?? 0,
            socket: parsed.socket ?? null,
            memoryType: parsed.memoryType ?? null,
            imageUrl: it.image || null,
            specs: parsed.specs && Object.keys(parsed.specs).length ? parsed.specs : undefined,
          })
          collected++
          if (collected >= conf.target) break
        }
        await sleep(150)
      }
    }
    console.log(`  ✓ ${conf.cat.padEnd(12)} +${collected}개`)
  }

  console.log(`\n💾 DB에 ${toInsert.length}개 삽입 중...`)
  // 배치 삽입
  const BATCH = 200
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const r = await prisma.part.createMany({ data: toInsert.slice(i, i + BATCH) })
    inserted += r.count
  }
  const total = await prisma.part.count()
  console.log(`✅ 신규 ${inserted}개 삽입 완료 · 전체 부품 ${total}개`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
