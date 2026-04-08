import { useState, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import type { UserSettings, Language } from '../types'

const STORAGE_KEY = 'maos-settings'

interface StoredSettings {
  language: Language
  notifications: boolean
}

const DEFAULT_STORED: StoredSettings = {
  language: 'ru',
  notifications: true,
}

function loadStored(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STORED
    const parsed = JSON.parse(raw) as Partial<StoredSettings>
    return { ...DEFAULT_STORED, ...parsed }
  } catch {
    return DEFAULT_STORED
  }
}

export function useSettings() {
  const { theme, setTheme } = useTheme()
  const [stored, setStored] = useState<StoredSettings>(loadStored)

  const updateStored = useCallback((updates: Partial<StoredSettings>) => {
    setStored(prev => {
      const next = { ...prev, ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const setLanguage = useCallback((language: Language) => updateStored({ language }), [updateStored])
  const setNotifications = useCallback((notifications: boolean) => updateStored({ notifications }), [updateStored])

  const settings: UserSettings = {
    theme,
    language: stored.language,
    notifications: stored.notifications,
  }

  return { settings, setTheme, setLanguage, setNotifications }
}
