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
  category: true, name: true, brand: true, price: true,
  tdp: true, socket: true, memoryType: true,
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
  // 예산 있으면 그 안에서 비싼(좋은)순, 없으면 저렴한순
  scored.sort((a, b) => b.score - a.score || (maxBudget ? b.pc.price - a.pc.price : a.pc.price - b.pc.price))
  return scored.slice(0, 6).map((s) => s.pc)
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

const SYSTEM = `너는 PC 쇼핑몰 "컴친(컴퓨터 친구)"의 AI 비서야. 말투는 친근한 한국어 존댓말. 오늘은 2026년이야.
역할: (1) 견적 추천·상담 (2) 부품 호환성 진단 (3) 제품 검색/질의응답.
규칙:
- 아래 "컴친 DB 제품" 목록에 있는 제품은 지금 컴친에서 실제 판매 중인 최신 제품이야. 네 학습 데이터에 없거나 '미출시'로 알고 있어도, 목록의 정보(가격·소켓·메모리·전력)를 사실로 신뢰하고 그대로 사용해. 절대 "아직 출시되지 않았다/정보가 없다"고 말하지 마. (예: RTX 50 시리즈, 라이젠 9000 시리즈 등은 이미 출시된 제품임)
- "컴친 완본체" 목록이 함께 주어지면, 그건 조립까지 끝나 바로 살 수 있는 완성형 PC야. 사용자가 완본체/완성형/추천 PC를 원하면, 부품을 일일이 고르는 대신 이 완본체를 이름·가격과 함께 1~3개 추천해도 좋아. 직접 견적(부품 조합)과 완본체 추천을 상황에 맞게 안내해.
- 목록에 없는 제품만 일반 지식으로 보완하고, 이때는 "정확한 가격/재고는 사이트에서 확인" 정도로 안내해.
- 호환성은 CPU·메인보드 소켓 일치, 메모리(DDR4/DDR5) 세대 일치, 파워 용량(부품 TDP 합 대비 여유)을 기준으로 설명해.
- 가격은 원화(원)로. "N만원"은 N×10,000원이야 (예: 20만원=200,000원, 80만원=800,000원). 단위를 절대 헷갈리지 마.
- 추천 시 카테고리별로 한 개씩 묶어서 제안하고, 왜 그 조합인지 한두 줄로 이유를 붙여.
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

    // 근거 데이터: 관련 부품 + 관련 완본체 + (있으면) 사용자의 현재 견적
    const parts = await findRelevantParts(lastUser)
    const pcs = findRelevantPrebuilts(lastUser)
    const build = Array.isArray(req.body?.build) ? req.body.build.slice(0, 20) : []

    let grounding = ''
    if (parts.length) {
      grounding += `[컴친 DB 제품 — 지금 판매 중인 실제 제품, 이 정보를 근거로 답할 것]\n${parts.map(partLine).join('\n')}`
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

    res.json({ reply: reply || '죄송해요, 답변을 만들지 못했어요. 다시 한 번 물어봐 주세요.' })
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
