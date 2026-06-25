import { Router } from 'express'
import { readFileSync } from 'node:fs'
import { prisma } from '../lib/prisma.js'
import { generateChat, isGeminiConfigured } from '../lib/gemini.js'
import { getUserIdFromReq } from '../lib/auth.js'

// 완본체(조립 완료 PC) 요약 — scripts/export-prebuilts.js 로 생성. 추천 근거로 사용.
const PREBUILTS = (() => {
  try {
    return JSON.parse(readFileSync(new URL('../data/prebuilts.json', import.meta.url)))
  } catch {
    return []
  }
})()

const router = Router()

const won = (n) => `${Number(n ?? 0).toLocaleString('ko-KR')}원`

// ── 간단한 사용자별 속도 제한 (무료 한도 보호 + 연타 방지) ──
// 로그인 사용자는 userId, 비로그인은 IP 기준. 60초에 최대 10회.
const RL_WINDOW_MS = 60_000
const RL_MAX = 10
const rlHits = new Map() // key -> 최근 요청 시각[]

function checkRateLimit(req) {
  const uid = getUserIdFromReq(req)
  const key = uid ? `u:${uid}` : `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`
  const now = Date.now()
  const recent = (rlHits.get(key) || []).filter((t) => now - t < RL_WINDOW_MS)
  if (recent.length >= RL_MAX) {
    return { ok: false, retryAfter: Math.ceil((RL_WINDOW_MS - (now - recent[0])) / 1000) }
  }
  recent.push(now)
  rlHits.set(key, recent)
  // 가끔 오래된 키 정리 (메모리 누수 방지)
  if (rlHits.size > 500) {
    for (const [k, v] of rlHits) {
      if (v.every((t) => now - t >= RL_WINDOW_MS)) rlHits.delete(k)
    }
  }
  return { ok: true }
}

// 흔한 조사/불용어 — 검색 토큰에서 제외
const STOP = new Set(['그리고', '근데', '추천', '해줘', '알려줘', '뭐가', '좋아', '있어', '하는', '되는', '으로', '에서', '하고'])

// 사용자 메시지에서 제품 검색용 토큰 추출 (한글/영문/숫자 2자 이상)
function tokenize(text) {
  return [...new Set(String(text).match(/[A-Za-z0-9가-힣]{2,}/g) ?? [])]
    .filter((t) => !STOP.has(t))
    .slice(0, 10)
}

// 모델명에 가까운 "강한" 토큰(숫자 포함 또는 4자 이상 영문) — 흔한 단어("RTX","파워")보다 우선
const isStrong = (t) => /\d/.test(t) || /^[A-Za-z]{4,}$/.test(t)

const PART_SELECT = {
  id: true, category: true, name: true, brand: true, price: true,
  tdp: true, imageUrl: true, socket: true, memoryType: true,
}

// 메시지에서 카테고리 추정 (위에서부터 먼저 매칭)
const CAT_RULES = [
  [/그래픽|지포스|라데온|rtx|gtx|\bvga\b/i, 'GPU'],
  [/라이젠|인텔|프로세서|씨피유|\bcpu\b/i, 'CPU'],
  [/메인보드|마더보드|메인 ?보드/i, 'MOTHERBOARD'],
  [/메모리|\b램\b|ddr\d?/i, 'MEMORY'],
  [/\bssd\b|에스에스디/i, 'SSD'],
  [/하드디스크|\bhdd\b/i, 'HDD'],
  [/파워|\bpsu\b|전원공급/i, 'PSU'],
  [/케이스|본체/i, 'CASE'],
  [/쿨러|수냉|공랭/i, 'CPU_COOLER'],
]
function detectCategory(text) {
  for (const [re, c] of CAT_RULES) if (re.test(text)) return c
  return null
}

