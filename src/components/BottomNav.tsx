import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FolderOpen, Lightbulb, BookOpen, Network, MoreHorizontal, X, BarChart2, Brain, Target, Inbox, Settings, ScrollText, ListTodo, TrendingUp, Activity, Users, Compass, Bell, CheckSquare } from 'lucide-react'
import { useNewIdeasCount } from '../hooks/useNewIdeasCount'

const PRIMARY = [
  { to: '/dashboard',  icon: BarChart2,  label: 'Dashboard', badge: false },
  { to: '/knowledge',  icon: BookOpen,   label: 'Knowledge', badge: false },
  { to: '/ideas',      icon: Lightbulb,  label: 'Ideas',     badge: true  },
  { to: '/agents',     icon: Users,      label: 'Агенты',    badge: false },
  { to: '/projects',   icon: FolderOpen, label: 'Projects',  badge: false },
]

const SECONDARY = [
  { to: '/tasks',         icon: CheckSquare, label: 'Задачи' },
  { to: '/pending',       icon: Bell,        label: 'Pending' },
  { to: '/discovery',     icon: Compass,    label: 'Обзор' },
  { to: '/stats',         icon: TrendingUp, label: 'Stats' },
  { to: '/data-quality',  icon: Activity,   label: 'Data Quality' },
  { to: '/memory',        icon: Brain,      label: 'Memory' },
  { to: '/graph',         icon: Network,    label: 'Graph' },
  { to: '/ingested',      icon: Inbox,      label: 'Сырьё' },
  { to: '/intake-logs',   icon: ScrollText, label: 'Intake Logs' },
  { to: '/ideas-triage',  icon: ListTodo,   label: 'Ideas Triage' },
  { to: '/domains',       icon: Target,     label: 'Domains' },
  { to: '/settings',      icon: Settings,   label: 'Settings' },
]

function MoreDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#13131a] rounded-t-3xl shadow-2xl border-t border-white/[0.06] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3">
          <p className="text-sm font-semibold text-slate-300">Ещё</p>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300">
            <X size={20} />
          </button>
        </div>
        {/* Grid */}
        <div className="grid grid-cols-4 gap-1 px-3 pb-10">
          {SECONDARY.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-colors active:bg-white/10 ${
                  isActive ? 'text-purple-400 bg-purple-600/10' : 'text-slate-400'
                }`
              }
            >
              <Icon size={22} strokeWidth={1.75} />
              <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BottomNav() {
  const newIdeas = useNewIdeasCount()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <nav className="flex border-t border-white/[0.06] bg-surface/80 backdrop-blur-xl">
        {PRIMARY.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={false}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 gap-0.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-slate-500'
              }`
            }
          >
            <div className="relative">
              <Icon size={22} strokeWidth={1.75} />
              {badge && newIdeas > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 leading-none">
                  {newIdeas > 99 ? '99+' : newIdeas}
                </span>
              )}
            </div>
            <span>{label}</span>
          </NavLink>
        ))}
        {/* More button */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex-1 flex flex-col items-center py-3 gap-0.5 text-[11px] font-medium text-slate-500 active:text-slate-300 transition-colors"
        >
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>Ещё</span>
        </button>
      </nav>

      {drawerOpen && <MoreDrawer onClose={() => setDrawerOpen(false)} />}
    </>
  )
}
