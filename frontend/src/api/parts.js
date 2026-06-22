import client from './client'

// 카테고리별 부품 목록 조회 (categoryEnum 예: 'CPU', 'GPU')
export async function fetchParts(categoryEnum) {
  const res = await client.get('/parts', {
    params: categoryEnum ? { category: categoryEnum } : undefined,
    timeout: 60000, // 콜드스타트(무료 서버/Neon 깨우기) 대비
  })
  return res.data.parts // { count, parts } 중 parts 배열
}

// 전체 부품을 한 번에 조회 (부품 페이지 — 카테고리별 9개 병렬 요청 대신 1회).
export async function fetchAllParts() {
  const res = await client.get('/parts', { timeout: 60000 })
  return res.data.parts
}

// 부품 단건 조회 (id 로)
export async function fetchPart(id) {
  const res = await client.get(`/parts/${id}`)
  return res.data
}