// "20만원", "80만원대", "50만 이하" → 상한 예산(원). 없으면 null
function parseMaxBudget(text) {
  const m = text.match(/(\d+)\s*만/)
  if (m) {
    let won = Number(m[1]) * 10000
    if (/대|정도|쯤|안팎|내외/.test(text)) won = Math.round(won * 1.2) // "~대"는 약간 여유
    return won
  }
  const w = text.match(/(\d{5,})\s*원/)
  return w ? Number(w[1]) : null
}

// 토큰으로 컴친 DB에서 관련 부품을 찾아 근거 데이터로 사용.
// 모델번호 같은 강한 토큰을 먼저 매칭해, 사용자가 콕 집은 제품이 빠지지 않게 한다.
async function findRelevantParts(text) {
  const tokens = tokenize(text)
  if (tokens.length === 0) return []
  const strong = tokens.filter(isStrong)
  const weak = tokens.filter((t) => !isStrong(t))

  const byId = new Map()
  const add = (arr) => arr.forEach((p) => byId.has(p.name) || byId.set(p.name, p))

  if (strong.length) {
    add(
      await prisma.part.findMany({
        where: { OR: strong.map((t) => ({ name: { contains: t, mode: 'insensitive' } })) },
        take: 16,
        orderBy: { price: 'asc' },
        select: PART_SELECT,
      }),
    )
  }
  // 모델명으로 충분히 못 찾았으면 카테고리(+예산)로 후보를 채운다 — "20만원대 CPU 추천" 류
  if (byId.size < 8) {
    const category = detectCategory(text)
    if (category) {
      const maxBudget = parseMaxBudget(text)
      add(
        await prisma.part.findMany({
          where: maxBudget ? { category, price: { lte: maxBudget } } : { category },
          take: 12,
          orderBy: maxBudget ? { price: 'desc' } : { price: 'asc' }, // 예산 있으면 그 안에서 비싼(좋은)순
          select: PART_SELECT,
        }),
      )
    }
  }
  if (byId.size < 14 && weak.length) {
    add(
      await prisma.part.findMany({
        where: { OR: weak.map((t) => ({ name: { contains: t, mode: 'insensitive' } })) },
        take: 14 - byId.size,
        orderBy: { price: 'asc' },
        select: PART_SELECT,
      }),
    )
  }
  return [...byId.values()].slice(0, 16)
}

// 부품 한 줄 요약 (모델에 넣는 근거 텍스트)
function partLine(p) {
  const bits = [
    `[${p.category}]`, p.name,
    p.brand ? `· ${p.brand}` : '',
    `· ${won(p.price)}`,
    p.socket ? `· 소켓 ${p.socket}` : '',
    p.memoryType ? `· ${p.memoryType}` : '',
    p.tdp ? `· ${p.tdp}W` : '',
  ]
  return bits.filter(Boolean).join(' ')
}

// 완본체 카테고리 추정 (위에서부터 먼저 매칭)
const PC_CAT_RULES = [
  [/사무|문서|인강|오피스|학습|포스|키오스크/i, 'office'],
  [/작업|편집|렌더|영상|3d|모델링|머신러닝|크리에이|딥러닝|\bai\b/i, 'workstation'],
  [/하이엔드|끝판왕|플래그십|최고\s*사양|최상위/i, 'highend'],
  [/게이밍|게임|발로|배그|롤|오버워치|배틀그라운드|고주사율/i, 'gaming'],
]
function detectPcCategory(text) {
  for (const [re, c] of PC_CAT_RULES) if (re.test(text)) return c
  return null
}

