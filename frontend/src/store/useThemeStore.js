import { create } from 'zustand'

const STORAGE_KEY = 'comchin-theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  // 저장된 값이 없으면 시스템 선호 따름 (기본은 다크)
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
    set({ theme: next })
  },
}))

// 모듈 로드 시점에 초기 테마를 즉시 적용 (화면 깜빡임 최소화)
applyTheme(useThemeStore.getState().theme)
