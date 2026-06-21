import client from './client'

// 컴친 AI 비서 — 견적 추천/상담, 호환성 진단, 제품 검색.
// messages: [{ role:'user'|'assistant', content }], build: 현재 담은 견적(선택)
export async function apiAiChat({ messages, build }) {
  const res = await client.post('/ai/chat', { messages, build }, { timeout: 30000 })
  return res.data // { reply } 또는 { message, notConfigured }
}