// 사용자 메시지에 맞는 완본체(완성형 PC)를 찾아 추천 근거로 제공.
// 카테고리/예산/모델명 토큰으로 점수화해 상위 몇 개만 고른다.
function findRelevantPrebuilts(text) {
  if (!PREBUILTS.length) return []
  const tokens = tokenize(text)
  const cat = detectPcCategory(text)
  const maxBudget = parseMaxBudget(text)
  // 완본체 추천 의도 신호가 없으면 끼워넣지 않는다(부품 단독 질문 노이즈 방지)
  const pcIntent = cat || /완본체|완성형|조립\s*pc|완제품|본체|추천|견적|맞춰|싸게|가성비|pc\b/i.test(text)
  if (!pcIntent) return []

  const scored = []
  for (const pc of PREBUILTS) {
    let score = 0
    let relevant = false
    if (cat && pc.category === cat) {
      score += 3
      relevant = true
    }
    const hay = `${pc.name} ${pc.cpu ?? ''} ${pc.gpu ?? ''} ${pc.ram ?? ''}`.toLowerCase()
    for (const t of tokens) {
      if (hay.includes(t.toLowerCase())) {
        score += 2
        relevant = true
      }
    }
    if (maxBudget && pc.price && pc.price <= maxBudget) score += 1
    if (relevant && score > 0) scored.push({ pc, score })
  }
  if (scored.length) {
    // 예산 있으면 그 안에서 비싼(좋은)순, 없으면 저렴한순
    scored.sort((a, b) => b.score - a.score || (maxBudget ? b.pc.price - a.pc.price : a.pc.price - b.pc.price))
    return scored.slice(0, 6).map((s) => s.pc)
  }
  // 폴백: 카테고리·키워드 매칭이 없어도 예산이 있으면 그 예산대의 실제 완본체를 제공한다.
  // (근거가 비면 모델이 가짜 완본체를 지어내므로, 빈손으로 두지 않는다)
  if (maxBudget) {
    return PREBUILTS.filter((p) => p.price && p.price <= maxBudget)
      .sort((a, b) => b.price - a.price) // 예산 안에서 좋은(비싼)순
      .slice(0, 6)
  }
  return []
}

// 완본체 한 줄 요약 (모델에 넣는 근거 텍스트)
function pcLine(pc) {
  return [
    `[${pc.categoryLabel}]`, pc.name,
    `· ${won(pc.price)}`,
    pc.cpu ? `· CPU ${pc.cpu}` : '',
    pc.gpu ? `· GPU ${pc.gpu}` : '',
    pc.ram ? `· RAM ${pc.ram}` : '',
    pc.ssd ? `· ${pc.ssd}` : '',
  ].filter(Boolean).join(' ')
}

// ── AI가 확정한 직접 견적을 실제 DB 부품으로 해석해 "저장 가능한 견적"으로 만들기 ──
// 백엔드 PartCategory enum → 프론트 견적 카테고리 키
const ENUM_TO_KEY = {
  CPU: 'cpu', CPU_COOLER: 'cpuCooler', MEMORY: 'memory', MOTHERBOARD: 'motherboard',
  GPU: 'gpu', SSD: 'ssd', HDD: 'hdd', PSU: 'psu', CASE: 'case', OS: 'os',
}
// AI가 다른 표기를 써도 받아주는 별칭(공백 제거·소문자 정규화 후 매칭)
const CAT_ALIAS = {
  cpu: 'CPU', 프로세서: 'CPU', 씨피유: 'CPU',
  cpu쿨러: 'CPU_COOLER', cpucooler: 'CPU_COOLER', 쿨러: 'CPU_COOLER', cooler: 'CPU_COOLER',
  memory: 'MEMORY', 메모리: 'MEMORY', 램: 'MEMORY', ram: 'MEMORY',
  motherboard: 'MOTHERBOARD', mainboard: 'MOTHERBOARD', 메인보드: 'MOTHERBOARD', 마더보드: 'MOTHERBOARD',
  gpu: 'GPU', vga: 'GPU', 그래픽카드: 'GPU', 그래픽: 'GPU', 지포스: 'GPU',
  ssd: 'SSD', hdd: 'HDD', 하드: 'HDD', 하드디스크: 'HDD',
  psu: 'PSU', 파워: 'PSU', 전원: 'PSU', 전원공급: 'PSU',
  case: 'CASE', 케이스: 'CASE', 본체: 'CASE',
}
function toEnum(cat) {
  const raw = String(cat ?? '').trim()
  if (ENUM_TO_KEY[raw]) return raw // 이미 enum
  const norm = raw.replace(/[\s_]/g, '').toLowerCase()
  return CAT_ALIAS[norm] ?? null
}

