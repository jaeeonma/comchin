// 프론트의 완본체(prebuiltPCs.js) 데이터를 백엔드가 읽을 수 있는 요약 JSON으로 내보낸다.
// → backend/src/data/prebuilts.json (AI 그라운딩에서 "완본체 추천"에 사용)
// 완본체를 추가/수정하면 이 스크립트를 다시 실행해 JSON을 갱신하면 된다.
// 사용: cd backend && node scripts/export-prebuilts.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { prebuiltPCs, PC_CATEGORIES } from '../../frontend/src/data/prebuiltPCs.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'src', 'data')
const outFile = path.join(outDir, 'prebuilts.json')

// 그라운딩에 필요한 핵심 필드만 추린다(이미지/리뷰/설명 전체는 제외).
const slim = prebuiltPCs.map((pc) => ({
  id: pc.id,
  category: pc.category,
  categoryLabel: PC_CATEGORIES[pc.category]?.label ?? pc.category,
  name: pc.name,
  price: pc.price ?? null,
  cpu: pc.cpu ?? null,
  gpu: pc.gpu ?? null,
  ram: pc.ram ?? null,
  ssd: pc.ssd ?? null,
}))

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(slim))
console.log(`내보냄: 완본체 ${slim.length}개 → ${path.relative(process.cwd(), outFile)}`)
