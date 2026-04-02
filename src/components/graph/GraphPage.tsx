import { useState, useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { Network, X, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ExtractedKnowledge } from '../../types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  count: number
  itemIds: string[]
}

type ResolvedLink = { source: GraphNode; target: GraphNode }

// ── Data builder ──────────────────────────────────────────────────────────────

function buildGraphData(items: ExtractedKnowledge[]): { nodes: GraphNode[]; rawLinks: { source: string; target: string }[] } {
  const entityItems = new Map<string, string[]>()

  for (const item of items) {
    if (!item.entities?.length) continue
    for (const raw of item.entities) {
      const entity = raw.trim()
      if (!entity) continue
      if (!entityItems.has(entity)) entityItems.set(entity, [])
      entityItems.get(entity)!.push(item.id)
    }
  }

  const sorted = [...entityItems.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 60)

  const nodes: GraphNode[] = sorted.map(([id, ids]) => ({ id, count: ids.length, itemIds: ids }))

  const entitySet = new Set(sorted.map(([id]) => id))
  const edgeSet = new Set<string>()
  const rawLinks: { source: string; target: string }[] = []

  for (const item of items) {
    if (!item.entities || item.entities.length < 2) continue
    const rel = item.entities.map(e => e.trim()).filter(e => entitySet.has(e))
    for (let i = 0; i < rel.length; i++) {
      for (let j = i + 1; j < rel.length; j++) {
        const key = [rel[i], rel[j]].sort().join('\x00')
        if (!edgeSet.has(key)) {
          edgeSet.add(key)
          rawLinks.push({ source: rel[i], target: rel[j] })
        }
      }
    }
  }

  return { nodes, rawLinks }
}

// ── Visual helpers ────────────────────────────────────────────────────────────

const KNOWN_TOOLS = new Set(['Claude', 'Supabase', 'Vercel', 'Railway',
  'Haiku', 'Apify', 'Whisper', 'GitHub', 'Obsidian', 'Pinecone',
  'Sentry', 'Stripe', 'Cohere', 'OpenAI', 'Playwright', 'MCP',
  'Telegram', 'pgvector', 'LangChain'])
const KNOWN_PROJECTS = new Set(['MAOS', 'Pitstop', 'Life RPG', 'MAOS Brain',
  'MAOS Intake', 'MAOS Runner'])
const KNOWN_CONCEPTS = new Set(['RAG', 'Embeddings', 'Knowledge Base',
  'AI Agents', 'Graph Memory'])

function entityColor(entity: string): string {
  if (KNOWN_TOOLS.has(entity))    return '#3b82f6'
  if (KNOWN_PROJECTS.has(entity)) return '#22c55e'
  if (KNOWN_CONCEPTS.has(entity)) return '#a855f7'
  if (entity.startsWith('@'))     return '#f97316'
  return '#6b7280'
}

function nodeR(count: number, maxCount: number): number {
  return 8 + ((count - 1) / Math.max(maxCount - 1, 1)) * 32
}

// ── Entity type helpers ───────────────────────────────────────────────────────

function entityType(name: string): { label: string; cls: string } {
  if (KNOWN_TOOLS.has(name))    return { label: 'tool',    cls: 'bg-blue-900/50 text-blue-400' }
  if (KNOWN_PROJECTS.has(name)) return { label: 'project', cls: 'bg-emerald-900/50 text-emerald-400' }
  if (KNOWN_CONCEPTS.has(name)) return { label: 'concept', cls: 'bg-purple-900/50 text-purple-400' }
  if (name.startsWith('@'))     return { label: 'person',  cls: 'bg-orange-900/50 text-orange-400' }
  return                               { label: 'entity',  cls: 'bg-slate-800 text-slate-400' }
}

// ── Node panel ────────────────────────────────────────────────────────────────