// 견적 블록: 사람이 읽는 설명 뒤에 붙는 기계용 JSON (화면에는 표시하지 않음)
const BUILD_RE = /===\s*BUILD\s*===\s*([\s\S]*?)\s*===\s*END\s*===/i
// 저장 견적에 들어갈 부품 객체 필드(프론트 직접견적이 쓰는 모양과 동일)
const BUILD_PART_SELECT = {
  id: true, category: true, name: true, brand: true, price: true,
  tdp: true, imageUrl: true, socket: true, memoryType: true,
}

// 제품명으로 실제 DB 부품 1개 찾기: 정확 일치 → 부분 포함 → 강한 토큰 AND 순으로 시도
async function findPartByName(category, name) {
  let p = await prisma.part.findFirst({ where: { category, name }, select: BUILD_PART_SELECT })
  if (p) return p
  p = await prisma.part.findFirst({
    where: { category, name: { contains: name, mode: 'insensitive' } },
    select: BUILD_PART_SELECT,
  })
  if (p) return p
  const toks = tokenize(name).filter(isStrong).slice(0, 4)
  if (toks.length) {
    p = await prisma.part.findFirst({
      where: { category, AND: toks.map((t) => ({ name: { contains: t, mode: 'insensitive' } })) },
      orderBy: { price: 'asc' },
      select: BUILD_PART_SELECT,
    })
    if (p) return p
  }
  return null
}

// 견적 블록(JSON 문자열) → 저장 가능한 견적 { name, parts, price, caseImage } 또는 null
async function resolveBuild(block) {
  let data
  try {
    data = JSON.parse(block)
  } catch {
    return null
  }
  const items = Array.isArray(data?.items) ? data.items : []
  if (!items.length) return null
  const parts = {}
  for (const it of items.slice(0, 12)) {
    const enumCat = toEnum(it?.category)
    const name = String(it?.name ?? '').trim()
    if (!enumCat || enumCat === 'OS' || !name) continue
    const key = ENUM_TO_KEY[enumCat]
    if (!key || parts[key]) continue
    const found = await findPartByName(enumCat, name)
    if (found) parts[key] = found
  }
  // 신뢰 기준: CPU 포함 + 3개 이상 실제 부품으로 해석됐을 때만 저장 견적으로 인정
  if (!parts.cpu || Object.keys(parts).length < 3) return null
  const price = Object.values(parts).reduce((s, p) => s + (p.price ?? 0), 0)
  const name = (String(data?.name ?? '').trim().slice(0, 40)) || 'PC'
  return { name, parts, price, caseImage: parts.case?.imageUrl ?? null }
}

// 폴백: AI가 견적 블록을 안 넣었어도, 답변 본문에 "그대로 인용된" 컴친 DB 제품명을
// 찾아 견적을 구성한다. 근거로 넘긴 실제 부품만 대조하므로 허위 제품이 끼지 않는다.
const normName = (s) => String(s).toLowerCase().replace(/[\s[\]()·,_-]/g, '')
function buildFromReply(reply, groundingParts) {
  const replyN = normName(reply)
  const parts = {}
  for (const p of groundingParts) {
    const key = ENUM_TO_KEY[p.category]
    if (!key || key === 'os' || parts[key]) continue
    const n = normName(p.name)
    if (n.length >= 6 && replyN.includes(n)) parts[key] = p // 본문이 이 제품을 그대로 인용
  }
  if (!parts.cpu || Object.keys(parts).length < 3) return null
  const price = Object.values(parts).reduce((s, p) => s + (p.price ?? 0), 0)
  return { name: 'PC', parts, price, caseImage: parts.case?.imageUrl ?? null }
}

