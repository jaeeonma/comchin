import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// 부품 목록 조회. ?category=CPU 로 카테고리 필터 가능.
// 목록 카드/요약에 필요한 필드만 선택해 응답을 가볍게(타임스탬프 등 제외).
const LIST_SELECT = {
  id: true, category: true, name: true, brand: true, price: true,
  tdp: true, imageUrl: true, socket: true, memoryType: true, specs: true,
}
// 허용된 카테고리(enum)만 받는다 — 잘못된 값·객체 주입(Prisma 연산자 주입) 차단
const PART_CATEGORIES = new Set([
  'CPU', 'CPU_COOLER', 'MEMORY', 'MOTHERBOARD', 'GPU', 'SSD', 'HDD', 'PSU', 'CASE',
])
router.get('/', async (req, res, next) => {
  try {
    // 문자열이면서 화이트리스트에 있는 값만 필터로 인정. 그 외(객체/배열/오타)는 전체 조회.
    const raw = req.query.category
    const category = typeof raw === 'string' && PART_CATEGORIES.has(raw) ? raw : null
    const parts = await prisma.part.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { price: 'asc' }],
      select: LIST_SELECT,
    })
    res.json({ count: parts.length, parts })
  } catch (err) {
    next(err)
  }
})

// 단일 부품 조회
router.get('/:id', async (req, res, next) => {
  try {
    const part = await prisma.part.findUnique({ where: { id: req.params.id } })
    if (!part) {
      return res.status(404).json({ message: '부품을 찾을 수 없습니다.' })
    }
    res.json(part)
  } catch (err) {
    next(err)
  }
})

export default router
