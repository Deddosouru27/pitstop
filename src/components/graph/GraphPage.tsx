import { useState, useEffect, useMemo } from 'react'
import { Network, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ExtractedKnowledge } from '../../types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  count: number
  itemIds: string[]
}

interface GraphEdge {
  source: string
  target: string
}

// ── Force simulation ──────────────────────────────────────────────────────────

function buildGraph(items: ExtractedKnowledge[], W: number, H: number) {
  const entityItems = new Map<string, string[]>()

  for (const item of items) {
    if (!item.entities || item.entities.length === 0) continue
    for (const raw of item.entities) {
      const entity = raw.trim()
      if (!entity) continue
      if (!entityItems.has(entity)) entityItems.set(entity, [])
      entityItems.get(entity)!.push(item.id)
    }
  }

  // Top 60 by mention count
  const sorted = [...entityItems.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 60)

  const cx = W / 2, cy = H / 2
  const total = sorted.length

  const nodes: GraphNode[] = sorted.map(([id, ids], i) => ({
    id,
    x: cx + Math.cos((i * 2 * Math.PI) / total) * 200,
    y: cy + Math.sin((i * 2 * Math.PI) / total) * 200,
    vx: 0, vy: 0,
    count: ids.length,
    itemIds: ids,
  }))

  const entitySet = new Set(sorted.map(([id]) => id))
  const edgeSet = new Set<string>()
  const edges: GraphEdge[] = []

  for (const item of items) {
    if (!item.entities || item.entities.length < 2) continue
    const relevant = item.entities.map(e => e.trim()).filter(e => entitySet.has(e))
    for (let i = 0; i < relevant.length; i++) {
      for (let j = i + 1; j < relevant.length; j++) {
        const key = [relevant[i], relevant[j]].sort().join('\x00')
        if (!edgeSet.has(key)) {
          edgeSet.add(key)
          edges.push({ source: relevant[i], target: relevant[j] })
        }
      }
    }
  }

  const nodeMap = new Map<string, GraphNode>(nodes.map(n => [n.id, n]))

  for (let iter = 0; iter < 180; iter++) {
    const alpha = 1 - iter / 180

    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]
        const dx = b.x - a.x || 0.01
        const dy = b.y - a.y || 0.01
        const distSq = Math.max(1, dx * dx + dy * dy)
        const dist = Math.sqrt(distSq)
        const force = (5000 / distSq) * alpha
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx -= fx; a.vy -= fy
        b.vx += fx; b.vy += fy
      }
    }

    // Edge attraction
    for (const edge of edges) {
      const a = nodeMap.get(edge.source)
      const b = nodeMap.get(edge.target)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const ideal = 90
      const force = (dist - ideal) * 0.03 * alpha
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx += fx; a.vy += fy
      b.vx -= fx; b.vy -= fy
    }

    // Center gravity
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.012 * alpha
      n.vy += (cy - n.y) * 0.012 * alpha
    }

    // Integrate + dampen
    for (const n of nodes) {
      n.x += n.vx
      n.y += n.vy
      n.vx *= 0.78
      n.vy *= 0.78
      n.x = Math.max(24, Math.min(W - 24, n.x))
      n.y = Math.max(24, Math.min(H - 24, n.y))
    }
  }

  return { nodes, edges }
}

function entityColor(entity: string): string {
  let h = 0
  for (let i = 0; i < entity.length; i++) {
    h = ((h * 31) + entity.charCodeAt(i)) & 0x3fffffff
  }
  const hue = h % 360
  return `hsl(${hue}, 55%, 55%)`
}

function nodeRadius(count: number, maxCount: number): number {
  return 6 + ((count - 1) / Math.max(maxCount - 1, 1)) * 16
}

// ── Selected node panel ───────────────────────────────────────────────────────

