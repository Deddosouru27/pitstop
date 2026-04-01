import { NavLink } from 'react-router-dom'
import { FolderOpen, Lightbulb, BarChart2, Brain, BookOpen, Inbox, Settings } from 'lucide-react'

const tabs = [
  { to: '/projects',   icon: FolderOpen, label: 'Projects',  end: false },
  { to: '/ideas',      icon: Lightbulb,  label: 'Ideas',     end: false },
  { to: '/dashboard',  icon: BarChart2,  label: 'Stats',     end: false },
  { to: '/memory',     icon: Brain,      label: 'Memory',    end: false },
  { to: '/knowledge',  icon: BookOpen,   label: 'Knowledge', end: false },
  { to: '/ingested',   icon: Inbox,      label: 'Сырьё',     end: false },
  { to: '/settings',   icon: Settings,   label: 'Settings',  end: false },
]

export default function BottomNav() {
  return (
    <nav className="flex border-t border-white/[0.06] bg-surface/80 backdrop-blur-xl">
      {tabs.map(({ to, icon: Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 gap-0.5 text-[11px] font-medium transition-colors ${
              isActive ? 'text-accent' : 'text-slate-500'
            }`
          }
        >
          <Icon size={22} strokeWidth={1.75} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
