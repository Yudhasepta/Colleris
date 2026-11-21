import { createContext, useContext, useEffect, useMemo, useCallback } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useAuth } from './AuthContext.jsx'
import { api } from '../api/client.js'

// Preset metadata. `preview` describes the swatches shown in the Settings
// picker — single-tone presets get exactly one circle, dual-tone presets two.
// Preview colors never derive from danger; danger stays a destructive role.
//
// The default colour set is colour-only: it must never change font or size, so
// none of those presets carry a `font`. Only `special` themes (cotton candy —
// and later user-imported custom themes) may ship their own typeface via
// `font`; the picker renders their names in that stack to preview the
// personality, while every other name stays in the base Inter.
export const THEME_PRESETS = [
  { id: 'nebula', name: 'Nebula Purple', preview: ['#9d7bff'] },
  { id: 'default', name: 'Amber — Solar Gold', preview: ['#edc025'] },
  { id: 'blue', name: 'Blueprint', preview: ['#5b8def'] },
  { id: 'cyan', name: 'Tide', preview: ['#2fb2c2'] },
  { id: 'pink', name: 'Rose', preview: ['#e07aa6'] },
  { id: 'lavender', name: 'Lilac', preview: ['#9a8cf2'] },
  { id: 'mint', name: 'Mint', preview: ['#3fae8a'] },
  { id: 'cotton-candy', name: 'Cotton Candy', special: true, font: "'Fredoka', 'Inter', sans-serif", preview: ['#7ec8e3', '#f2a7c6'] },
]

// Per-theme brand mark (frontend/public/logos/, generated from the
// C:\OpenCode\ImageSample colourways). The logo follows the active preset so
// the sidebar / login wordmark match the theme; unknown presets fall back to
// the original amber mark.
export const PRESET_LOGOS = {
  nebula: '/logos/nebula.png',
  default: '/logos/default.png',
  blue: '/logos/blue.png',
  cyan: '/logos/cyan.png',
  pink: '/logos/pink.png',
  lavender: '/logos/lavender.png',
  mint: '/logos/mint.png',
  'cotton-candy': '/logos/cotton-candy.png',
}

export function presetLogo(preset) {
  return PRESET_LOGOS[preset] ?? '/CollerisLogo.png'
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const { user, booting } = useAuth()
  // A user optimistically seeded from the device store at boot is NOT a
  // guest — the /api/me verification runs in the background. Gating on
  // `booting` prevents the mid-boot guest window from forcing `default`
  // (preset flicker + a stray PUT /theme) for logged-in users.
  const isGuest = !user && !booting

  const [mode, setMode] = useLocalStorage('pb_theme_mode', 'dark')
  const [preset, setPreset] = useLocalStorage('pb_theme_preset', 'default')

  // Apply tokens to the document root.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  useEffect(() => {
    document.documentElement.setAttribute('data-preset', preset)
  }, [preset])

  // Server → local: a logged-in user's theme prefs are the source of truth.
  useEffect(() => {
    if (isGuest) return
    const serverMode = user?.theme_mode
    const serverPreset = user?.theme_preset || 'default'
    setMode((m) => (serverMode && serverMode !== m ? serverMode : m))
    setPreset((p) => (serverPreset && serverPreset !== p ? serverPreset : p))
  }, [user?.theme_mode, user?.theme_preset, user?.id, isGuest, setMode, setPreset])

  // Guest: custom presets are not available — always fall back to default.
  useEffect(() => {
    if (!isGuest) return
    if (preset !== 'default') setPreset('default')
  }, [isGuest, preset, setPreset])

  // Local → server: persist logged-in theme preference through the API.
  useEffect(() => {
    if (isGuest) return
    if (mode === user?.theme_mode && preset === (user?.theme_preset || 'default')) return
    if (!user?.email) return

    api('/theme', { method: 'PUT', body: { mode, preset } }).catch(() => {
      /* transient network error — local theme still applies */
    })
  }, [mode, preset, isGuest, user?.theme_mode, user?.theme_preset, user?.email])

  const toggleMode = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), [setMode])

  const value = useMemo(
    () => ({ mode, setMode, toggleMode, preset, setPreset, presets: THEME_PRESETS, isGuest }),
    [mode, setMode, toggleMode, preset, setPreset, isGuest]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
