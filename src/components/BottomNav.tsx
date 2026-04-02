import { NavLink } from 'react-router-dom'
import { FolderOpen, Lightbulb, BarChart2, Brain, BookOpen, Target, Inbox, Settings, Network, Bot } from 'lucide-react'
import { useNewIdeasCount } from '../hooks/useNewIdeasCount'

const tabs = [
  { to: '/projects',   icon: FolderOpen, label: 'Projects',  badge: false },
  { to: '/ideas',      icon: Lightbulb,  label: 'Ideas',     badge: true  },
  { to: '/dashboard',  icon: BarChart2,  label: 'Stats',     badge: false },
  { to: '/memory',     icon: Brain,      label: 'Memory',    badge: false },
  { to: '/knowledge',  icon: BookOpen,   label: 'Knowledge', badge: false },
  { to: '/graph',      icon: Network,    label: 'Graph',     badge: false },
  { to: '/agents',     icon: Bot,        label: 'Agents',    badge: false },
  { to: '/domains',    icon: Target,     label: 'Домены',    badge: false },
  { to: '/ingested',   icon: Inbox,      label: 'Сырьё',     badge: false },
  { to: '/settings',   icon: Settings,   label: 'Settings',  badge: false },
]

export default function BottomNav() {
  const newIdeas = useNewIdeasCount()

  return (
    <nav className="flex border-t border-white/[0.06] bg-surface/80 backdrop-blur-xl">
      {tabs.map(({ to, icon: Icon, label, badge }) => (
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
    </nav>
  )
}
