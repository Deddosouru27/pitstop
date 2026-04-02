import { useState, useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { Network, X, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface EntityNode extends d3.SimulationNodeDatum {
  id: string        // UUID from entity_nodes
  name: string
  type: string
  count: number     // mention_count
}

interface EntityEdge {
  source_id: string
  target_id: string
  weight: number
}

type ResolvedLink = { source: EntityNode; target: EntityNode; weight: number }

interface KnowledgeItem {
  knowledge_id: string
  content: string
  source_type: string | null
  knowledge_type: string | null
}

// ── Visual helpers ────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  tool:    '#3b82f6',
  project: '#22c55e',
  concept: '#a855f7',
  person:  '#f97316',
}

function entityColor(type: string): string {
  return TYPE_COLOR[type] ?? '#6b7280'
}

const TYPE_CLS: Record<string, string> = {
  tool:    'bg-blue-900/50 text-blue-400',
  project: 'bg-emerald-900/50 text-emerald-400',
  concept: 'bg-purple-900/50 text-purple-400',
  person:  'bg-orange-900/50 text-orange-400',
}

function nodeR(count: number, maxCount: number): number {
  return 8 + ((count - 1) / Math.max(maxCount - 1, 1)) * 32
}

// ── Node detail panel ─────────────────────────────────────────────────────────

function NodePanel({ node, neighbors, onClose, onSelectNode }: {
  node: EntityNode
  neighbors: EntityNode[]
  onClose: () => void
  onSelectNode: (n: EntityNode) => void
}) {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setKnowledge(null)
    setExpandedId(null)
    supabase
      .from('knowledge_entities')
      .select('knowledge_id, extracted_knowledge(content, source_type, knowledge_type)')
      .eq('entity_id', node.id)
      .limit(10)
      .then(({ data }) => {
        if (cancelled) return
        const items: KnowledgeItem[] = (data ?? []).map((row: {
          knowledge_id: string
          // Supabase returns joined rows as array or object depending on relation type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          extracted_knowledge: any
        }) => {
          const ek = Array.isArray(row.extracted_knowledge)
            ? row.extracted_knowledge[0]
            : row.extracted_knowledge
          return {
            knowledge_id: row.knowledge_id,
            content: ek?.content ?? '',
            source_type: ek?.source_type ?? null,
            knowledge_type: ek?.knowledge_type ?? null,
          }
        }).filter(i => i.content)
        setKnowledge(items)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [node.id])

  const typeLabel = node.type ?? 'entity'
  const typeCls = TYPE_CLS[node.type] ?? 'bg-slate-800 text-slate-400'

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full bg-[#13131a] rounded-t-3xl max-h-[80dvh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: entityColor(node.type) }} />
            <p className="text-slate-100 font-semibold text-base">{node.name}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeCls}`}>
              {typeLabel}
            </span>
            <span className="text-[11px] text-slate-500 px-2 py-0.5 bg-white/5 rounded-full">
              {node.count} упом.
            </span>
          </div>
          <button onClick={onClose} className="text-slate-500 active:text-slate-300 shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-4">
          {/* Connected entities */}
          {neighbors.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">
                Связанные ({neighbors.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {neighbors.map(n => (
                  <button
                    key={n.id}
                    onClick={() => onSelectNode(n)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/[0.06] text-slate-300 active:bg-white/10 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: entityColor(n.type) }} />
                    {n.name}
                    <span className="text-[9px] text-slate-600">{n.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Знания</p>
            {loading && <p className="text-xs text-slate-600">Загрузка...</p>}
            {!loading && knowledge?.length === 0 && (
              <p className="text-xs text-slate-600 italic">Знаний не найдено</p>
            )}
            {!loading && knowledge && knowledge.length > 0 && (
              <div className="space-y-2">
                {knowledge.map(item => {
                  const isExpanded = expandedId === item.knowledge_id
                  return (
                    <button
                      key={item.knowledge_id}
                      onClick={() => setExpandedId(isExpanded ? null : item.knowledge_id)}
                      className="w-full text-left bg-white/[0.04] rounded-xl px-3 py-2.5 border border-white/[0.06] space-y-1.5 active:bg-white/[0.07] transition-colors"
                    >
                      <p className={`text-sm text-slate-200 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {item.content}
                      </p>
                      {item.knowledge_type && (
                        <span className="text-[10px] text-purple-400 bg-purple-900/40 px-1.5 py-0.5 rounded-full">
                          {item.knowledge_type}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const GRAPH_H = 540

export default function GraphPage() {
  const [nodes, setNodes] = useState<EntityNode[]>([])
  const [edges, setEdges] = useState<EntityEdge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<EntityNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const highlightRef = useRef<(q: string) => void>(() => { /* noop */ })

  // ── Fetch data from SQL tables ───────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase
        .from('entity_nodes')
        .select('id, name, type, mention_count')
        .gte('mention_count', 2)
        .order('mention_count', { ascending: false })
        .limit(80),
      supabase
        .from('entity_edges')
        .select('source_id, target_id, weight')
        .gte('weight', 1),
    ]).then(([nodesRes, edgesRes]) => {
      if (cancelled) return
      setNodes((nodesRes.data ?? []).map(r => ({
        id: r.id,
        name: r.name,
        type: r.type ?? 'unknown',
        count: r.mention_count ?? 1,
      })))
      setEdges(edgesRes.data ?? [])
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const maxCount = useMemo(
    () => nodes.length > 0 ? Math.max(...nodes.map(n => n.count)) : 1,
    [nodes],
  )

  const nodeById = useMemo(
    () => new Map(nodes.map(n => [n.id, n])),
    [nodes],
  )

  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>()
    for (const e of edges) {
      if (!adj.has(e.source_id)) adj.set(e.source_id, new Set())
      if (!adj.has(e.target_id)) adj.set(e.target_id, new Set())
      adj.get(e.source_id)!.add(e.target_id)
      adj.get(e.target_id)!.add(e.source_id)
    }
    return adj
  }, [edges])

  const selectedNeighbors = useMemo(() => {
    if (!selectedNode) return []
    const ids = adjacency.get(selectedNode.id) ?? new Set<string>()
    return [...ids].map(id => nodeById.get(id)).filter((n): n is EntityNode => !!n)
  }, [selectedNode, adjacency, nodeById])

  // ── D3 visualization ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return

    const container = containerRef.current
    const W = container.clientWidth || 375
    const H = GRAPH_H

    d3.select(container).selectAll('*').remove()

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', H)
      .style('touch-action', 'none')
      .style('background', 'transparent') as d3.Selection<SVGSVGElement, unknown, null, undefined>

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', e => g.attr('transform', e.transform.toString()))
    svg.call(zoom)

    const total = nodes.length
    const simNodes: EntityNode[] = nodes.map((n, i) => ({
      ...n,
      x: W / 2 + Math.cos((i * 2 * Math.PI) / total) * 160,
      y: H / 2 + Math.sin((i * 2 * Math.PI) / total) * 160,
    }))

    const simNodeById = new Map(simNodes.map(n => [n.id, n]))

    const simLinks: ResolvedLink[] = edges
      .map(e => {
        const src = simNodeById.get(e.source_id)
        const tgt = simNodeById.get(e.target_id)
        if (!src || !tgt) return null
        return { source: src, target: tgt, weight: e.weight }
      })
      .filter((l): l is ResolvedLink => l !== null)

    const simulation = d3.forceSimulation<EntityNode>(simNodes)
      .force('link', d3.forceLink<EntityNode, ResolvedLink>(simLinks).id(d => d.id).distance(50).strength(0.8))
      .force('charge', d3.forceManyBody<EntityNode>().strength(-30))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.4))
      .force('collision', d3.forceCollide<EntityNode>().radius(d => nodeR(d.count, maxCount) + 5))

    const drag = d3.drag<SVGGElement, EntityNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x; d.fy = d.y
      })
      .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null; d.fy = null
      })

    const link = g.append('g')
      .selectAll<SVGLineElement, ResolvedLink>('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.07)')
      .attr('stroke-width', l => Math.min(3, 0.5 + l.weight * 0.3))

    const node = g.append('g')
      .selectAll<SVGGElement, EntityNode>('g')
      .data(simNodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(drag)

    node.append('circle')
      .attr('r', d => nodeR(d.count, maxCount))
      .attr('fill', d => entityColor(d.type))
      .attr('fill-opacity', 0.7)
      .attr('stroke', d => entityColor(d.type))
      .attr('stroke-width', 1.5)

    // Labels for nodes with count >= 3
    node.filter(d => d.count >= 3)
      .append('text')
      .text(d => d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeR(d.count, maxCount) + 12)
      .attr('font-size', d => Math.round(9 + ((d.count - 1) / Math.max(maxCount - 1, 1)) * 3))
      .attr('fill', 'rgba(255,255,255,0.65)')
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    node
      .on('pointerenter', function(_, hovered) {
        const connected = new Set([
          hovered.id,
          ...simLinks.filter(l => l.source.id === hovered.id || l.target.id === hovered.id)
            .flatMap(l => [l.source.id, l.target.id]),
        ])
        node.select('circle')
          .attr('fill-opacity', n => connected.has(n.id) ? 1 : 0.1)
          .attr('stroke-opacity', n => connected.has(n.id) ? 1 : 0.1)
        link
          .attr('stroke', l => l.source.id === hovered.id || l.target.id === hovered.id
            ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.02)')
          .attr('stroke-width', l => l.source.id === hovered.id || l.target.id === hovered.id ? 2 : 1)
      })
      .on('pointerleave', function() {
        node.select('circle').attr('fill-opacity', 0.7).attr('stroke-opacity', 1)
        link.attr('stroke', 'rgba(255,255,255,0.07)')
          .attr('stroke-width', l => Math.min(3, 0.5 + l.weight * 0.3))
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelectedNode(d)
      })

    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x ?? 0).attr('y1', d => d.source.y ?? 0)
        .attr('x2', d => d.target.x ?? 0).attr('y2', d => d.target.y ?? 0)
      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    highlightRef.current = (query: string) => {
      if (!query.trim()) {
        node.select('circle').attr('fill-opacity', 0.7).attr('stroke', d => entityColor(d.type)).attr('stroke-width', 1.5)
        return
      }
      const q = query.toLowerCase()
      node.select('circle')
        .attr('fill-opacity', d => d.name.toLowerCase().includes(q) ? 1 : 0.1)
        .attr('stroke', d => d.name.toLowerCase().includes(q) ? 'white' : entityColor(d.type))
        .attr('stroke-width', d => d.name.toLowerCase().includes(q) ? 3 : 1)
      const found = simNodes.find(n => n.name.toLowerCase().includes(q))
      if (found?.x != null && found?.y != null) {
        const cW = (container.querySelector('svg') as SVGSVGElement | null)?.clientWidth ?? W
        const target = d3.zoomIdentity.translate(cW / 2, H / 2).scale(2).translate(-found.x, -found.y)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(svg.transition().duration(500) as any).call(zoom.transform, target)
      }
    }

    return () => { simulation.stop() }
  }, [nodes, edges, maxCount])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Network size={20} className="text-purple-400 shrink-0" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-slate-100">Graph</h1>
          {!loading && nodes.length > 0 && (
            <span className="text-xs text-slate-500 ml-1">
              {nodes.length} entities · {edges.length} edges
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      {!loading && nodes.length > 0 && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); highlightRef.current(e.target.value) }}
              placeholder="Найти entity..."
              className="w-full bg-white/5 border border-white/[0.06] rounded-xl pl-8 pr-8 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-purple-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); highlightRef.current('') }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 active:text-slate-300"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center flex-1 py-20 text-slate-500 text-sm">
          Загрузка...
        </div>
      )}

      {!loading && nodes.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 py-20 space-y-2">
          <p className="text-3xl">🕸</p>
          <p className="text-sm text-slate-500">Таблица entity_nodes пуста</p>
          <p className="text-xs text-slate-600">Запусти /build_graph чтобы заполнить</p>
        </div>
      )}

      {/* D3 canvas */}
      <div ref={containerRef} className="w-full" />

      {!loading && nodes.length > 0 && (
        <>
          <p className="text-center text-xs text-slate-600 pt-1 pb-2">
            Drag · pinch to zoom · tap for details
          </p>
          <div className="px-4 pb-2 flex flex-wrap gap-3 justify-center">
            {[
              { color: '#3b82f6', label: 'tool' },
              { color: '#22c55e', label: 'project' },
              { color: '#a855f7', label: 'concept' },
              { color: '#f97316', label: 'person' },
              { color: '#6b7280', label: 'other' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
        </>
      )}

      {selectedNode && (
        <NodePanel
          node={selectedNode}
          neighbors={selectedNeighbors}
          onClose={() => setSelectedNode(null)}
          onSelectNode={n => setSelectedNode(n)}
        />
      )}
    </div>
  )
}
