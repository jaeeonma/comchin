import { create } from 'zustand'
import { apiListMethods, apiAddMethod, apiDeleteMethod, apiListHistory } from '../api/payment'

// 결제수단(계좌/카드) + 결제 이력 전역 상태. 서버가 출처(번호는 가려진 채로 옴).
export const usePaymentStore = create((set) => ({
  methods: [],
  loaded: false,
  loading: false,
  history: [],
  historyLoaded: false,
  historyLoading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const methods = await apiListMethods()
      set({ methods, loaded: true })
      return methods
    } finally {
      set({ loading: false })
    }
  },

  // 결제 이력 불러오기
  fetchHistory: async () => {
    set({ historyLoading: true })
    try {
      const history = await apiListHistory()
      set({ history, historyLoaded: true })
      return history
    } finally {
      set({ historyLoading: false })
    }
  },

  add: async (data) => {
    const m = await apiAddMethod(data)
    set((s) => ({ methods: [m, ...s.methods], loaded: true }))
    return m
  },

  remove: async (id) => {
    await apiDeleteMethod(id)
    set((s) => ({ methods: s.methods.filter((m) => m.id !== id) }))
  },

  // 결제 후 이력 갱신을 위해 다음 조회 때 다시 불러오도록 표시
  invalidateHistory: () => set({ historyLoaded: false }),

  // 로그아웃 시 비움
  clear: () => set({ methods: [], loaded: false, history: [], historyLoaded: false }),
}))
