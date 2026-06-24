// 간단한 IP 기반 속도 제한 미들웨어 (무차별 대입·계정 스터핑 방지).
// 메모리 기반이라 단일 인스턴스용 — 포트폴리오/소규모엔 충분하다.
// 사용: router.post('/login', rateLimit({ windowMs: 5*60_000, max: 10 }), handler)
export function rateLimit({ windowMs = 5 * 60_000, max = 10, message } = {}) {
  const hits = new Map() // key(IP) -> 최근 요청 시각[]

  return function rateLimitMiddleware(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || 'unknown'
    const now = Date.now()
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs)

    if (recent.length >= max) {
      const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000)
      res.setHeader('Retry-After', String(retryAfter))
      return res.status(429).json({
        message: message ?? `요청이 너무 많아요. ${retryAfter}초 후 다시 시도해 주세요.`,
      })
    }

    recent.push(now)
    hits.set(key, recent)

    // 메모리 누수 방지 — 가끔 만료된 키 정리
    if (hits.size > 1000) {
      for (const [k, v] of hits) {
        if (v.every((t) => now - t >= windowMs)) hits.delete(k)
      }
    }
    next()
  }
}