// 완본체 저장 블록: 추천한 완성형 PC를 즐겨찾기에 저장할 때 본문 끝에 붙는 기계용 JSON.
const SAVE_PC_RE = /===\s*SAVE_PC\s*===\s*([\s\S]*?)\s*===\s*END\s*===/i
// 블록의 이름을 실제 완본체 목록과 대조해 식별(프론트가 id로 이미지까지 찾아 즐겨찾기에 담는다).
function resolvePrebuiltSave(block) {
  let data
  try {
    data = JSON.parse(block)
  } catch {
    return null
  }
  const name = String(data?.name ?? '').trim()
  if (!name) return null
  const target = normName(name)
  const pc =
    PREBUILTS.find((p) => normName(p.name) === target) ||
    PREBUILTS.find((p) => {
      const n = normName(p.name)
      return n.length >= 6 && (n.includes(target) || target.includes(n))
    })
  if (!pc) return null
  return { id: pc.id, name: pc.name, price: pc.price, categoryLabel: pc.categoryLabel }
}

// 예산형 견적 요청("80만원대 게이밍 PC")일 때, AI가 실제 DB 제품명으로 견적을 짤 수
// 있도록 카테고리별 후보 부품(팔레트)을 근거로 제공한다. 예산을 카테고리별 상한으로 배분.
const PALETTE_CATS = ['CPU', 'MOTHERBOARD', 'MEMORY', 'GPU', 'SSD', 'PSU', 'CASE', 'CPU_COOLER']
const CAT_BUDGET_SHARE = {
  CPU: 0.28, MOTHERBOARD: 0.16, MEMORY: 0.12, GPU: 0.5,
  SSD: 0.14, PSU: 0.14, CASE: 0.12, CPU_COOLER: 0.1,
}
async function findBuildPalette(text) {
  const budget = parseMaxBudget(text)
  const rows = await Promise.all(
    PALETTE_CATS.map((cat) => {
      const cap = budget ? Math.max(20000, Math.round(budget * (CAT_BUDGET_SHARE[cat] ?? 0.2))) : null
      return prisma.part.findMany({
        where: cap ? { category: cat, price: { lte: cap } } : { category: cat },
        orderBy: cap ? { price: 'desc' } : { price: 'asc' }, // 예산 있으면 그 안에서 좋은(비싼)순
        take: 3,
        select: PART_SELECT,
      })
    }),
  )
  return rows.flat()
}

