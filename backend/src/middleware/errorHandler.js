// 404 핸들러
export function notFound(req, res) {
  res.status(404).json({ message: `경로를 찾을 수 없습니다: ${req.method} ${req.originalUrl}` })
}

// 공통 에러 핸들러 (계획서: 에러 처리/완성도 핵심)
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status ?? 500
  if (status >= 500) {
    console.error('[ERROR]', err)
  }
  res.status(status).json({
    message: err.message ?? '서버 내부 오류가 발생했습니다.',
  })
}
