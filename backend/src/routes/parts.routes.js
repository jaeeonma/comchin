import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// 부품 목록 조회. ?category=CPU 로 카테고리 필터 가능.
// 목록 카드/요약에 필요한 필드만 선택해 응답을 가볍게(타임스탬프 등 제외).
const LIST_SELECT = {
  id: true, category: true, name: true, brand: true, price: true,
  tdp: true, imageUrl: true, socket: true, memoryType: true, specs: true,
}
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query
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