function NodePanel({
  node,
  allItems,
  onClose,
}: {
  node: GraphNode
  allItems: ExtractedKnowledge[]
  onClose: () => void
}) {
  const items = useMemo(
    () => allItems.filter(i => node.itemIds.includes(i.id)),
    [node, allItems]
  )
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[70dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: entityColor(node.id) }}
            />
            <p className="text-slate-100 font-semibold text-sm">{node.id}</p>
            <span className="text-[11px] text-slate-500 px-2 py-0.5 bg-white/5 rounded-full">
              {node.count} {node.count === 1 ? 'знание' : node.count < 5 ? 'знания' : 'знаний'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="bg-white/[0.04] rounded-xl px-3 py-2.5 border border-white/[0.06] space-y-1"
            >
              <p className="text-sm text-slate-200 leading-relaxed line-clamp-3">{item.content}</p>
              {item.knowledge_type && (
                <span className="text-[10px] text-purple-400 bg-purple-900/40 px-1.5 py-0.5 rounded-full">
                  {item.knowledge_type}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function GraphPage() {
  const [rawItems, setRawItems] = useState<ExtractedKnowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)

  useEffect(() => {
    supabase
      .from('extracted_knowledge')
      .select('id, content, knowledge_type, entities')
      .not('entities', 'eq', '{}')
      .then(({ data }) => {
        setRawItems((data as ExtractedKnowledge[]) ?? [])
        setLoading(false)
      })
  }, [])

  const { nodes, edges } = useMemo(() => {
    if (!rawItems.length) return { nodes: [] as GraphNode[], edges: [] as GraphEdge[] }
    return buildGraph(rawItems, 600, 600)
  }, [rawItems])

  const nodeMap = useMemo(
    () => new Map<string, GraphNode>(nodes.map(n => [n.id, n])),
    [nodes]
  )

  const maxCount = nodes.length > 0 ? Math.max(...nodes.map(n => n.count)) : 1

  const padding = 32
  const minX = nodes.length > 0 ? Math.min(...nodes.map(n => n.x)) - padding : 0
  const minY = nodes.length > 0 ? Math.min(...nodes.map(n => n.y)) - padding : 0
  const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.x)) + padding : 600
  const maxY = nodes.length > 0 ? Math.max(...nodes.map(n => n.y)) + padding : 600

  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Network size={20} className="text-purple-400 shrink-0" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-slate-100">Graph</h1>
          {!loading && (
            <span className="text-xs text-slate-500 ml-1">
              {nodes.length} entities · {edges.length} рёбер
            </span>
          )}
        </div>
        <p className="text-xs text-slate-600 mt-0.5">Entity graph из базы знаний</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center flex-1 py-20 text-slate-500 text-sm">
          Загрузка...
        </div>
      )}

      {!loading && nodes.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 py-20 space-y-2">
          <p className="text-3xl">🕸</p>
          <p className="text-sm text-slate-500">Нет entities в базе знаний</p>
          <p className="text-xs text-slate-600">Поле entities не заполнено</p>
        </div>
      )}

      {!loading && nodes.length > 0 && (
        <div className="px-2 flex-1">
          <svg
            viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
            style={{ width: '100%', height: 'auto', maxHeight: '65vh', display: 'block' }}
          >
            {/* Edges */}
            {edges.map((edge, i) => {
              const src = nodeMap.get(edge.source)
              const tgt = nodeMap.get(edge.target)
              if (!src || !tgt) return null
              return (
                <line
                  key={i}
                  x1={src.x} y1={src.y}
                  x2={tgt.x} y2={tgt.y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth={1}
                />
              )
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const r = nodeRadius(node.count, maxCount)
              const color = entityColor(node.id)
              const isSelected = selectedNode?.id === node.id
              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    cx={node.x} cy={node.y} r={r}
                    fill={color}
                    fillOpacity={isSelected ? 1 : 0.65}
                    stroke={color}
                    strokeWidth={isSelected ? 2 : 1}
                    strokeOpacity={0.9}
                  />
                  {node.count >= 3 && (
                    <text
                      x={node.x}
                      y={node.y + r + 9}
                      textAnchor="middle"
                      fontSize={7}
                      fill="rgba(255,255,255,0.45)"
                      style={{ pointerEvents: 'none' }}
                    >
                      {node.id.length > 14 ? node.id.slice(0, 14) + '…' : node.id}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>

          {/* Legend */}
          <p className="text-center text-xs text-slate-600 mt-2">
            Размер ноды = частота упоминаний · нажми для просмотра
          </p>
        </div>
      )}

      {selectedNode && (
        <NodePanel
          node={selectedNode}
          allItems={rawItems}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}
