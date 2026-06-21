import { Router } from 'express'

const router = Router()

// 견적 라우트 스텁 — 2단계(견적 저장/불러오기)에서 구현 예정.
router.get('/', (req, res) => {
  res.status(501).json({ message: '견적 목록 — 아직 구현되지 않았습니다.' })
})

router.post('/', (req, res) => {
  res.status(501).json({ message: '견적 저장 — 아직 구현되지 않았습니다.' })
})

export default router
