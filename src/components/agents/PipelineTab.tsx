import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Agent, AgentStatus } from '../../hooks/useAgents'

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return `${diff}с назад`
  if (diff < 3600)  return `${Math.floor(diff / 60)}м назад`
  if (diff < 86400) return `${Math.floor(diff / 3600)}ч назад`
  return `${Math.floor(diff / 86400)}д назад`
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// ── Node types ─────────────────────────────────────────────────────────────────

type AgentNodeData = { name: string; role: string; status: AgentStatus }
type AgentFlowNode = Node<AgentNodeData, 'agentNode'>

const STATUS_DOT: Record<AgentStatus, string> = {
  idle:    'bg-slate-400',
  working: 'bg-emerald-400 animate-pulse',
  stuck:   'bg-yellow-400',
  failed:  'bg-red-400',
  offline: 'bg-slate-600',
}

const STATUS_BORDER: Record<AgentStatus, string> = {
  idle:    'border-white/10',
  working: 'border-emerald-500/40',
  stuck:   'border-yellow-500/30',
  failed:  'border-red-500/30',
  offline: 'border-white/5',
}

function AgentNodeComp({ data }: NodeProps<AgentFlowNode>) {
  return (
    <div className={`bg-[#1a1a2e] border rounded-2xl px-4 py-3 w-44 shadow-xl ${STATUS_BORDER[data.status]}`}>
      <Handle type="target" position={Position.Left} style={{ background: '#4f4f7a', border: 'none', width: 8, height: 8 }} />
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[data.status]}`} />
        <p className="text-sm font-bold text-slate-100 truncate">{data.name}</p>
      </div>
      <p className="text-[10px] text-slate-500 leading-tight truncate">{data.role}</p>
      <Handle type="source" position={Position.Right} style={{ background: '#4f4f7a', border: 'none', width: 8, height: 8 }} />
    </div>
  )
}

const nodeTypes = { agentNode: AgentNodeComp }

// ── Grid layout ────────────────────────────────────────────────────────────────

const COLS = 3

function gridPos(i: number) {
  return { x: 40 + (i % COLS) * 220, y: 40 + Math.floor(i / COLS) * 130 }
}

// ── Handoff ────────────────────────────────────────────────────────────────────

interface Handoff {
  id: string
  from_agent_id: string | null
  to_agent_id: string | null
  reason: string | null
  status: string | null
  task_id: string | null
  task_title: string | null
  from_agent_name: string | null
  to_agent_name: string | null
  created_at: string
}

type HandoffEdgeData = { handoff: Handoff } & Record<string, unknown>

// ── Status colors for edges ────────────────────────────────────────────────────

const STATUS_STROKE: Record<string, string> = {
  completed: '#34d399',
  failed:    '#f87171',
  pending:   '#fbbf24',
}

const STATUS_LABEL: Record<string, string> = {
  completed: 'completed',
  failed:    'failed',
  pending:   'pending',
}

// ── Details panel ──────────────────────────────────────────────────────────────

function HandoffPanel({ handoff, onClose }: { handoff: Handoff; onClose: () => void }) {
  const stroke = STATUS_STROKE[handoff.status ?? ''] ?? '#64748b'
  const statusLabel = STATUS_LABEL[handoff.status ?? ''] ?? handoff.status ?? '—'

  return (
    <div className="absolute bottom-3 left-3 right-3 z-10 bg-[#13131a] border border-white/10 rounded-2xl p-4 shadow-2xl space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Handoff</p>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">От</p>
          <p className="text-slate-200 font-medium">{handoff.from_agent_name ?? handoff.from_agent_id ?? '—'}</p>
        </div>
        <div>
          <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Кому</p>
          <p className="text-slate-200 font-medium">{handoff.to_agent_name ?? handoff.to_agent_id ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Задача</p>
          <p className="text-slate-300">{handoff.task_title ?? handoff.task_id ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Причина</p>
          <p className="text-slate-300">{handoff.reason ?? '—'}</p>
        </div>
        <div>
          <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Статус</p>
          <p className="font-semibold" style={{ color: stroke }}>{statusLabel}</p>
        </div>
        <div>
          <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-0.5">Время</p>
          <p className="text-slate-400">{fmtDate(handoff.created_at)}</p>
        </div>
      </div>
    </div>
  )
}

// ── Pipeline Tab ───────────────────────────────────────────────────────────────

export default function PipelineTab({ agents }: { agents: Agent[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<AgentFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [ready, setReady]                = useState(false)
  const [selected, setSelected]          = useState<Handoff | null>(null)
  const agentsRef = useRef(agents)
  useEffect(() => { agentsRef.current = agents }, [agents])

  const fetchAndBuild = useCallback(async () => {
    const currentAgents = agentsRef.current
    if (currentAgents.length === 0) return

    // 1. Fetch handoffs
    const { data: rows } = await supabase
      .from('agent_handoffs')
      .select('id, from_agent_id, to_agent_id, reason, status, task_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    const rawHandoffs = (rows ?? []) as {
      id: string
      from_agent_id: string | null
      to_agent_id: string | null
      reason: string | null
      status: string | null
      task_id: string | null
      created_at: string
    }[]

    // 2. Fetch task titles if needed
    const taskIds = [...new Set(rawHandoffs.map(h => h.task_id).filter((id): id is string => id != null))]
    let taskMap: Record<string, string> = {}
    if (taskIds.length > 0) {
      const { data: tasks } = await supabase.from('tasks').select('id, title').in('id', taskIds)
      for (const t of tasks ?? []) taskMap[t.id as string] = t.title as string
    }

    // 3. Build agent name map from props
    const agentNameMap: Record<string, string> = {}
    for (const a of currentAgents) agentNameMap[a.id] = a.name

    // 4. Enrich handoffs
    const handoffs: Handoff[] = rawHandoffs.map(h => ({
      ...h,
      task_title:      h.task_id ? (taskMap[h.task_id] ?? null) : null,
      from_agent_name: h.from_agent_id ? (agentNameMap[h.from_agent_id] ?? null) : null,
      to_agent_name:   h.to_agent_id   ? (agentNameMap[h.to_agent_id]   ?? null) : null,
    }))

    // 5. Build nodes
    const flowNodes: AgentFlowNode[] = currentAgents.map((a, i) => ({
      id:       a.id,
      type:     'agentNode' as const,
      position: gridPos(i),
      data:     { name: a.name, role: a.role, status: a.status },
    }))

    // 6. Build edges (dedupe by pair, keep most recent)
    const agentIds = new Set(currentAgents.map(a => a.id))
    const seen = new Set<string>()
    const flowEdges: Edge[] = []

    for (const h of handoffs) {
      if (!h.from_agent_id || !h.to_agent_id) continue
      if (!agentIds.has(h.from_agent_id) || !agentIds.has(h.to_agent_id)) continue
      const key = `${h.from_agent_id}→${h.to_agent_id}`
      if (seen.has(key)) continue
      seen.add(key)

      const stroke = STATUS_STROKE[h.status ?? ''] ?? '#4f4f7a'
      const ageLabel = timeAgo(h.created_at)
      const labelParts = [h.reason, ageLabel].filter(Boolean)

      flowEdges.push({
        id:           h.id,
        source:       h.from_agent_id,
        target:       h.to_agent_id,
        label:        labelParts.join(' · '),
        labelStyle:   { fill: '#94a3b8', fontSize: 10 },
        labelBgStyle: { fill: '#0d0d1a', fillOpacity: 0.85 },
        style:        { stroke, strokeWidth: 1.5 },
        animated:     false,
        data:         { handoff: h } as HandoffEdgeData,
      })
    }

    setNodes(flowNodes)
    setEdges(flowEdges)
    setReady(true)
  }, [setNodes, setEdges])

  // Initial load + 30s auto-refresh
  useEffect(() => {
    if (agents.length === 0) return
    fetchAndBuild()
    const interval = setInterval(fetchAndBuild, 30_000)
    return () => clearInterval(interval)
  }, [agents, fetchAndBuild])

  // Realtime: rebuild graph when agent_events or tasks change (debounced)
  useEffect(() => {
    if (agentsRef.current.length === 0) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const debouncedFetch = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { fetchAndBuild() }, 1000)
    }

    const channel = supabase
      .channel('pipeline-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_events' }, debouncedFetch)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tasks' }, debouncedFetch)
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [fetchAndBuild])

  const onEdgeClick: EdgeMouseHandler = useCallback((_evt, edge) => {
    const data = edge.data as HandoffEdgeData | undefined
    setSelected(data?.handoff ?? null)
  }, [])

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        Загрузка...
      </div>
    )
  }

  return (
    <div style={{ height: '70dvh' }} className="relative rounded-2xl overflow-hidden border border-white/[0.06]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onEdgeClick={onEdgeClick}
        onPaneClick={() => setSelected(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        colorMode="dark"
      >
        <Background color="#2a2a3e" gap={20} size={1} />
        <Controls
          style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
        />
      </ReactFlow>

      {selected && <HandoffPanel handoff={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
