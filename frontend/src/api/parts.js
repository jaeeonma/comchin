import client from './client'

// 카테고리별 부품 목록 조회 (categoryEnum 예: 'CPU', 'GPU')
export async function fetchParts(categoryEnum) {
  const res = await client.get('/parts', {
    params: categoryEnum ? { category: categoryEnum } : undefined,
  })
  return res.data.parts // { count, parts } 중 parts 배열
}

// 부품 단건 조회 (id 로)
export async function fetchPart(id) {
  const res = await client.get(`/parts/${id}`)
  return res.data
}
