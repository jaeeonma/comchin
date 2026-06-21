import { create } from 'zustand'

// 장바구니 전역 상태. 완본체(pc)·부품(part)·직접 견적(build) 을 담는다.
// - 로그인 사용자: 사용자별 키로 localStorage 에 저장 → 다시 로그인하면 그 사용자 것만 복원.
// - 비로그인(게스트): 메모리에만(저장 안 함) → 새로고침/로그아웃하면 사라짐.
// item 형태: { key, id, type:'pc'|'part'|'build', name, image, price, qty }
const keyOf = (type, id) => `${type}:${id}`
const storageKey = (userId) => `comchin-cart:${userId}`

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

export const useCartStore = create((set, get) => ({
  userId: null,
  items: [],

  // 로그인/로그아웃 시 현재 사용자 장바구니로 동기화 (Layout 에서 auth 사용자와 연결)
  setUser: (userId) => {
    const next = userId ?? null
    if (next === get().userId) return
    set({ userId: next, items: load(next) })
  },

  // 같은 상품이면 수량 +1, 없으면 새로 추가
  addItem: (item, qty = 1) =>
    set((state) => {
      const key = keyOf(item.type, item.id)
      const found = state.items.find((it) => it.key === key)
      const items = found
        ? state.items.map((it) => (it.key === key ? { ...it, qty: it.qty + qty } : it))
        : [...state.items, { ...item, key, qty }]
      persist(state.userId, items)
      return { items }
    }),

  setQty: (key, qty) =>
    set((state) => {
      const items = state.items.map((it) =>
        it.key === key ? { ...it, qty: Math.max(1, qty) } : it,
      )
      persist(state.userId, items)
      return { items }
    }),

  removeItem: (key) =>
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

  // 총 수량 / 총 금액
  count: () => get().items.reduce((sum, it) => sum + it.qty, 0),
  total: () => get().items.reduce((sum, it) => sum + it.price * it.qty, 0),
}))
