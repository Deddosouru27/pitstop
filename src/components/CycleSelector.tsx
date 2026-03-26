import type { Cycle } from '../types'

interface CycleSelectorProps {
  cycles: Cycle[]
  selectedCycleId: string | null
  onSelectCycle: (cycleId: string | null) => void
  loading?: boolean
}

export function CycleSelector({ cycles, selectedCycleId, onSelectCycle, loading }: CycleSelectorProps) {
  const activeCycle = cycles.find(c => c.status === 'active')
  const upcomingCycles = cycles.filter(c => c.status === 'upcoming')
  const completedCycles = cycles.filter(c => c.status === 'completed')

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    onSelectCycle(value || null)
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-500">Sprint (Cycle)</label>
      <select
        value={selectedCycleId ?? ''}
        onChange={handleChange}
        disabled={loading}
        className="w-full bg-surface text-slate-100 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
      >
        <option value="">All sprints</option>

        {activeCycle && (
          <optgroup label="Active">
            <option value={activeCycle.id}>
              {activeCycle.name} (until {new Date(activeCycle.end_date).toLocaleDateString('ru-RU')})
            </option>
          </optgroup>
        )}

        {upcomingCycles.length > 0 && (
          <optgroup label="Upcoming">
            {upcomingCycles.map(cycle => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name} (from {new Date(cycle.start_date).toLocaleDateString('ru-RU')})
              </option>
            ))}
          </optgroup>
        )}

        {completedCycles.length > 0 && (
          <optgroup label="Completed">
            {completedCycles.map(cycle => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  )
}
