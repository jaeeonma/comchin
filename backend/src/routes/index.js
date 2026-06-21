import { Router } from 'express'
import healthRoutes from './health.routes.js'
import authRoutes from './auth.routes.js'
import partsRoutes from './parts.routes.js'
import buildsRoutes from './builds.routes.js'
import paymentRoutes from './payment.routes.js'
import aiRoutes from './ai.routes.js'

const router = Router()

router.use('/health', healthRoutes)
router.use('/auth', authRoutes)
router.use('/parts', partsRoutes)
router.use('/builds', buildsRoutes)
router.use('/payments', paymentRoutes)
router.use('/ai', aiRoutes)

export default router
