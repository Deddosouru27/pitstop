import { useState, useMemo } from 'react'
import { Brain, Search } from 'lucide-react'
import { useMemories } from '../../hooks/useMemories'
import type { Memory } from '../../types'

const SOURCE_FILTERS = [
  { key: 'all',          label: 'Все' },
  { key: 'maos-runner',  label: 'Runner' },
  { key: 'maos-intake',  label: 'Intake' },
  { key: 'cli',          label: 'CLI' },
] as const

type SourceFilter = typeof SOURCE_FILTERS[number]['key']

const SOURCE_COLORS: Record<string, string> = {
  'maos-runner': 'bg-purple-900/50 text-purple-400',
  'maos-intake': 'bg-blue-900/50 text-blue-400',
  'cli':         'bg-amber-900/50 text-amber-400',
}

const IMPORTANCE_COLORS: Record<number, string> = {
  1: 'text-slate-500',
  2: 'text-blue-400',
  3: 'text-amber-400',
  4: 'text-orange-400',
  5: 'text-red-400',
}

function MemoryCard({ memory }: { memory: Memory }) {
  const sourceColor = (memory.source && SOURCE_COLORS[memory.source]) ?? 'bg-slate-800 text-slate-400'
  const importanceColor = memory.importance ? (IMPORTANCE_COLORS[memory.importance] ?? 'text-slate-500') : 'text-slate-500'

  return (
    <div className="bg-white/5 rounded-2xl p-4 space-y-2 border border-white/[0.06]">
      <p className="text-slate-100 text-sm leading-relaxed">
        {memory.content.length > 150 ? memory.content.slice(0, 150) + '…' : memory.content}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {memory.source && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sourceColor}`}>
            {memory.source}
          </span>
        )}
        {memory.importance != null && (
          <span className={`text-[10px] font-medium ${importanceColor}`}>
            ★{memory.importance}
          </span>
        )}
        {memory.tags && memory.tags.length > 0 && memory.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
            {tag}
          </span>
        ))}
        <span className="text-[10px] text-slate-600 ml-auto">
          {new Date(memory.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </div>
  )
}

export default function MemoryViewer() {
  const { memories, loading, error } = useMemories()
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = memories
    if (sourceFilter !== 'all') {
      result = result.filter(m => m.source === sourceFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(m => m.content.toLowerCase().includes(q))
    }
    return result
  }, [memories, sourceFilter, search])

  if (loading) {
    return <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-sm gap-2">
        <Brain size={28} strokeWidth={1.5} className="opacity-30" />
        <p>Не удалось подключиться к maos-memory</p>
        <p className="text-xs text-slate-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-slate-100">Memory</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">Всего записей: {memories.length}</p>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по содержимому..."
            className="w-full bg-white/5 border border-white/[0.06] rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Source filter chips */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto">
        {SOURCE_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setSourceFilter(f.key)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              sourceFilter === f.key
                ? 'bg-purple-600 text-white'
                : 'bg-white/5 text-slate-400 active:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 space-y-2 flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-600">
            <Brain size={32} strokeWidth={1.5} className="mb-3 opacity-40" />
            <p className="text-sm">Записей не найдено</p>
          </div>
        ) : (
          filtered.map(m => <MemoryCard key={m.id} memory={m} />)
        )}
      </div>
    </div>
  )
}
