// Gemini(제미나이) 클라이언트. 키는 .env(GEMINI_API_KEY)에서만 읽고, 프론트엔드로 절대 노출하지 않는다.
import { GoogleGenAI } from '@google/genai'
import { Limiter } from './limiter.js'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

// 사이트 전체 Gemini 호출을 한 곳에 모아 조절한다(키 1개 = 한도 공유).
// 환경변수로 조정 가능. 무료 한도는 분당 요청 수가 빡빡하므로 RPM에 맞춰 간격을 둔다.
const num = (v, d) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : d
}
const RPM = num(process.env.GEMINI_RPM, 10) // 분당 허용 요청 수 (무료 한도 기준)
const geminiLimiter = new Limiter({
  maxConcurrent: num(process.env.GEMINI_MAX_CONCURRENT, 2),
  minIntervalMs: RPM > 0 ? Math.ceil(60_000 / RPM) : 0, // 예: 10 RPM → 6초 간격
  maxWaitMs: num(process.env.GEMINI_MAX_WAIT_MS, 12_000), // 이보다 오래 기다릴 요청은 즉시 거절
})

// 모니터링/디버그용 현재 큐 상태
export function geminiQueueStats() {
  return { active: geminiLimiter.active, pending: geminiLimiter.pending }
}

let client = null
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null // 키 미설정 → 호출부에서 안내 메시지 처리
  if (!client) client = new GoogleGenAI({ apiKey })
  return client
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY)
}

// 일시적(과부하/속도제한) 오류면 재시도할 가치가 있다.
function isTransient(err) {
  const status = err?.status ?? err?.response?.status
  const msg = String(err?.message ?? '')
  return status === 503 || status === 429 || /UNAVAILABLE|overloaded|high demand|RESOURCE_EXHAUSTED/i.test(msg)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 멀티턴 대화. messages: [{ role: 'user' | 'assistant', content }]
// systemInstruction(역할/지침)과 함께 모델에 보낸다.
export async function generateChat({ system, messages }) {
  const ai = getClient()
  if (!ai) throw new Error('GEMINI_NOT_CONFIGURED')

  const contents = (messages ?? [])
    .filter((m) => m && m.content)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }],
    }))

  const config = {
    systemInstruction: system,
    temperature: 0.6,
    maxOutputTokens: 2048,
    // 2.5-flash는 답변 전 "thinking"에 출력 토큰을 소비해 답이 잘릴 수 있다.
    // 상담 챗봇엔 확장 추론이 불필요하므로 끄고(0) 전체 토큰을 답변에 쓴다.
    thinkingConfig: { thinkingBudget: 0 },
  }

  // 전역 스케줄러를 통해서만 실제 호출한다(동시 실행·분당 한도 보호).
  // 대기열이 너무 길면 schedule()이 LIMITER_BUSY로 즉시 거절한다.
  return geminiLimiter.schedule(async () => {
    // 일시 과부하(503 등)는 짧게 지수 백오프로 재시도한다.
    let lastErr
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({ model: MODEL, contents, config })
        return response.text ?? ''
      } catch (err) {
        lastErr = err
        if (!isTransient(err) || attempt === 2) throw err
        await sleep(700 * (attempt + 1)) // 0.7s, 1.4s
      }
    }
    throw lastErr
  })
}