const SYSTEM = `너는 PC 쇼핑몰 "컴친(컴퓨터 친구)"의 AI 비서야. 말투는 친근한 한국어 존댓말. 오늘은 2026년이야.
역할: (1) 견적 추천·상담 (2) 부품 호환성 진단 (3) 제품 검색/질의응답.
규칙:
- 아래 "컴친 DB 제품" 목록에 있는 제품은 지금 컴친에서 실제 판매 중인 최신 제품이야. 네 학습 데이터에 없거나 '미출시'로 알고 있어도, 목록의 정보(가격·소켓·메모리·전력)를 사실로 신뢰하고 그대로 사용해. 절대 "아직 출시되지 않았다/정보가 없다"고 말하지 마. (예: RTX 50 시리즈, 라이젠 9000 시리즈 등은 이미 출시된 제품임)
- "컴친 완본체" 목록이 함께 주어지면, 그건 조립까지 끝나 바로 살 수 있는 완성형 PC야. 사용자가 완본체/완성형/추천 PC를 원하면, 부품을 일일이 고르는 대신 이 완본체를 이름·가격과 함께 1~3개 추천해도 좋아. 직접 견적(부품 조합)과 완본체 추천을 상황에 맞게 안내해.
- [환각 금지·매우 중요] 완본체나 부품을 추천할 때는, 반드시 위에 주어진 "컴친 완본체"·"컴친 DB 제품" 목록에 실제로 있는 이름과 가격만 그대로 써. 목록에 없는 제품명·가격을 절대 지어내지 마(예: 목록에 없는 "○○ 멀티팩/오피스팩" 같은 이름이나 임의의 가격 금지). 추천할 완본체가 목록에 없으면, 차라리 예산/용도를 한 번 더 묻거나 "직접 견적으로 짜드릴까요?"라고 제안해.
- 완본체의 카테고리/위치를 물으면, 그 완본체 목록 항목 앞의 라벨(게이밍 PC·작업용 PC·하이엔드·사무용) 그대로 정확히 답해. "완본체 PC 카테고리" 같은 없는 분류를 만들지 말고, 모르면 "사이트 상단 카테고리에서 확인하실 수 있어요"라고만 해.
- 목록에 없는 제품만 일반 지식으로 보완하고, 이때는 "정확한 가격/재고는 사이트에서 확인" 정도로 안내해.
- 호환성은 CPU·메인보드 소켓 일치, 메모리(DDR4/DDR5) 세대 일치, 파워 용량(부품 TDP 합 대비 여유)을 기준으로 설명해.
- 가격은 원화(원)로. "N만원"은 N×10,000원이야 (예: 20만원=200,000원, 80만원=800,000원). 단위를 절대 헷갈리지 마.
- [되묻기] 견적/PC 추천 요청인데 판단에 필요한 핵심 정보(예산, 주 용도)가 빠져 있으면, 바로 추천하지 말고 먼저 1~3개의 짧은 질문으로 되물어봐. (예: "예산은 어느 정도로 생각하세요?", "주로 어떤 게임/작업에 쓰실 건가요?", "선호하는 브랜드·크기·디자인이 있나요?") 한 번에 너무 많이 묻지 말고 핵심부터.
- 단, 사용자가 이미 예산·용도를 말했거나 "아무거나/알아서/빨리" 같은 신호를 주면 더 묻지 말고, 합리적인 가정을 한 줄로 밝힌 뒤 바로 추천해. 되묻기는 보통 1회면 충분하고, 답을 받으면 그 정보로 추천을 완성해.
- 추천 시 카테고리별로 한 개씩 묶어서 제안하고, 왜 그 조합인지 한두 줄로 이유를 붙여.
- [견적 저장 블록] 사용자에게 '직접 견적(부품 조합)'으로 완성된 PC를 확정 추천할 때는, 사람이 읽는 설명을 모두 적은 뒤 맨 끝에 아래 형식의 블록을 딱 한 번만 덧붙여. 이 블록은 화면에 보이지 않고, 추천한 견적을 사용자의 '직접 견적'에 자동 저장하는 용도로만 쓰여.
  ===BUILD===
  {"name":"게이밍 PC","items":[{"category":"CPU","name":"<컴친 DB 제품명 그대로>"},{"category":"MOTHERBOARD","name":"..."},{"category":"MEMORY","name":"..."},{"category":"GPU","name":"..."},{"category":"SSD","name":"..."},{"category":"PSU","name":"..."},{"category":"CASE","name":"..."}]}
  ===END===
  블록 규칙: (a) category는 CPU, CPU_COOLER, MEMORY, MOTHERBOARD, GPU, SSD, HDD, PSU, CASE 중에서만 쓴다. (b) name은 위 "컴친 DB 제품" 목록에 있는 제품명을 토씨 하나 안 틀리게 그대로 복사한다(임의로 지어내거나 변형 금지). 목록에 없는 제품은 블록에 넣지 마. (c) 사용자에게 되묻는 중이거나, 완본체만 추천하거나, 단일 부품 질문에 답할 때는 이 블록을 절대 넣지 마. (d) name 칸을 채울 실제 DB 제품이 없으면 블록 자체를 생략해.
- [완본체 저장 블록] 사용자가 추천한 완본체(완성형 PC)를 "저장/찜/즐겨찾기/담아줘"라고 하면, 완본체는 직접 견적처럼 부품별로는 저장되지 않지만 '즐겨찾기'에는 저장할 수 있어. "즐겨찾기에 저장해드릴게요"라고 답한 뒤, 사람이 읽는 설명 끝에 아래 블록을 딱 한 번 덧붙여(화면에 안 보임). 절대 "저장할 수 없다"고 거절하지 마.
  ===SAVE_PC===
  {"name":"<저장할 완본체의 정확한 이름 — 위 \\"컴친 완본체\\" 목록 그대로>"}
  ===END===
  규칙: name은 반드시 "컴친 완본체" 목록에 실제로 있는 이름을 그대로 복사. 어떤 완본체를 말하는지 불명확하면 먼저 어떤 제품인지 되물어보고, 명확할 때만 블록을 넣어.
- 모르는 건 솔직히 말하되, 위 DB 제품을 모른다고 하지는 마. 과장·허위 정보 금지.
- 답변은 너무 길지 않게, 필요하면 짧은 목록/단계로.`

