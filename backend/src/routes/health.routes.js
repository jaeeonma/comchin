import { Router } from 'express'

const router = Router()

// 헬스체크 — 서버/DB 연결 확인용
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'comchin-backend',
    timestamp: new Date().toISOString(),
  })
})

export default router
