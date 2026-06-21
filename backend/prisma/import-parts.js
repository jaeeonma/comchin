// prisma/seed-data/parts.json 의 부품을 현재 DATABASE_URL 의 DB에 넣는다.
// 이미 있는(id 동일) 부품은 건너뛴다 → 여러 번 실행해도 안전(idempotent).
// 배포(Render) 빌드 단계 또는 로컬에서 Neon URL 로 실행: node prisma/import-parts.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../src/lib/prisma.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const file = path.join(__dirname, 'seed-data', 'parts.json')

if (!fs.existsSync(file)) {
  console.log('parts.json 이 없습니다. 먼저 node prisma/export-parts.js 를 실행하세요.')
  process.exit(0)
}

const parts = JSON.parse(fs.readFileSync(file, 'utf8'))
const before = await prisma.part.count()

let inserted = 0
const CHUNK = 1000
for (let i = 0; i < parts.length; i += CHUNK) {
  const chunk = parts.slice(i, i + CHUNK)
  const res = await prisma.part.createMany({ data: chunk, skipDuplicates: true })
  inserted += res.count
}

const after = await prisma.part.count()
console.log(`부품 import 완료 — 이전 ${before}개 → 현재 ${after}개 (신규 ${inserted}개)`)
await prisma.$disconnect()
