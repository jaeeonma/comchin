// 404 핸들러
export function notFound(req, res) {
  res.status(404).json({ message: `경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}` })
}

// 공통 에러 핸들러 (계획서: 에러 처리/완성도 핵심)
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status ?? 500
  if (status >= 500) {
    // 내부 오류는 서버 로그로만 남기고, 클라이언트엔 일반 메시지만 (내부 정보 노출 방지)
    console.error('[ERROR]', err)
    return res.status(status).json({ message: '서버 내부 오류가 발생했습니다.' })
  }
  // 4xx 등 의도된 오류는 안내 메시지를 그대로 전달
  res.status(status).json({
    message: err.message ?? '요청을 처리하지 못했습니다.',
  })
}
