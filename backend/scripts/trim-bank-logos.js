// 은행/카드 로고 PNG의 바깥 여백(투명·흰색)을 잘라내 꽉 차게 만든다.
// 원본은 _orig/ 에 백업하고, 결과는 같은 파일명으로 덮어쓴다.
// 사용: node scripts/trim-bank-logos.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Jimp } from 'jimp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIR = path.resolve(__dirname, '../../frontend/public/images/banks')
const BACKUP = path.join(DIR, '_orig')

// 흰색에 가까운 픽셀을 투명으로 바꾼다(가장자리 흰 여백 제거용).
const WHITE_CUTOFF = 245 // R,G,B 모두 이 값 이상이면 흰 배경으로 간주
function whitenToTransparent(image) {
  const { data } = image.bitmap
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] >= WHITE_CUTOFF && data[i + 1] >= WHITE_CUTOFF && data[i + 2] >= WHITE_CUTOFF) {
      data[i + 3] = 0 // alpha = 0
    }
  }
}

async function run() {
  if (!fs.existsSync(DIR)) {
    console.error('폴더 없음:', DIR)
    process.exit(1)
  }
  fs.mkdirSync(BACKUP, { recursive: true })

  const files = fs.readdirSync(DIR).filter((f) => /\.png$/i.test(f))
  if (files.length === 0) {
    console.log('처리할 PNG가 없습니다.')
    return
  }

  for (const file of files) {
    const src = path.join(DIR, file)
    const backup = path.join(BACKUP, file)
    try {
      // 원본 백업(최초 1회만)
      if (!fs.existsSync(backup)) fs.copyFileSync(src, backup)

      // 항상 백업본(원본)에서 다시 처리 → 반복 실행해도 누적 손상 없음
      const image = await Jimp.read(backup)
      const before = `${image.bitmap.width}x${image.bitmap.height}`

      whitenToTransparent(image) // 흰 배경 → 투명
      image.autocrop({ tolerance: 0.0008 }) // 균일한 가장자리(투명) 잘라내기

      const after = `${image.bitmap.width}x${image.bitmap.height}`
      await image.write(src)
      console.log(`✓ ${file}  ${before} → ${after}`)
    } catch (e) {
      console.error(`✗ ${file}:`, e.message)
    }
  }
  console.log('\n완료. 원본 백업: frontend/public/images/banks/_orig/')
}

run()
