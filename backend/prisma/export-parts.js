// 로컬 DB의 부품(parts) 전체를 JSON으로 내보낸다 → prisma/seed-data/parts.json
// 배포 DB(Neon)에는 import-parts.js 로 이 파일을 넣는다. (users/payments 등은 제외)
// 사용: node prisma/export-parts.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../src/lib/prisma.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, 'seed-data')
const outFile = path.join(outDir, 'parts.json')

const parts = await prisma.part.findMany({ orderBy: { id: 'asc' } })
// createdAt/updatedAt 은 DB 기본값으로 두기 위해 제외
const clean = parts.map(({ createdAt, updatedAt, ...rest }) => rest)

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(clean))
console.log(`내보냄: ${clean.length}개 → ${path.relative(process.cwd(), outFile)} (${(fs.statSync(outFile).size / 1024 / 1024).toFixed(2)} MB)`)
await prisma.$disconnect()
