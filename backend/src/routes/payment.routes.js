import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { getUserIdFromReq } from '../lib/auth.js'

const router = Router()

// 로그인 필수 — userId 없으면 401
function requireUser(req, res) {
  const userId = getUserIdFromReq(req)
  if (!userId) {
    res.status(401).json({ message: '로그인이 필요합니다.' })
    return null
  }
  return userId
}

// 번호 가운데 약 절반을 * 로 가린다 (계좌/카드 조회용)
function maskNumber(num) {
  const s = String(num).replace(/\D/g, '')
  if (s.length <= 4) return '*'.repeat(s.length)
  const maskCount = Math.ceil(s.length / 2)
  const start = Math.floor((s.length - maskCount) / 2)
  return s.slice(0, start) + '*'.repeat(maskCount) + s.slice(start + maskCount)
}

const publicMethod = (m) => ({
  id: m.id,
  type: m.type,
  bank: m.bank,
  holderName: m.holderName,
  numberMasked: maskNumber(m.number),
  createdAt: m.createdAt,
})

// 내 결제수단 목록 (번호는 가려서)
router.get('/', async (req, res, next) => {
  try {
    const userId = requireUser(req, res)
    if (!userId) return
    const list = await prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ methods: list.map(publicMethod) })
  } catch (err) {
    next(err)
  }
})

// 결제수단 추가 (계좌/카드)
router.post('/', async (req, res, next) => {
  try {
    const userId = requireUser(req, res)
    if (!userId) return
    const type = String(req.body?.type ?? '')
    const bank = String(req.body?.bank ?? '').trim()
    const number = String(req.body?.number ?? '').replace(/\D/g, '')
    const holderName = String(req.body?.holderName ?? '').trim()
    const phone = String(req.body?.phone ?? '').trim() || null

    if (type !== 'account' && type !== 'card') {
      return res.status(400).json({ message: '계좌 또는 카드를 선택하세요.' })
    }
    if (!bank) return res.status(400).json({ message: '은행사/카드사를 선택하세요.' })
    if (!holderName) return res.status(400).json({ message: '이름을 입력하세요.' })
    if (number.length < 8) {
      return res.status(400).json({ message: '번호를 올바르게 입력하세요.' })
    }

    const created = await prisma.paymentMethod.create({
      data: { userId, type, bank, number, holderName, phone },
    })
    res.status(201).json({ method: publicMethod(created) })
  } catch (err) {
    next(err)
  }
})

// 결제수단 삭제 (본인 것만)
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = requireUser(req, res)
    if (!userId) return
    const { id } = req.params
    const found = await prisma.paymentMethod.findFirst({ where: { id, userId } })
    if (!found) return res.status(404).json({ message: '결제수단을 찾을 수 없습니다.' })
    await prisma.paymentMethod.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// 결제 (포트폴리오 — 실제 결제 없이 결제수단 검증 후 성공 응답 + 이력 저장)
router.post('/checkout', async (req, res, next) => {
  try {
    const userId = requireUser(req, res)
    if (!userId) return
    const methodId = String(req.body?.methodId ?? '')
    const amount = Math.max(0, Math.round(Number(req.body?.amount) || 0))
    const summary = String(req.body?.summary ?? '').trim() || '상품'
    const method = await prisma.paymentMethod.findFirst({ where: { id: methodId, userId } })
    if (!method) {
      return res.status(400).json({ message: '유효한 결제수단이 없습니다. 먼저 등록해주세요.' })
    }

    // 직접 견적 구매 시 부품 내역(있으면) — 최대 30개, 필요한 필드만 정제해서 저장
    const rawItems = Array.isArray(req.body?.details) ? req.body.details : null
    const details = rawItems
      ? rawItems.slice(0, 30).map((it) => ({
          category: String(it?.category ?? '').slice(0, 40),
          name: String(it?.name ?? '').slice(0, 200),
          price: Math.max(0, Math.round(Number(it?.price) || 0)),
        }))
      : null

    // 결제 시점 정보를 스냅샷으로 이력에 저장
    const numberMasked = maskNumber(method.number)
    const order = await prisma.payment.create({
      data: {
        userId,
        amount,
        summary,
        methodType: method.type,
        methodBank: method.bank,
        numberMasked,
        details: details ?? undefined,
      },
    })

    res.json({
      ok: true,
      amount,
      paidAt: order.createdAt.toISOString(),
      method: publicMethod(method),
    })
  } catch (err) {
    next(err)
  }
})

// 결제 이력 — 무엇을, 얼마에, 언제, 어떤 수단으로 결제했는지
router.get('/history', async (req, res, next) => {
  try {
    const userId = requireUser(req, res)
    if (!userId) return
    const list = await prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    res.json({
      history: list.map((p) => ({
        id: p.id,
        amount: p.amount,
        summary: p.summary,
        methodType: p.methodType,
        methodBank: p.methodBank,
        numberMasked: p.numberMasked,
        details: p.details ?? null,
        paidAt: p.createdAt,
      })),
    })
  } catch (err) {
    next(err)
  }
})

export default router