// POST /api/ai/chat  { messages:[{role,content}], build?:[{category,name,price}] }
router.post('/chat', async (req, res, next) => {
  try {
    if (!isGeminiConfigured()) {
      return res.status(503).json({
        message: 'AI 비서가 아직 준비 중이에요. (서버에 Gemini API 키 설정 필요)',
        notConfigured: true,
      })
    }

    // 사용자별 속도 제한
    const rl = checkRateLimit(req)
    if (!rl.ok) {
      return res.status(429).json({
        message: `메시지를 너무 빠르게 보내고 있어요. ${rl.retryAfter}초 후 다시 시도해 주세요. 🙏`,
        rateLimited: true,
      })
    }

    const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-12) : []
    const lastUser = [...messages].reverse().find((m) => m?.role === 'user')?.content ?? ''
    if (!lastUser.trim()) {
      return res.status(400).json({ message: '메시지를 입력해주세요.' })
    }

    // 되묻기(예산·용도 질문) 뒤 짧은 답변에는 검색 키워드가 없어, 마지막 메시지만 보면
    // 근거를 못 찾아 모델이 제품·가격을 지어낼 수 있다. 최근 사용자 발화 몇 개를 합쳐 근거를 찾는다.
    const contextText = messages
      .filter((m) => m?.role === 'user')
      .slice(-3)
      .map((m) => String(m.content ?? ''))
      .join('  ')

    // 근거 데이터: 관련 부품 + 관련 완본체 + (있으면) 사용자의 현재 견적
    const parts = await findRelevantParts(contextText)
    // 견적/추천 의도인데 카테고리가 부족하면, 견적을 짤 수 있도록 카테고리별 후보를 채운다
    const buildIntent = !!detectPcCategory(contextText) || /견적|추천|맞춰|조립|컴퓨터|풀세트|세트/.test(contextText)
    if (buildIntent && new Set(parts.map((p) => p.category)).size < 4) {
      const seen = new Set(parts.map((p) => p.name))
      for (const p of await findBuildPalette(contextText)) {
        if (!seen.has(p.name)) {
          parts.push(p)
          seen.add(p.name)
        }
      }
    }
    const pcs = findRelevantPrebuilts(contextText)
    const build = Array.isArray(req.body?.build) ? req.body.build.slice(0, 20) : []

    let grounding = ''
    if (parts.length) {
      grounding += `[컴친 DB 제품 — 지금 판매 중인 실제 제품, 이 정보를 근거로 답할 것]\n${parts.slice(0, 32).map(partLine).join('\n')}`
    }
    if (pcs.length) {
      grounding +=
        `${grounding ? '\n\n' : ''}[컴친 완본체 — 조립까지 끝나 바로 살 수 있는 완성형 PC]\n` +
        pcs.map(pcLine).join('\n')
    }
    if (build.length) {
      grounding +=
        `${grounding ? '\n\n' : ''}[사용자가 현재 담은 견적]\n` +
        build.map((b) => `${b.category ?? ''}: ${b.name ?? ''} (${won(b.price)})`).join('\n')
    }

    // 그라운딩은 systemInstruction이 아니라 "마지막 사용자 메시지"에 붙여야 모델이 확실히 활용한다.
    const augmented = messages.map((m) => ({ ...m }))
    if (grounding) {
      for (let i = augmented.length - 1; i >= 0; i--) {
        if (augmented[i].role === 'user') {
          augmented[i].content = `${grounding}\n\n---\n질문: ${augmented[i].content}`
          break
        }
      }
    }

    const reply = await generateChat({ system: SYSTEM, messages: augmented })

    // 견적 저장 블록이 있으면 본문에서 떼어내고(화면 비표시), 실제 DB 부품으로 해석해
    // 저장 가능한 견적으로 변환한다. 해석 실패 시 savedBuild는 null(일반 답변만).
    let text = reply || ''
    let savedBuild = null
    let savePc = null

    // 완본체 저장 블록 — 추천한 완성형 PC를 즐겨찾기에 저장 (먼저 떼어낸다)
    const pm = text.match(SAVE_PC_RE)
    if (pm) {
      text = text.replace(SAVE_PC_RE, '').trim()
      try {
        savePc = resolvePrebuiltSave(pm[1])
      } catch {
        savePc = null
      }
    }

    const m = text.match(BUILD_RE)
    if (m) {
      text = text.replace(BUILD_RE, '').trim()
      try {
        savedBuild = await resolveBuild(m[1])
      } catch {
        savedBuild = null
      }
    }
    // 블록이 없거나 해석 실패해도, 본문에 인용된 DB 제품으로 견적을 구성(폴백)
    // 단, 완본체 저장(savePc) 의도일 땐 견적 자동저장과 겹치지 않게 건너뛴다.
    if (!savedBuild && !savePc) {
      try {
        savedBuild = buildFromReply(text, parts)
      } catch {
        savedBuild = null
      }
    }

    res.json({
      reply: text || '죄송해요, 답변을 만들지 못했어요. 다시 한 번 물어봐 주세요.',
      savedBuild,
      savePc,
    })
  } catch (err) {
    if (err?.message === 'GEMINI_NOT_CONFIGURED') {
      return res.status(503).json({ message: 'AI 비서가 아직 준비 중이에요.', notConfigured: true })
    }
    // 전역 대기열이 가득 참(동시 사용자 폭주) → 잠시 후 안내
    if (err?.code === 'LIMITER_BUSY') {
      return res.status(429).json({
        message: '지금 AI를 이용하는 분이 많아요. 잠깐 뒤에 다시 시도해 주세요. 🙏',
        rateLimited: true,
      })
    }
    // Gemini 무료 한도 초과(429/RESOURCE_EXHAUSTED) → 친절 안내
    const status = err?.status ?? err?.response?.status
    const msg = String(err?.message ?? '')
    if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(msg)) {
      return res.status(429).json({
        message: '지금 AI 이용량이 많아요. 잠시 후(약 1분 뒤) 다시 시도해 주세요. 🙏',
        rateLimited: true,
      })
    }
    // Gemini 모델 일시 과부하(503 UNAVAILABLE) → raw 에러 노출 대신 친절 안내
    if (status === 503 || /UNAVAILABLE|overloaded|high demand/i.test(msg)) {
      return res.status(503).json({
        message: 'AI가 지금 잠시 붐비고 있어요. 몇 초 뒤 다시 시도해 주세요. 🙏',
        retryable: true,
      })
    }
    next(err)
  }
})

export default router
