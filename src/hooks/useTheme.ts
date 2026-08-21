import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const storageKey = 'sonatha-theme'

function getInitialTheme(): Theme {
  const saved = window.localStorage.getItem(storageKey)
  if (saved === 'light' || saved === 'dark') return saved
  return 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(storageKey, theme)
  }, [theme])

  return { theme, toggleTheme: () => setTheme(current => current === 'light' ? 'dark' : 'light') }
}