function NodePanel({ node, allItems, neighbors, onClose, onSelectNode }: {
  node: GraphNode
  allItems: ExtractedKnowledge[]
  neighbors: GraphNode[]
  onClose: () => void
  onSelectNode: (n: GraphNode) => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const items = useMemo(
    () => allItems.filter(i => node.itemIds.includes(i.id)),
    [node, allItems],
  )
  const type = entityType(node.id)

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
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: entityColor(node.id) }} />
            <p className="text-slate-100 font-semibold text-base">{node.id}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${type.cls}`}>
              {type.label}
            </span>
            <span className="text-[11px] text-slate-500 px-2 py-0.5 bg-white/5 rounded-full">
              {node.count} {node.count === 1 ? 'знание' : node.count < 5 ? 'знания' : 'знаний'}
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
                Связанные entity ({neighbors.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {neighbors.map(n => (
                  <button
                    key={n.id}
                    onClick={() => onSelectNode(n)}
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/[0.06] text-slate-300 active:bg-white/10 transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: entityColor(n.id) }} />
                    {n.id}
                    <span className="text-[9px] text-slate-600">{n.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge items */}
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">
              Знания
            </p>
            <div className="space-y-2">
              {items.map(item => {
                const isExpanded = expandedId === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full text-left bg-white/[0.04] rounded-xl px-3 py-2.5 border border-white/[0.06] space-y-1.5 active:bg-white/[0.07] transition-colors"
                  >
                    <p className={`text-sm text-slate-200 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {item.content}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.knowledge_type && (
                        <span className="text-[10px] text-purple-400 bg-purple-900/40 px-1.5 py-0.5 rounded-full">
                          {item.knowledge_type}
                        </span>
                      )}
                      {item.business_value && (
                        <span className="text-[10px] text-slate-500 line-clamp-1 flex-1">
                          🎯 {item.business_value}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const GRAPH_H = 540

export default function GraphPage() {
  const [rawItems, setRawItems] = useState<ExtractedKnowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  // Stored inside D3 effect closure; updated each rebuild
  const highlightRef = useRef<(q: string) => void>(() => { /* noop until graph built */ })

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

  const { nodes: graphNodes, rawLinks } = useMemo(
    () => rawItems.length ? buildGraphData(rawItems) : { nodes: [] as GraphNode[], rawLinks: [] as { source: string; target: string }[] },
    [rawItems],
  )

  const maxCount = useMemo(
    () => graphNodes.length > 0 ? Math.max(...graphNodes.map(n => n.count)) : 1,
    [graphNodes],
  )

  const nodeById = useMemo(
    () => new Map(graphNodes.map(n => [n.id, n])),
    [graphNodes],
  )

  // Precompute adjacency: entity id → neighbour ids
  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>()
    for (const { source, target } of rawLinks) {
      if (!adj.has(source)) adj.set(source, new Set())
      if (!adj.has(target)) adj.set(target, new Set())
      adj.get(source)!.add(target)
      adj.get(target)!.add(source)
    }
    return adj
  }, [rawLinks])

  const selectedNeighbors = useMemo(() => {
    if (!selectedNode) return []
    const ids = adjacency.get(selectedNode.id) ?? new Set<string>()
    return [...ids].map(id => nodeById.get(id)).filter((n): n is GraphNode => !!n)
  }, [selectedNode, adjacency, nodeById])

  // ── D3 visualization ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || graphNodes.length === 0) return

    const container = containerRef.current
    const W = container.clientWidth || 375
    const H = GRAPH_H

    // Clear previous render
    d3.select(container).selectAll('*').remove()

    const svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', H)
      .style('touch-action', 'none')
      .style('background', 'transparent') as d3.Selection<SVGSVGElement, unknown, null, undefined>

    const g = svg.append('g')

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 5])
      .on('zoom', e => g.attr('transform', e.transform.toString()))

    svg.call(zoom)

    // Build simulation copies (D3 mutates x/y on nodes)
    const total = graphNodes.length
    const simNodes: GraphNode[] = graphNodes.map((n, i) => ({
      ...n,
      x: W / 2 + Math.cos((i * 2 * Math.PI) / total) * 180,
      y: H / 2 + Math.sin((i * 2 * Math.PI) / total) * 180,
    }))

    const nodeById = new Map(simNodes.map(n => [n.id, n]))

    const simLinks: ResolvedLink[] = rawLinks
      .map(l => ({ source: nodeById.get(l.source)!, target: nodeById.get(l.target)! }))
      .filter((l): l is ResolvedLink => !!(l.source && l.target))

    // Simulation
    const simulation = d3.forceSimulation<GraphNode>(simNodes)
      .force('link', d3.forceLink<GraphNode, ResolvedLink>(simLinks).id(d => d.id).distance(50).strength(0.8))
      .force('charge', d3.forceManyBody<GraphNode>().strength(-30))
      .force('center', d3.forceCenter(W / 2, H / 2).strength(0.4))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => nodeR(d.count, maxCount) + 6))

    // Drag
    const drag = d3.drag<SVGGElement, GraphNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x; d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x; d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null; d.fy = null
      })

    // Edges
    const link = g.append('g')
      .selectAll<SVGLineElement, ResolvedLink>('line')
      .data(simLinks)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.07)')
      .attr('stroke-width', 1)

    // Node groups
    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(simNodes)
      .join('g')
      .style('cursor', 'pointer')
      .call(drag)

    node.append('circle')
      .attr('r', d => nodeR(d.count, maxCount))
      .attr('fill', d => entityColor(d.id))
      .attr('fill-opacity', 0.7)
      .attr('stroke', d => entityColor(d.id))
      .attr('stroke-width', 1.5)

    // Labels always visible, size scales with node
    node.append('text')
      .text(d => d.id.length > 16 ? d.id.slice(0, 15) + '…' : d.id)
      .attr('text-anchor', 'middle')
      .attr('dy', d => nodeR(d.count, maxCount) + 12)
      .attr('font-size', d => Math.round(10 + ((d.count - 1) / Math.max(maxCount - 1, 1)) * 4))
      .attr('fill', 'rgba(255,255,255,0.65)')
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // Hover — highlight connected
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
            ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.03)')
          .attr('stroke-width', l => l.source.id === hovered.id || l.target.id === hovered.id ? 2 : 1)
      })
      .on('pointerleave', function() {
        node.select('circle').attr('fill-opacity', 0.7).attr('stroke-opacity', 1)
        link.attr('stroke', 'rgba(255,255,255,0.07)').attr('stroke-width', 1)
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        setSelectedNode(d)
      })

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x ?? 0).attr('y1', d => d.source.y ?? 0)
        .attr('x2', d => d.target.x ?? 0).attr('y2', d => d.target.y ?? 0)
      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    // Search highlight + camera — stored in ref so React search input can call it
    highlightRef.current = (query: string) => {
      if (!query.trim()) {
        node.select('circle')
          .attr('fill-opacity', 0.7)
          .attr('stroke', d => entityColor(d.id))
          .attr('stroke-width', 1.5)
        return
      }
      const q = query.toLowerCase()
      node.select('circle')
        .attr('fill-opacity', d => d.id.toLowerCase().includes(q) ? 1 : 0.1)
        .attr('stroke', d => d.id.toLowerCase().includes(q) ? 'white' : entityColor(d.id))
        .attr('stroke-width', d => d.id.toLowerCase().includes(q) ? 3 : 1)

      const found = simNodes.find(n => n.id.toLowerCase().includes(q))
      if (found?.x != null && found?.y != null) {
        const cW = (container.querySelector('svg') as SVGSVGElement | null)?.clientWidth ?? W
        const target = d3.zoomIdentity
          .translate(cW / 2, H / 2)
          .scale(2)
          .translate(-found.x, -found.y)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(svg.transition().duration(500) as any).call(zoom.transform, target)
      }
    }

    return () => { simulation.stop() }
  }, [graphNodes, rawLinks, maxCount])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full pb-4">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <Network size={20} className="text-purple-400 shrink-0" strokeWidth={1.75} />
          <h1 className="text-2xl font-bold text-slate-100">Graph</h1>
          {!loading && graphNodes.length > 0 && (
            <span className="text-xs text-slate-500 ml-1">
              {graphNodes.length} entities · {rawLinks.length} edges
            </span>
          )}
        </div>
      </div>

      {/* Search */}
      {!loading && graphNodes.length > 0 && (
        <div className="px-4 pb-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value)
                highlightRef.current(e.target.value)
              }}
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

      {!loading && graphNodes.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 py-20 space-y-2">
          <p className="text-3xl">🕸</p>
          <p className="text-sm text-slate-500">Нет entities в базе знаний</p>
          <p className="text-xs text-slate-600">Поле entities не заполнено</p>
        </div>
      )}

      {/* D3 mounts here */}
      <div ref={containerRef} className="w-full" />

      {!loading && graphNodes.length > 0 && (
        <p className="text-center text-xs text-slate-600 pt-1 pb-2">
          Drag · pinch to zoom · tap for details
        </p>
      )}

      {/* Color legend */}
      {!loading && graphNodes.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-3 justify-center">
          {[
            { color: '#3b82f6', label: 'Инструменты' },
            { color: '#22c55e', label: 'Проекты' },
            { color: '#a855f7', label: 'Концепции' },
            { color: '#f97316', label: 'Люди / @' },
            { color: '#6b7280', label: 'Прочее' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      )}

      {selectedNode && (
        <NodePanel
          node={selectedNode}
          allItems={rawItems}
          neighbors={selectedNeighbors}
          onClose={() => setSelectedNode(null)}
          onSelectNode={n => setSelectedNode(n)}
        />
      )}
    </div>
  )
}
