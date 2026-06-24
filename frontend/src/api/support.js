import client from './client'

// 1:1 상담 — 사람(운영자)이 직접 답하는 상담 창구. AI를 쓰지 않는 사용자를 위한 곳.

// 고객용: 내 상담 스레드 조회 / 메시지 전송
export const apiGetMyThread = () => client.get('/support/me').then((r) => r.data)
export const apiSendSupport = (content) => client.post('/support/me', { content }).then((r) => r.data)

// 관리자용: 스레드 목록 / 특정 고객 스레드 / 답장
export const apiGetThreads = () => client.get('/support/threads').then((r) => r.data)
export const apiGetThread = (userId) => client.get(`/support/threads/${userId}`).then((r) => r.data)
export const apiReplyThread = (userId, content) =>
  client.post(`/support/threads/${userId}`, { content }).then((r) => r.data)
