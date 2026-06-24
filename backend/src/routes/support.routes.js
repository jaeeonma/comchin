import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { getUserIdFromReq } from '../lib/auth.js'
import { env } from '../config/env.js'

const router = Router()

// 현재 로그인 사용자 조회 (없으면 null)
async function currentUser(req) {
  const id = getUserIdFromReq(req)
  if (!id) return null
  return prisma.user.findUnique({ where: { id } })
}

// 운영자(관리자) 여부 — env.adminEmail 과 이메일 일치
const isAdminUser = (u) => !!u && (u.email ?? '').toLowerCase() === env.adminEmail

// 외부로 내보낼 메시지 형태
const pub = (m) => ({ id: m.id, fromAdmin: m.fromAdmin, content: m.content, createdAt: m.createdAt })

// ── 고객용 ──

// 내 상담 스레드. 관리자 계정이면 isAdmin:true 만 알려준다(상담은 /threads 로).
router.get('/me', async (req, res, next) => {
  try {
    const me = await currentUser(req)
    if (!me) return res.status(401).json({ message: '로그인이 필요합니다.' })
    if (isAdminUser(me)) return res.json({ isAdmin: true, messages: [] })
    const messages = await prisma.supportMessage.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ isAdmin: false, messages: messages.map(pub) })
  } catch (e) {
    next(e)
  }
})

// 고객이 메시지 전송
router.post('/me', async (req, res, next) => {
  try {
    const me = await currentUser(req)
    if (!me) return res.status(401).json({ message: '로그인이 필요합니다.' })
    if (isAdminUser(me)) {
      return res.status(400).json({ message: '관리자 계정은 상담함에서 답장하세요.' })
    }
    const content = String(req.body?.content ?? '').trim()
    if (!content) return res.status(400).json({ message: '메시지를 입력해주세요.' })
    if (content.length > 2000) return res.status(400).json({ message: '메시지가 너무 길어요. (최대 2000자)' })
    const msg = await prisma.supportMessage.create({
      data: { userId: me.id, fromAdmin: false, content },
    })
    res.status(201).json({ message: pub(msg) })
  } catch (e) {
    next(e)
  }
})

// ── 관리자(운영자) 전용 ──

async function requireAdmin(req, res) {
  const me = await currentUser(req)
  if (!me) {
    res.status(401).json({ message: '로그인이 필요합니다.' })
    return null
  }
  if (!isAdminUser(me)) {
    res.status(403).json({ message: '접근 권한이 없습니다.' })
    return null
  }
  return me
}

// 상담 스레드 목록 — 고객별 최신 메시지/답장 필요 여부 요약
router.get('/threads', async (req, res, next) => {
  try {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const grouped = await prisma.supportMessage.groupBy({
      by: ['userId'],
      _count: { _all: true },
    })
    if (grouped.length === 0) return res.json({ threads: [] })

    const users = await prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.userId) } },
      select: { id: true, email: true, nickname: true },
    })
    const uMap = new Map(users.map((u) => [u.id, u]))

    const threads = await Promise.all(
      grouped.map(async (g) => {
        const last = await prisma.supportMessage.findFirst({
          where: { userId: g.userId },
          orderBy: { createdAt: 'desc' },
        })
        const u = uMap.get(g.userId)
        return {
          userId: g.userId,
          email: u?.email ?? '(탈퇴한 사용자)',
          nickname: u?.nickname ?? null,
          count: g._count._all,
          lastContent: last?.content ?? '',
          lastAt: last?.createdAt ?? null,
          needsReply: last ? !last.fromAdmin : false, // 마지막이 고객 메시지면 답장 대기
        }
      }),
    )
    threads.sort((a, b) => new Date(b.lastAt ?? 0) - new Date(a.lastAt ?? 0))
    res.json({ threads })
  } catch (e) {
    next(e)
  }
})

// 특정 고객 스레드의 전체 메시지
router.get('/threads/:userId', async (req, res, next) => {
  try {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const { userId } = req.params
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nickname: true },
    })
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' })
    const messages = await prisma.supportMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ user, messages: messages.map(pub) })
  } catch (e) {
    next(e)
  }
})

// 관리자 답장
router.post('/threads/:userId', async (req, res, next) => {
  try {
    const admin = await requireAdmin(req, res)
    if (!admin) return
    const { userId } = req.params
    const content = String(req.body?.content ?? '').trim()
    if (!content) return res.status(400).json({ message: '메시지를 입력해주세요.' })
    if (content.length > 2000) return res.status(400).json({ message: '메시지가 너무 길어요. (최대 2000자)' })
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' })
    const msg = await prisma.supportMessage.create({
      data: { userId, fromAdmin: true, content },
    })
    res.status(201).json({ message: pub(msg) })
  } catch (e) {
    next(e)
  }
})

export default router
