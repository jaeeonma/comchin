// Gemini(제미나이) 클라이언트. 키는 .env(GEMINI_API_KEY)에서만 읽고, 프론트엔드로 절대 노출하지 않는다.
import { GoogleGenAI } from '@google/genai'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

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

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: system,
      temperature: 0.6,
      maxOutputTokens: 1024,
    },
  })

  return response.text ?? ''
}
