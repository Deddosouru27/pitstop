import { useState, useEffect, useCallback } from 'react'
import type { UserSettings, Theme, Language } from '../types'

const STORAGE_KEY = 'maos-settings'

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  language: 'ru',
  notifications: true,
}

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<UserSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme === 'light') {
    root.classList.add('light')
    root.classList.remove('dark')
  } else {
    root.classList.add('dark')
    root.classList.remove('light')
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(loadSettings)

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const setTheme = useCallback((theme: Theme) => updateSettings({ theme }), [updateSettings])
  const setLanguage = useCallback((language: Language) => updateSettings({ language }), [updateSettings])
  const setNotifications = useCallback((notifications: boolean) => updateSettings({ notifications }), [updateSettings])

  return { settings, updateSettings, setTheme, setLanguage, setNotifications }
}
