import { create } from 'zustand'

// 즐겨찾기(찜) 전역 상태. 완본체(pc)·부품(part) 상세 페이지의 하트 버튼에서 토글한다.
// - 로그인 사용자: 사용자별 키로 localStorage 에 저장 → 다시 로그인하면 그 사용자 것만 복원.
// - 비로그인(게스트): 메모리에만(저장 안 함) → 새로고침하면 사라짐.
// item 형태: { key, id, type:'pc'|'part', name, image, price, addedAt }
const keyOf = (type, id) => `${type}:${id}`
const storageKey = (userId) => `comchin-favorites:${userId}`

function load(userId) {
  if (!userId) return []
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.items) ? parsed.items : []
  } catch {
    return []
  }
}

function persist(userId, items) {
  if (!userId) return // 게스트는 저장 안 함
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ items }))
  } catch {
    // 무시
  }
}

export const useFavoriteStore = create((set, get) => ({
  userId: null,
  items: [],

  // 로그인/로그아웃 시 현재 사용자 즐겨찾기로 동기화 (Layout 에서 auth 사용자와 연결)
  setUser: (userId) => {
    const next = userId ?? null
    if (next === get().userId) return
    set({ userId: next, items: load(next) })
  },

  isFavorite: (type, id) => {
    const key = keyOf(type, id)
    return get().items.some((it) => it.key === key)
  },

  // 토글. 추가됐으면 true, 해제됐으면 false 반환(토스트 메시지용).
  toggle: (item) => {
    const state = get()
    const key = keyOf(item.type, item.id)
    const exists = state.items.some((it) => it.key === key)
    const items = exists
      ? state.items.filter((it) => it.key !== key)
      : [...state.items, { ...item, key, addedAt: new Date().toISOString() }]
    persist(state.userId, items)
    set({ items })
    return !exists
  },

  remove: (key) =>
    set((state) => {
      const items = state.items.filter((it) => it.key !== key)
      persist(state.userId, items)
      return { items }
    }),

  clear: () =>
    set((state) => {
      persist(state.userId, [])
      return { items: [] }
    }),

  count: () => get().items.length,
}))
