import { create } from 'zustand'

// 직접 견적에서 "저장하기"로 저장한 견적.
// - 로그인 사용자: 사용자별 키로 localStorage 에 저장 → 다시 로그인하면 그 사용자 것만 보임.
// - 비로그인(게스트): 저장하지 않음(메모리에만) → 새로고침하면 사라짐.
const keyFor = (userId) => `comchin-saved-builds:${userId}`

function load(userId) {
  if (!userId) return { builds: [], seq: 0 }
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return { builds: [], seq: 0 }
    const parsed = JSON.parse(raw)
    return { builds: parsed.builds ?? [], seq: parsed.seq ?? 0 }
  } catch {
    return { builds: [], seq: 0 }
  }
}

function persist(userId, builds, seq) {
  if (!userId) return // 게스트는 저장 안 함
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ builds, seq }))
  } catch {
    // 무시
  }
}

export const useSavedBuildStore = create((set, get) => ({
  userId: null,
  builds: [],
  seq: 0,

  // 로그인/로그아웃 시 현재 사용자 데이터로 동기화 (Layout 에서 auth 사용자와 연결)
  setUser: (userId) => {
    const next = userId ?? null
    if (next === get().userId) return
    const { builds, seq } = load(next)
    set({ userId: next, builds, seq })
  },

  nextName: () => `comchin-pc-${get().seq + 1}`,

  addBuild: ({ name, caseImage, price, parts }) => {
    const state = get()
    const seq = state.seq + 1
    const finalName = (name && name.trim()) || `comchin-pc-${seq}`
    const builds = [
      ...state.builds,
      {
        id: `build-${Date.now()}`,
        name: finalName,
        caseImage: caseImage ?? null,
        price,
        parts,
        savedAt: new Date().toISOString(),
      },
    ]
    persist(state.userId, builds, seq)
    set({ builds, seq })
  },

  removeBuild: (id) => {
    const state = get()
    const builds = state.builds.filter((b) => b.id !== id)
    persist(state.userId, builds, state.seq)
    set({ builds })
  },

  clear: () => {
    const state = get()
    persist(state.userId, [], state.seq)
    set({ builds: [] })
  },
}))
