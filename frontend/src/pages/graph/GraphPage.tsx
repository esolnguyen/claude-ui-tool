import { useEffect, useState, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { api } from '../../utils/api'
import type { Relationship } from '../../types'

const TYPE_COLORS: Record<string, string> = {
  agent: '#3b82f6',
  command: '#10b981',
  skill: '#f59e0b',
  plugin: '#8b5cf6',
  mcp: '#ec4899',
}

function buildGraph(relationships: Relationship[]): { nodes: Node[]; edges: Edge[] } {
  const nodeMap = new Map<string, Node>()
  const edges: Edge[] = []

  const ensureNode = (type: string, slug: string) => {
    const id = `${type}:${slug}`
    if (!nodeMap.has(id)) {
      nodeMap.set(id, {
        id,
        data: { label: slug },
        position: { x: Math.random() * 600, y: Math.random() * 400 },
        style: {
          background: `${TYPE_COLORS[type] || '#71717a'}22`,
          border: `1px solid ${TYPE_COLORS[type] || '#71717a'}`,
          borderRadius: 8,
          color: '#f4f4f5',
          fontSize: 12,
          padding: '6px 12px',
        },
      })
    }
  }

  for (const rel of relationships) {
    ensureNode(rel.sourceType, rel.sourceSlug)
    ensureNode(rel.targetType, rel.targetSlug)
    edges.push({
      id: `${rel.sourceType}:${rel.sourceSlug}->${rel.targetType}:${rel.targetSlug}`,
      source: `${rel.sourceType}:${rel.sourceSlug}`,
      target: `${rel.targetType}:${rel.targetSlug}`,
      label: rel.type,
      style: { stroke: '#52525b' },
      labelStyle: { fill: '#71717a', fontSize: 10 },
    })
  }

  return { nodes: Array.from(nodeMap.values()), edges }
}

export function GraphPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)

  const loadGraph = useCallback(async () => {
    try {
      const data = await api.get<{ relationships: Relationship[] }>('/relationships')
      const { nodes: n, edges: e } = buildGraph(data.relationships)
      setNodes(n)
      setEdges(e)
    } catch (e) {
      console.error('[Graph] Failed to load relationships', e)
    } finally {
      setLoading(false)
    }
  }, [setNodes, setEdges])

  useEffect(() => { void loadGraph() }, [loadGraph])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500 text-sm">Loading graph…</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        className="bg-zinc-950"
      >
        <Background color="#27272a" gap={24} />
        <Controls className="[&_button]:bg-zinc-900 [&_button]:border-zinc-700 [&_button]:text-zinc-400" />
        <MiniMap
          nodeColor={node => {
            const type = (node.id as string).split(':')[0]
            return TYPE_COLORS[type || ''] || '#71717a'
          }}
          className="bg-zinc-900 border border-zinc-800 rounded-lg"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-20 right-4 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 backdrop-blur">
        <p className="text-xs text-zinc-500 mb-2">Node Types</p>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded" style={{ background: color }} />
            <span className="text-xs text-zinc-400 capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
