import { useThemeStore } from '../store/useThemeStore'

export default function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-muted transition-colors hover:bg-surface-2 hover:text-text"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  )
}
