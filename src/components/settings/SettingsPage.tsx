import { Settings, Sun, Moon, Globe, Bell, BellOff } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings'
import type { Theme, Language } from '../../types'

const LABELS: Record<string, Record<Language, string>> = {
  title:         { ru: 'Настройки', en: 'Settings' },
  appearance:    { ru: 'Внешний вид', en: 'Appearance' },
  theme:         { ru: 'Тема', en: 'Theme' },
  themeDark:     { ru: 'Тёмная', en: 'Dark' },
  themeLight:    { ru: 'Светлая', en: 'Light' },
  language:      { ru: 'Язык', en: 'Language' },
  langRu:        { ru: 'Русский', en: 'Russian' },
  langEn:        { ru: 'English', en: 'English' },
  notifications: { ru: 'Уведомления', en: 'Notifications' },
  notifTitle:    { ru: 'Push-уведомления', en: 'Push notifications' },
  notifDesc:     { ru: 'Получать уведомления о задачах и обновлениях', en: 'Receive notifications about tasks and updates' },
  general:       { ru: 'Основные', en: 'General' },
  version:       { ru: 'Версия', en: 'Version' },
}

function t(key: string, lang: Language): string {
  return LABELS[key]?.[lang] ?? key
}

const THEME_OPTIONS: { value: Theme; icon: typeof Sun }[] = [
  { value: 'dark', icon: Moon },
  { value: 'light', icon: Sun },
]

const LANG_OPTIONS: { value: Language; label: Record<Language, string> }[] = [
  { value: 'ru', label: { ru: 'Русский', en: 'Russian' } },
  { value: 'en', label: { ru: 'English', en: 'English' } },
]

export default function SettingsPage() {
  const { settings, setTheme, setLanguage, setNotifications } = useSettings()
  const lang = settings.language

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
          <Settings size={20} className="text-accent" />
        </div>
        <h1 className="text-xl font-semibold">{t('title', lang)}</h1>
      </div>

      {/* Appearance section */}
      <section className="mb-6">
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">
          {t('appearance', lang)}
        </h2>
        <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
          {/* Theme toggle */}
          <div className="px-4 py-3.5">
            <div className="text-sm font-medium text-slate-200 mb-3">{t('theme', lang)}</div>
            <div className="flex gap-2">
              {THEME_OPTIONS.map(({ value, icon: Icon }) => {
                const active = settings.theme === value
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-accent text-white'
                        : 'bg-surface-el text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon size={16} />
                    {t(value === 'dark' ? 'themeDark' : 'themeLight', lang)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Language picker */}
          <div className="px-4 py-3.5">
            <div className="text-sm font-medium text-slate-200 mb-3">{t('language', lang)}</div>
            <div className="flex gap-2">
              {LANG_OPTIONS.map(opt => {
                const active = settings.language === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setLanguage(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-accent text-white'
                        : 'bg-surface-el text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Globe size={16} />
                    {opt.label[lang]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Notifications section */}
      <section className="mb-6">
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">
          {t('notifications', lang)}
        </h2>
        <div className="bg-surface rounded-2xl overflow-hidden">
          <button
            onClick={() => setNotifications(!settings.notifications)}
            className="w-full flex items-center gap-3 px-4 py-3.5"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              settings.notifications ? 'bg-accent/20' : 'bg-surface-el'
            }`}>
              {settings.notifications
                ? <Bell size={18} className="text-accent" />
                : <BellOff size={18} className="text-slate-500" />
              }
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-slate-200">{t('notifTitle', lang)}</div>
              <div className="text-xs text-slate-500 mt-0.5">{t('notifDesc', lang)}</div>
            </div>
            {/* Toggle switch */}
            <div className={`w-11 h-6 rounded-full relative transition-colors ${
              settings.notifications ? 'bg-accent' : 'bg-surface-el'
            }`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                settings.notifications ? 'left-[22px]' : 'left-0.5'
              }`} />
            </div>
          </button>
        </div>
      </section>

      {/* General section */}
      <section>
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">
          {t('general', lang)}
        </h2>
        <div className="bg-surface rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-slate-400">{t('version', lang)}</span>
            <span className="text-sm text-slate-500">1.0.0</span>
          </div>
        </div>
      </section>
    </div>
  )
}
