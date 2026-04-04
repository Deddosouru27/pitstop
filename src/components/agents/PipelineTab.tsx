import { useState, useEffect, useCallback } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { supabase } from '../../lib/supabase'
import type { Agent, AgentStatus } from '../../hooks/useAgents'

// ── Node type ──────────────────────────────────────────────────────────────────

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

// ── Handoff type ───────────────────────────────────────────────────────────────

interface Handoff {
  id: string
  from_agent_id: string | null
  to_agent_id: string | null
  reason: string | null
}

// ── Pipeline Tab ───────────────────────────────────────────────────────────────

export default function PipelineTab({ agents }: { agents: Agent[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<AgentFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [ready, setReady] = useState(false)

  const buildGraph = useCallback((handoffs: Handoff[]) => {
    const flowNodes: AgentFlowNode[] = agents.map((a, i) => ({
      id:       a.id,
      type:     'agentNode' as const,
      position: gridPos(i),
      data:     { name: a.name, role: a.role, status: a.status },
    }))

    const agentIds = new Set(agents.map(a => a.id))
    const seen = new Set<string>()
    const flowEdges: Edge[] = []

    for (const h of handoffs) {
      if (!h.from_agent_id || !h.to_agent_id) continue
      if (!agentIds.has(h.from_agent_id) || !agentIds.has(h.to_agent_id)) continue
      const key = `${h.from_agent_id}→${h.to_agent_id}`
      if (seen.has(key)) continue
      seen.add(key)
      flowEdges.push({
        id:            h.id,
        source:        h.from_agent_id,
        target:        h.to_agent_id,
        label:         h.reason ?? undefined,
        labelStyle:    { fill: '#64748b', fontSize: 10 },
        labelBgStyle:  { fill: '#0d0d1a', fillOpacity: 0.8 },
        style:         { stroke: '#4f4f7a', strokeWidth: 1.5 },
        animated:      false,
      })
    }

    setNodes(flowNodes)
    setEdges(flowEdges)
    setReady(true)
  }, [agents, setNodes, setEdges])

  useEffect(() => {
    if (agents.length === 0) return
    supabase
      .from('agent_handoffs')
      .select('id, from_agent_id, to_agent_id, reason')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => buildGraph((data ?? []) as Handoff[]))
  }, [agents, buildGraph])

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
        Загрузка...
      </div>
    )
  }

  return (
    <div style={{ height: '70dvh' }} className="rounded-2xl overflow-hidden border border-white/[0.06]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
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
    </div>
  )
}
