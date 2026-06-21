// 네이버 쇼핑 검색 API로 부품 이미지(썸네일)와 가격을 채우는 스크립트.
// 합법적 공식 Open API 사용 (크롤링 아님). 네이버 개발자센터에서 키 발급 필요.
//
// 사용법:
//   1) backend/.env 에 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 입력
//   2) node scripts/enrich-from-naver.js            ← 이미지 없는 부품만 이미지 채움
//      node scripts/enrich-from-naver.js --price     ← 가격도 네이버 최저가로 갱신
//      node scripts/enrich-from-naver.js --overwrite ← 이미지 있는 부품도 덮어씀
//
// 참고: 기존 로컬 이미지(/images/parts/...)가 있는 부품은 기본적으로 건드리지 않습니다.

import { env } from '../src/config/env.js'
import { prisma } from '../src/lib/prisma.js'

const ID = env.naverClientId
const SECRET = env.naverClientSecret
const UPDATE_PRICE = process.argv.includes('--price')
const OVERWRITE = process.argv.includes('--overwrite')

if (!ID || !SECRET) {
  console.error(
    '❌ NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 가 .env 에 없습니다.\n' +
      '   네이버 개발자센터(https://developers.naver.com)에서 애플리케이션을 등록하고\n' +
      '   "검색" API를 추가한 뒤 Client ID/Secret 을 .env 에 넣어주세요.',
  )
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const stripTags = (s) => (s ? s.replace(/<[^>]*>/g, '') : s)

// 네이버 쇼핑 검색
async function searchNaver(query) {
  const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(
    query,
  )}&display=5&sort=sim`
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': ID, 'X-Naver-Client-Secret': SECRET },
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${await res.text()}`)
  }
  const data = await res.json()
  return data.items ?? []
}

async function main() {
  const where = OVERWRITE ? {} : { imageUrl: null }
  const parts = await prisma.part.findMany({ where, orderBy: { category: 'asc' } })
  console.log(
    `🔎 대상 부품 ${parts.length}개 (이미지 ${OVERWRITE ? '전체 덮어쓰기' : '없는 것만'}, 가격 갱신: ${UPDATE_PRICE ? 'O' : 'X'})`,
  )

  let ok = 0
  let fail = 0
  for (const part of parts) {
    try {
      const items = await searchNaver(part.name)
      if (items.length === 0) {
        console.log('  ✗ 검색결과 없음:', part.name)
        fail++
        await sleep(150)
        continue
      }
      const top = items[0]
      const data = {}
      if (top.image) data.imageUrl = top.image
      if (UPDATE_PRICE && top.lprice) data.price = parseInt(top.lprice, 10)

      if (Object.keys(data).length > 0) {
        await prisma.part.update({ where: { id: part.id }, data })
        ok++
        console.log(
          `  ✓ ${part.name}  →  ${stripTags(top.title)}${UPDATE_PRICE && top.lprice ? ` (${Number(top.lprice).toLocaleString()}원)` : ''}`,
        )
      }
    } catch (e) {
      fail++
      console.log('  ✗ 오류:', part.name, '·', e.message)
    }
    await sleep(150) // 레이트리밋 여유
  }

  console.log(`\n✅ 완료 — 성공 ${ok}개, 실패 ${fail}개`)
  console.log(
    '※ 검색 매칭이라 가끔 엉뚱한 이미지가 섞일 수 있어요. prisma studio 로 한 번 훑어보고 이상한 건 수정하세요.',
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
