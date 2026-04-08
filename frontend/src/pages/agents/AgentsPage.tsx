import { Link, useNavigate } from 'react-router-dom'
import { Plus, Bot, Trash2, ChevronRight } from 'lucide-react'
import { useAgents } from '../../context/AgentsContext'
import { getModelBadgeClasses } from '../../utils/models'

export function AgentsPage() {
  const navigate = useNavigate()
  const { list: agents, remove } = useAgents()

  const handleDelete = async (slug: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm(`Delete agent "${slug}"?`)) return
    await remove.mutateAsync(slug)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Agents</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Your Claude Code agents</p>
        </div>
        <button
          onClick={() => navigate('/agents/new')}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/30"
        >
          <Plus size={15} />
          New Agent
        </button>
      </div>

      {/* Loading */}
      {agents.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!agents.isLoading && agents.data?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
            <Bot size={24} className="text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">No agents yet</p>
          <p className="text-zinc-600 text-sm mt-1 mb-4">Create your first agent to get started</p>
          <button
            onClick={() => navigate('/agents/new')}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={14} /> Create agent
          </button>
        </div>
      )}

      {/* Grid */}
      {agents.data && agents.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.data.map(agent => {
            const badge = getModelBadgeClasses(agent.frontmatter.model)
            const color = agent.frontmatter.color || '#3b82f6'
            return (
              <Link
                key={agent.slug}
                to={`/agents/${agent.slug}`}
                className="group relative bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Delete */}
                <button
                  onClick={(e) => handleDelete(agent.slug, e)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-all"
                >
                  <Trash2 size={13} />
                </button>

                {/* Avatar + name */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shrink-0 shadow-md"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}
                  >
                    {agent.frontmatter.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-100 truncate">{agent.frontmatter.name}</div>
                    {agent.frontmatter.model && (
                      <span className={`inline-block text-xs px-1.5 py-0.5 rounded-md mt-0.5 ${badge.bg} ${badge.text}`}>
                        {agent.frontmatter.model}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">{agent.frontmatter.description}</p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800/60">
                  <span className="text-xs text-zinc-600">{agent.frontmatter.skills?.length ? `${agent.frontmatter.skills.length} skill${agent.frontmatter.skills.length !== 1 ? 's' : ''}` : 'No skills'}</span>
                  <ChevronRight size={13} className="text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
