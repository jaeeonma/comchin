// 완본체(추천 PC) 카드용 대표 이미지를 네이버 쇼핑 검색 API로 받아 저장하는 스크립트.
// 합법적 공식 Open API 사용 (크롤링 아님). 같은 이미지를 쓰는 제품이 없도록 전역 중복 제거.
//
// 사용법:
//   backend/.env 에 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 가 있어야 함.
//   node scripts/fetch-pc-images.js          ← 아래 TARGETS 의 PC 이미지를 받아 저장
//   node scripts/fetch-pc-images.js --all     ← (참고) 모든 prebuilt id 를 받고 싶을 때 직접 TARGETS 확장
//
// 저장 위치: ../frontend/public/images/builds/<id>.jpg
// 이미 같은 카드가 쓰던 다른 제품과 겹치지 않게, 검색 결과에서 "아직 안 쓴 이미지"를 고른다.

import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { env } from '../src/config/env.js'

const ID = env.naverClientId
const SECRET = env.naverClientSecret

if (!ID || !SECRET) {
  console.error('❌ NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 가 .env 에 없습니다.')
  process.exit(1)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(__dirname, '../../frontend/public/images/builds')

// 중복 이미지를 쓰던 신규 PC 36개 — id 별로 "제품에 맞는" 검색어.
// 검색어는 조립PC/본체 형태의 대표 이미지를 노린다(색상·등급·용도 반영).
const TARGETS = [
  // ── 게이밍 21~30 ──
  ['gaming-21', '게이밍 조립PC RTX 4060 입문 본체'],
  ['gaming-22', '게이밍 컴퓨터 RTX 5060 라이젠 본체'],
  ['gaming-23', '화이트 게이밍 조립PC RTX 5060 Ti'],
  ['gaming-24', '게이밍 조립PC RTX 5070 Ti 본체 i5'],
  ['gaming-25', '게이밍 컴퓨터 RTX 5070 라이젠7 본체'],
  ['gaming-26', '화이트 게이밍 컴퓨터 RTX 5070 Ti 본체'],
  ['gaming-27', '라데온 RX 9070 XT 게이밍 조립PC 본체'],
  ['gaming-28', '7800X3D RTX 5080 게이밍 조립PC'],
  ['gaming-29', '화이트 게이밍 빅타워 i9 RTX 5080'],
  ['gaming-30', '블랙 게이밍 조립PC RTX 5090 빅타워'],
  // ── 작업용 21~30 ──
  ['workstation-21', 'RTX 4060 Ti 작업용 컴퓨터 본체'],
  ['workstation-22', 'RTX 4070 조립PC 작업용 미들타워 데스크탑'],
  ['workstation-23', 'RTX 5070 작업용 조립PC 라이젠7'],
  ['workstation-24', '화이트 작업용 컴퓨터 RTX 5070 Ti 본체'],
  ['workstation-25', 'RTX 5080 3D 렌더링 작업용 컴퓨터'],
  ['workstation-26', '화이트 작업용 컴퓨터 i9 RTX 5080'],
  ['workstation-27', 'RTX 5080 라이젠9 작업용 조립PC'],
  ['workstation-28', 'RTX 5090 작업용 컴퓨터 i9 본체'],
  ['workstation-29', 'RTX 5090 AI 딥러닝 워크스테이션 본체'],
  ['workstation-30', '빅타워 E-ATX 고사양 조립컴퓨터 작업용 데스크탑 본체'],
  // ── 하이엔드 21~30 ──
  ['highend-21', '화이트 하이엔드 조립PC 9800X3D RTX 5080'],
  ['highend-22', '파노라마 하이엔드 게이밍 PC RTX 5080'],
  ['highend-23', '하이엔드 조립PC 9900X3D RTX 5090'],
  ['highend-24', '화이트 하이엔드 PC i9 RTX 5090'],
  ['highend-25', '하이엔드 게이밍 PC 9950X3D RTX 5090'],
  ['highend-26', '커스텀 수냉 게이밍 PC i9 RTX 5090'],
  ['highend-27', '화이트 커스텀 수냉 게이밍 PC RTX 5090'],
  ['highend-28', 'O11 다이나믹 커스텀 수냉 게이밍 PC 본체'],
  ['highend-29', '커스텀 수냉 빅타워 RTX 5090 하이엔드'],
  ['highend-30', '플래그십 커스텀 수냉 RTX 5090 컴퓨터'],
  // ── 사무용 21~30 ──
  ['office-21', '미니PC 인텔 N97'],
  ['office-22', '라이젠5 5600G 사무용 컴퓨터 본체'],
  ['office-23', '슬림 사무용 컴퓨터 i3 14100'],
  ['office-24', '미니PC 라이젠5 8500G 사무용'],
  ['office-25', '사무용 컴퓨터 i5 12400 데스크탑'],
  ['office-26', '슬림 사무용 PC 라이젠 8600G'],
  ['office-27', '사무용 데스크탑 i5 14400 본체'],
  ['office-28', '사무용 컴퓨터 라이젠7 8700G 본체'],
  ['office-29', '사무용 컴퓨터 i7 14700 데스크탑'],
  ['office-30', '사무용 게이밍 컴퓨터 i7 RTX 4060'],
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function searchNaver(query) {
  const url = `https://openapi.naver.com/v1/search/shop.json?query=${encodeURIComponent(query)}&display=50&sort=sim`
  const res = await fetch(url, {
    headers: { 'X-Naver-Client-Id': ID, 'X-Naver-Client-Secret': SECRET },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.items ?? []
}

async function fetchBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`이미지 HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

const md5 = (buf) => crypto.createHash('md5').update(buf).digest('hex')

// 현재 받는 대상(targetIds)을 제외한 기존 빌드 이미지들의 해시를 모아둔다.
// → 새로 받는 이미지가 기존/다른 제품과 내용까지 똑같지 않도록(중복 방지).
async function seedExistingHashes(targetIds) {
  const hashes = new Set()
  const files = await fs.readdir(OUT_DIR)
  for (const f of files) {
    if (!f.endsWith('.jpg')) continue
    if (targetIds.has(f.replace(/\.jpg$/, ''))) continue
    try {
      hashes.add(md5(await fs.readFile(path.join(OUT_DIR, f))))
    } catch {
      /* 무시 */
    }
  }
  return hashes
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })

  // CLI 로 특정 id 만 받을 수 있다: node scripts/fetch-pc-images.js workstation-18 office-13
  const onlyIds = process.argv.slice(2).filter((a) => !a.startsWith('--'))
  const targets = onlyIds.length ? TARGETS.filter(([id]) => onlyIds.includes(id)) : TARGETS

  const targetIds = new Set(targets.map(([id]) => id))
  const usedHashes = await seedExistingHashes(targetIds) // 내용 기준 중복 방지
  let ok = 0
  const failed = []

  for (const [id, query] of targets) {
    try {
      const items = await searchNaver(query)
      // 검색 결과를 순서대로 시도해 "내용이 처음 보는" 이미지를 고른다.
      let chosen = null
      for (const it of items) {
        if (!it.image) continue
        let buf
        try {
          buf = await fetchBuffer(it.image)
        } catch {
          continue
        }
        if (buf.length < 1500) continue
        const h = md5(buf)
        if (usedHashes.has(h)) continue // 기존/다른 제품과 내용 중복 → 건너뜀
        usedHashes.add(h)
        chosen = { buf, title: it.title }
        break
      }
      if (!chosen) {
        failed.push(id)
        console.log(`  ✗ ${id} — 중복 아닌 이미지를 못 찾음 (검색어: ${query})`)
        await sleep(120)
        continue
      }
      await fs.writeFile(path.join(OUT_DIR, `${id}.jpg`), chosen.buf)
      ok++
      console.log(`  ✓ ${id}  ←  ${chosen.title.replace(/<[^>]*>/g, '')} (${(chosen.buf.length / 1024).toFixed(0)}KB)`)
    } catch (e) {
      failed.push(id)
      console.log(`  ✗ ${id} — ${e.message}`)
    }
    await sleep(150) // 레이트리밋 여유
  }

  console.log(`\n✅ 완료 — 성공 ${ok}개 / 실패 ${failed.length}개`)
  if (failed.length) console.log('실패한 id:', failed.join(', '))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
