// 전역 작업 스케줄러 (동시 실행 제한 + 최소 간격 + 대기열 상한).
//
// 왜 필요한가: Gemini 무료 한도(분당 요청 수 등)는 "API 키 1개" 기준으로 사이트
// 전체가 공유한다. 여러 사용자가 동시에 AI를 쓰면 같은 한도를 함께 소모하므로,
// 모든 호출을 이 스케줄러 한 곳에 모아 (1) 한 번에 너무 많이 보내지 않고
// (2) 분당 한도를 넘지 않게 간격을 두고 (3) 너무 오래 기다릴 요청은 일찍 돌려보낸다.

export class Limiter {
  constructor({ maxConcurrent = 2, minIntervalMs = 0, maxWaitMs = 12_000 } = {}) {
    this.maxConcurrent = Math.max(1, maxConcurrent)
    this.minIntervalMs = Math.max(0, minIntervalMs)
    this.maxWaitMs = Math.max(0, maxWaitMs)
    this.active = 0
    this.lastStart = 0
    this.queue = [] // { fn, resolve, reject, enqueuedAt }
  }

  get pending() {
    return this.queue.length
  }

  // 대기열에 새 작업이 들어왔을 때, 끝까지 기다려도 maxWait를 넘길 것 같으면
  // 미리 거절한다(LIMITER_BUSY) → 사용자에게 즉시 "붐빈다" 안내, 무한 대기 방지.
  _wouldExceedWait() {
    if (this.minIntervalMs === 0) return false
    // 간격이 호출을 직렬화하므로 대략 (대기 중인 수) × 간격 이후에야 내 차례가 온다.
    const estWaitMs = this.queue.length * this.minIntervalMs
    return estWaitMs > this.maxWaitMs
  }

  schedule(fn) {
    return new Promise((resolve, reject) => {
      if (this._wouldExceedWait()) {
        reject(busyError())
        return
      }
      this.queue.push({ fn, resolve, reject, enqueuedAt: Date.now() })
      this._drain()
    })
  }

  async _drain() {
    if (this.active >= this.maxConcurrent) return
    const job = this.queue.shift()
    if (!job) return

    // 대기 중 이미 maxWait를 넘겼다면 실행하지 않고 돌려보낸다(클라이언트 타임아웃 방지).
    if (this.maxWaitMs > 0 && Date.now() - job.enqueuedAt > this.maxWaitMs) {
      job.reject(busyError())
      this._drain()
      return
    }

    this.active++

    // 분당 한도 보호: 직전 시작과 최소 간격을 띄운다.
    const wait = Math.max(0, this.minIntervalMs - (Date.now() - this.lastStart))
    if (wait > 0) await sleep(wait)
    this.lastStart = Date.now()

    // 동시 슬롯이 남으면 다음 작업도 곧장 진행시킨다.
    this._drain()

    try {
      job.resolve(await job.fn())
    } catch (err) {
      job.reject(err)
    } finally {
      this.active--
      this._drain()
    }
  }
}

function busyError() {
  const e = new Error('LIMITER_BUSY')
  e.code = 'LIMITER_BUSY'
  return e
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
