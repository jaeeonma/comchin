import { Router } from 'express'
import bcrypt from 'bcrypt'
import { OAuth2Client } from 'google-auth-library'
import { prisma } from '../lib/prisma.js'
import { env } from '../config/env.js'
import {
  setAuthCookie,
  clearAuthCookie,
  getUserIdFromReq,
  publicUser,
} from '../lib/auth.js'

const router = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 회원가입: 이메일 중복 확인 → bcrypt 해싱 → 생성 → JWT 쿠키 발급
router.post('/register', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const password = String(req.body?.password ?? '')
    const nickname = String(req.body?.nickname ?? '').trim() || email.split('@')[0]

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: '올바른 이메일 형식이 아닙니다.' })
    }
    if (password.length < 4) {
      return res.status(400).json({ message: '비밀번호는 4자 이상이어야 합니다.' })
    }

    const hash = await bcrypt.hash(password, 10)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      // 이미 비밀번호가 있는 계정이면 중복
      if (existing.password) {
        return res.status(409).json({ message: '이미 가입된 이메일입니다.' })
      }
      // 구글 전용 계정(비번 없음) → 비밀번호 연결 (이제 이메일 로그인도 가능)
      const linked = await prisma.user.update({
        where: { id: existing.id },
        data: { password: hash, nickname: existing.nickname || nickname },
      })
      setAuthCookie(res, linked.id)
      return res.status(200).json({ user: publicUser(linked) })
    }

    const user = await prisma.user.create({ data: { email, password: hash, nickname } })
    setAuthCookie(res, user.id)
    res.status(201).json({ user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

// 로그인: 사용자 조회 → bcrypt 비교 → JWT 쿠키 발급
router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase()
    const password = String(req.body?.password ?? '')

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    }
    // 구글 전용 계정(비번 미설정): 이메일 로그인 불가 안내
    if (!user.password) {
      return res.status(401).json({
        message:
          '구글로 가입된 계정이에요. 구글로 로그인하거나, 회원가입에서 같은 이메일로 비밀번호를 설정해주세요.',
      })
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    }

    setAuthCookie(res, user.id)
    res.json({ user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

// 구글 로그인:
//  - 이미 비밀번호까지 있는 계정 → 바로 로그인
//  - 처음 오는(회원가입 안 된) 계정 → password 없이 오면 { needPassword } 응답 →
//    프론트가 "사이트용 비밀번호"를 받아 다시 보내면 이메일+비번 회원으로 저장 후 로그인
router.post('/google', async (req, res, next) => {
  try {
    if (!env.googleClientId) {
      return res
        .status(501)
        .json({ message: '구글 로그인이 설정되지 않았습니다. (GOOGLE_CLIENT_ID 필요)' })
    }
    const credential = req.body?.credential
    const password = req.body?.password
    if (!credential) {
      return res.status(400).json({ message: '구글 인증 정보가 없습니다.' })
    }

    const client = new OAuth2Client(env.googleClientId)
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.googleClientId,
    })
    const payload = ticket.getPayload()
    const email = payload?.email?.toLowerCase()
    if (!email) {
      return res.status(400).json({ message: '구글 계정 이메일을 확인할 수 없습니다.' })
    }
    const nickname = payload.name ?? email.split('@')[0]

    const user = await prisma.user.findUnique({ where: { email } })

    // 이미 비밀번호까지 설정된 정식 계정 → 바로 로그인
    if (user && user.password) {
      setAuthCookie(res, user.id)
      return res.json({ user: publicUser(user) })
    }

    // 회원가입 안 된(또는 비번 미설정) 계정 → 비밀번호 입력 필요
    if (!password) {
      return res.json({ needPassword: true, email, nickname })
    }
    if (String(password).length < 4) {
      return res.status(400).json({ message: '비밀번호는 4자 이상이어야 합니다.' })
    }

    // 비밀번호 받음 → 구글 이메일 + 입력한 비밀번호로 회원 저장(또는 연결)
    const hash = await bcrypt.hash(String(password), 10)
    const saved = user
      ? await prisma.user.update({ where: { id: user.id }, data: { password: hash } })
      : await prisma.user.create({ data: { email, password: hash, nickname } })

    setAuthCookie(res, saved.id)
    res.json({ user: publicUser(saved) })
  } catch (err) {
    next(err)
  }
})

// 로그아웃: 쿠키 제거
router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

// 내 정보: 쿠키의 JWT 로 사용자 조회
router.get('/me', async (req, res, next) => {
  try {
    const userId = getUserIdFromReq(req)
    if (!userId) return res.status(401).json({ message: '로그인이 필요합니다.' })
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(401).json({ message: '로그인이 필요합니다.' })
    res.json({ user: publicUser(user) })
  } catch (err) {
    next(err)
  }
})

export default router
