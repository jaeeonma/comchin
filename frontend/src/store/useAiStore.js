import { create } from 'zustand'

// 컴친 AI 비서 창의 열림 상태(전역). 어디서든 openChat() 으로 우하단 창을 띄울 수 있다.
export const useAiStore = create((set) => ({
  open: false,
  openChat: () => set({ open: true }),
  closeChat: () => set({ open: false }),
  toggle: () => set((s) => ({ open: !s.open })),
}))
