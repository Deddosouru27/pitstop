import { Settings, Sun, Moon, Globe, Bell, BellOff, ExternalLink, Database, Cpu, Link2 } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { useSettings } from '../../hooks/useSettings'
import type { Language } from '../../types'

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
  systemInfo:    { ru: 'Системная информация', en: 'System Info' },
  autorun:       { ru: 'Автозапуск', en: 'Autorun' },
  quickLinks:    { ru: 'Быстрые ссылки', en: 'Quick Links' },
}

function t(key: string, lang: Language): string {
  return LABELS[key]?.[lang] ?? key
}

const LANG_OPTIONS: { value: Language; label: Record<Language, string> }[] = [
  { value: 'ru', label: { ru: 'Русский', en: 'Russian' } },
  { value: 'en', label: { ru: 'English', en: 'English' } },
]

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { settings, setLanguage, setNotifications } = useSettings()
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
        <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-[var(--color-border)]">
          {/* Theme toggle */}
          <div className="px-4 py-3.5">
            <div className="text-sm font-medium text-[var(--color-text)] mb-3">{t('theme', lang)}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  theme === 'dark' ? 'bg-accent text-white' : 'bg-surface-el text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <Moon size={16} />
                {t('themeDark', lang)}
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  theme === 'light' ? 'bg-accent text-white' : 'bg-surface-el text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                <Sun size={16} />
                {t('themeLight', lang)}
              </button>
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
      <section className="mb-6">
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

      {/* System Info section */}
      <section className="mb-6">
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">
          {t('systemInfo', lang)}
        </h2>
        <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Database size={16} className="text-slate-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">Supabase Pitstop</div>
              <div className="text-sm text-slate-300 font-mono">stqhnkhc••••••••</div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Link2 size={16} className="text-slate-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">Intake URL</div>
              <div className="text-sm text-slate-300 font-mono truncate">maos-intake.vercel.app</div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Cpu size={16} className="text-slate-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-500">Runner</div>
              <div className="text-sm text-slate-300">local WSL</div>
            </div>
          </div>
        </div>
      </section>

      {/* Autorun Config section */}
      <section className="mb-6">
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">
          {t('autorun', lang)}
        </h2>
        <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-400">{lang === 'ru' ? 'Интервал heartbeat' : 'Heartbeat interval'}</span>
            <span className="text-sm text-slate-300">6 {lang === 'ru' ? 'часов' : 'hours'}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-400">{lang === 'ru' ? 'Задач за запуск' : 'Max tasks per run'}</span>
            <span className="text-sm text-slate-300">3</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-400">{lang === 'ru' ? 'Фильтр фаз' : 'Phase filter'}</span>
            <span className="text-sm text-slate-300 font-mono text-xs">phase = current</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-slate-400">{lang === 'ru' ? 'Статус' : 'Status'}</span>
            <span className="text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1">
              ⚠️ {lang === 'ru' ? 'На паузе' : 'Paused'}
            </span>
          </div>
        </div>
      </section>

      {/* Quick Links section */}
      <section>
        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">
          {t('quickLinks', lang)}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Pitstop Vercel', href: 'https://pitstop.vercel.app' },
            { label: 'Intake Vercel', href: 'https://maos-intake.vercel.app' },
            { label: 'Supabase Pitstop', href: 'https://supabase.com/dashboard/project/stqhnkhcfndmhgvfyojv' },
            { label: 'GitHub', href: 'https://github.com/Deddosouru27' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 bg-surface px-4 py-3 rounded-2xl text-sm text-slate-300 hover:text-slate-100 active:bg-surface-el transition-colors"
            >
              <span>{label}</span>
              <ExternalLink size={14} className="text-slate-500 shrink-0" />
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
