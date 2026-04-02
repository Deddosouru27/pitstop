import { useState } from 'react'
import { FlaskConical, CheckSquare, Square, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CheckResult {
  label: string
  status: 'idle' | 'running' | 'ok' | 'warn' | 'error'
  detail: string
}

// ── Manual checklist ──────────────────────────────────────────────────────────

const MANUAL_ITEMS = [
  'Vercel Intake = Ready (dashboard зелёный)',
  'Vercel Runner = Ready (dashboard зелёный)',
  'curl рилс → _diag.savedItems > 0',
  '/recall агенты → результаты есть',
  'Pitstop Knowledge Viewer загружается',
  'Новое знание появляется в Knowledge Viewer',
] as const

function ManualChecklist() {
  const [checked, setChecked] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="bg-white/5 rounded-2xl border border-white/[0.06] px-4 py-4 space-y-1">
      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-3">Ручные проверки</p>
      {MANUAL_ITEMS.map((item, i) => {
        const done = checked.has(i)
        return (
          <button
            key={i}
            onClick={() => toggle(i)}
            className="w-full flex items-start gap-3 py-2 text-left active:opacity-70 transition-opacity"
          >
            <span className={`shrink-0 mt-0.5 ${done ? 'text-emerald-400' : 'text-slate-600'}`}>
              {done ? <CheckSquare size={16} /> : <Square size={16} />}
            </span>
            <span className={`text-sm leading-snug ${done ? 'line-through text-slate-600' : 'text-slate-300'}`}>
              {item}
            </span>
          </button>
        )
      })}
      <p className="text-xs text-slate-600 pt-1 border-t border-white/[0.04] mt-2">
        {checked.size}/{MANUAL_ITEMS.length} выполнено
      </p>
    </div>
  )
}

// ── Automated checks ──────────────────────────────────────────────────────────

const STATUS_CFG = {
  idle:    { cls: 'bg-slate-800 text-slate-400',      dot: 'bg-slate-600' },
  running: { cls: 'bg-amber-900/50 text-amber-400',   dot: 'bg-amber-400 animate-pulse' },
  ok:      { cls: 'bg-emerald-900/50 text-emerald-400', dot: 'bg-emerald-400' },
  warn:    { cls: 'bg-amber-900/50 text-amber-400',   dot: 'bg-amber-400' },
  error:   { cls: 'bg-red-900/50 text-red-400',        dot: 'bg-red-400' },
}

async function pingIntake(): Promise<Omit<CheckResult, 'label'>> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch('https://maos-intake.vercel.app/', {
      signal: controller.signal,
      mode: 'no-cors',
    })
    clearTimeout(timer)
    // no-cors → opaque response. If we get here the server is up.
    return { status: 'ok', detail: res.type === 'opaque' ? 'Alive (opaque)' : `HTTP ${res.status}` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('abort')) return { status: 'error', detail: 'Timeout (6s)' }
    return { status: 'error', detail: msg }
  }
}

async function countKnowledge(): Promise<Omit<CheckResult, 'label'>> {
  const { count, error } = await supabase
    .from('extracted_knowledge')
    .select('*', { count: 'exact', head: true })
  if (error) return { status: 'error', detail: error.message }
  const n = count ?? 0
  return { status: n > 0 ? 'ok' : 'warn', detail: `${n} записей` }
}

async function countProcessed(): Promise<Omit<CheckResult, 'label'>> {
  const { count, error } = await supabase
    .from('ingested_content')
    .select('*', { count: 'exact', head: true })
    .eq('processing_status', 'done')
  if (error) return { status: 'error', detail: error.message }
  const n = count ?? 0
  return { status: n > 0 ? 'ok' : 'warn', detail: `${n} обработано` }
}

async function countPending(): Promise<Omit<CheckResult, 'label'>> {
  const { count, error } = await supabase
    .from('ingested_content')
    .select('*', { count: 'exact', head: true })
    .eq('processing_status', 'pending')
  if (error) return { status: 'error', detail: error.message }
  const n = count ?? 0
  return { status: n === 0 ? 'ok' : 'warn', detail: `${n} в очереди` }
}

const AUTO_CHECKS: Array<{ label: string; run: () => Promise<Omit<CheckResult, 'label'>> }> = [
  { label: 'Vercel Intake alive',                run: pingIntake },
  { label: 'extracted_knowledge count',          run: countKnowledge },
  { label: 'ingested_content processed',         run: countProcessed },
  { label: 'ingested_content pending (should=0)', run: countPending },
]

function CheckRow({ result }: { result: CheckResult }) {
  const cfg = STATUS_CFG[result.status]
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      <span className={`shrink-0 w-2 h-2 rounded-full ${cfg.dot}`} />
      <p className="flex-1 text-sm text-slate-300">{result.label}</p>
      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.cls} shrink-0`}>
        {result.status === 'running' ? '...' : result.detail || result.status}
      </span>
    </div>
  )
}

function AutoChecks() {
  const [results, setResults] = useState<CheckResult[]>(
    AUTO_CHECKS.map(c => ({ label: c.label, status: 'idle', detail: '' }))
  )
  const [running, setRunning] = useState(false)

  async function runAll() {
    setRunning(true)
    // mark all running
    setResults(AUTO_CHECKS.map(c => ({ label: c.label, status: 'running', detail: '' })))

    const settled = await Promise.allSettled(AUTO_CHECKS.map(c => c.run()))
    setResults(settled.map((r, i) => {
      if (r.status === 'fulfilled') return { label: AUTO_CHECKS[i].label, ...r.value }
      return { label: AUTO_CHECKS[i].label, status: 'error', detail: String(r.reason) }
    }))
    setRunning(false)
  }

  const allOk = results.every(r => r.status === 'ok')
  const anyError = results.some(r => r.status === 'error')

  return (
    <div className="bg-white/5 rounded-2xl border border-white/[0.06] px-4 py-4 space-y-1">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Автоматические проверки</p>
        {results.some(r => r.status !== 'idle') && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            anyError ? 'bg-red-900/50 text-red-400' :
            allOk ? 'bg-emerald-900/50 text-emerald-400' :
            'bg-amber-900/50 text-amber-400'
          }`}>
            {anyError ? 'Ошибки' : allOk ? 'Всё ок' : 'Предупреждения'}
          </span>
        )}
      </div>

      {results.map((r, i) => <CheckRow key={i} result={r} />)}

      <button
        onClick={runAll}
        disabled={running}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-purple-600 active:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-2xl transition-colors"
      >
        <RefreshCw size={15} className={running ? 'animate-spin' : ''} />
        {running ? 'Проверяю...' : 'Run automated checks'}
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SmokeTestPage() {
  return (
    <div className="flex flex-col min-h-full pb-8">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <FlaskConical size={20} className="text-purple-400" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-slate-100">Smoke Test</h1>
        </div>
        <p className="text-sm text-slate-500 mt-0.5">Проверка системы после деплоя</p>
      </div>

      <div className="px-4 space-y-4">
        <AutoChecks />
        <ManualChecklist />
      </div>
    </div>
  )
}
