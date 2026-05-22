import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

// ─── Central token map ────────────────────────────────────────────────────────
// Use these instead of hardcoded colors throughout the app.
export function useColors() {
  const { dark } = useTheme()
  return dark ? DARK : LIGHT
}

const LIGHT = {
  bg:          '#f8f8fb',
  bgCard:      '#ffffff',
  bgSidebar:   '#ffffff',
  bgHover:     '#f4f3fd',
  bgActive:    '#EEEDFE',
  bgInput:     '#ffffff',
  bgBadge:     '#f0eefb',
  bgMuted:     '#f4f4f5',
  bgTopbar:    '#ffffff',

  text:        '#222222',
  textSub:     '#666666',
  textMuted:   '#999999',
  textActive:  '#534AB7',
  textHeading: '#2d2a6e',

  border:      '#e4e4e7',
  borderCard:  '#e4e2f5',

  accent:      '#534AB7',
  accentLight: '#EEEDFE',

  danger:      '#e53e3e',
  dangerBg:    '#fef2f2',

  success:     '#15803d',
  successBg:   '#f0fdf4',
}

const DARK = {
  bg:          '#0f0f13',
  bgCard:      '#1a1a24',
  bgSidebar:   '#14141e',
  bgHover:     '#23233a',
  bgActive:    '#2a2860',
  bgInput:     '#1e1e2e',
  bgBadge:     '#23233a',
  bgMuted:     '#1e1e2e',
  bgTopbar:    '#14141e',

  text:        '#e8e8f0',
  textSub:     '#a0a0b8',
  textMuted:   '#6b6b85',
  textActive:  '#a89ef8',
  textHeading: '#c4c0f0',

  border:      '#2e2e45',
  borderCard:  '#2e2e45',

  accent:      '#7b72e8',
  accentLight: '#2a2860',

  danger:      '#f87171',
  dangerBg:    '#2d1515',

  success:     '#4ade80',
  successBg:   '#0f2d1a',
}
