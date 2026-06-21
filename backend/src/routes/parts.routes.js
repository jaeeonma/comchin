import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

// 부품 목록 조회. ?category=CPU 로 카테고리 필터 가능.
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query
    const parts = await prisma.part.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { price: 'asc' }],
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
