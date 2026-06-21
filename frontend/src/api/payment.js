import client from './client'

// 결제수단(계좌/카드) + 결제 API. JWT 는 HttpOnly 쿠키(withCredentials)로 처리됨.

export async function apiListMethods() {
  const res = await client.get('/payments')
  return res.data.methods
}

export async function apiAddMethod(data) {
  const res = await client.post('/payments', data)
  return res.data.method
}

export async function apiDeleteMethod(id) {
  await client.delete(`/payments/${id}`)
}

// 결제(포트폴리오) — 결제수단 검증 후 성공 응답 { ok, amount, paidAt, method }
// details: 직접 견적 구매 시 부품 내역 [{ category, name, price }]
export async function apiCheckout({ methodId, amount, summary, details }) {
  const res = await client.post('/payments/checkout', { methodId, amount, summary, details })
  return res.data
}

// 결제 이력 — [{ id, amount, summary, methodType, methodBank, numberMasked, paidAt }]
export async function apiListHistory() {
  const res = await client.get('/payments/history')
  return res.data.history
}
