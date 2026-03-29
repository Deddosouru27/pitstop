import { useState, useMemo } from 'react'
import { Brain, Search, X } from 'lucide-react'
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

function MemoryCard({ memory, onOpen }: { memory: Memory; onOpen: (m: Memory) => void }) {
  const sourceColor = (memory.source && SOURCE_COLORS[memory.source]) ?? 'bg-slate-800 text-slate-400'
  const importanceColor = memory.importance ? (IMPORTANCE_COLORS[memory.importance] ?? 'text-slate-500') : 'text-slate-500'

  return (
    <button
      onClick={() => onOpen(memory)}
      className="w-full text-left bg-white/5 rounded-2xl p-4 space-y-2 border border-white/[0.06] active:opacity-60 transition-opacity"
    >
      <p className="text-slate-100 text-sm leading-relaxed line-clamp-2 overflow-hidden text-ellipsis">{memory.content}</p>

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
          {new Date(memory.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </button>
  )
}

function MemoryModal({ memory, onClose }: { memory: Memory; onClose: () => void }) {
  const sourceColor = (memory.source && SOURCE_COLORS[memory.source]) ?? 'bg-slate-800 text-slate-400'
  const importanceColor = memory.importance ? (IMPORTANCE_COLORS[memory.importance] ?? 'text-slate-500') : 'text-slate-500'

  return (
    <div className="fixed inset-0 z-50 flex items-end animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[85dvh] flex flex-col shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {memory.source && (
              <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${sourceColor}`}>
                {memory.source}
              </span>
            )}
            {memory.importance != null && (
              <span className={`text-sm font-medium ${importanceColor}`}>★{memory.importance}</span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
          <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{memory.content}</p>

          {memory.tags && memory.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {memory.tags.map(tag => (
                <span key={tag} className="text-xs text-slate-400 bg-white/5 border border-white/[0.06] px-2.5 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="text-xs text-slate-600 border-t border-white/[0.06] pt-3">
            {new Date(memory.created_at).toLocaleString('ru-RU', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MemoryViewer() {
  const { memories, loading, error } = useMemories()
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const todayCount = memories.filter(m => m.created_at.slice(0, 10) === todayStr).length
    const bySrc: Record<string, number> = {}
    for (const m of memories) {
      if (m.source) bySrc[m.source] = (bySrc[m.source] ?? 0) + 1
    }
    return { total: memories.length, today: todayCount, bySrc }
  }, [memories])

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
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Brain size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-slate-100">Memory</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pb-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/[0.06]">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Всего</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{stats.total}</p>
          </div>
          <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/[0.06]">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">За сегодня</p>
            <p className="text-2xl font-bold text-slate-100 mt-0.5">{stats.today}</p>
          </div>
        </div>
        {Object.keys(stats.bySrc).length > 0 && (
          <div className="bg-white/5 rounded-2xl px-4 py-3 border border-white/[0.06] flex items-center gap-3 flex-wrap">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium shrink-0">Источники</p>
            {Object.entries(stats.bySrc).map(([src, count]) => (
              <span key={src} className={`text-xs font-medium px-2.5 py-1 rounded-full ${SOURCE_COLORS[src] ?? 'bg-slate-800 text-slate-400'}`}>
                {src} · {count}
              </span>
            ))}
          </div>
        )}
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
          <div className="flex flex-col items-center py-16 text-center space-y-1">
            <p className="text-3xl">🧠</p>
            <p className="text-sm text-slate-500">
              {memories.length === 0 ? 'Память пуста' : 'Записей не найдено'}
            </p>
            <p className="text-xs text-slate-600">
              {memories.length === 0
                ? 'Запусти /autorun чтобы система начала запоминать'
                : 'Попробуй другой фильтр или поисковый запрос'}
            </p>
          </div>
        ) : (
          filtered.map(m => <MemoryCard key={m.id} memory={m} onOpen={setSelectedMemory} />)
        )}
      </div>

      {selectedMemory && (
        <MemoryModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
      )}
    </div>
  )
}
