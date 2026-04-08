import { Link, useNavigate } from 'react-router-dom'
import { Plus, Terminal, Trash2, FolderOpen, ChevronRight } from 'lucide-react'
import { useCommands } from '../../context/CommandsContext'

export function CommandsPage() {
  const navigate = useNavigate()
  const { list: commands, remove } = useCommands()

  const handleDelete = async (slug: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm(`Delete command "${slug}"?`)) return
    await remove.mutateAsync(slug)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Commands</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Slash commands for Claude Code</p>
        </div>
        <button
          onClick={() => navigate('/commands/new')}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/30"
        >
          <Plus size={15} />
          New Command
        </button>
      </div>

      {commands.isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-2xl" />
          ))}
        </div>
      )}

      {!commands.isLoading && commands.data?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
            <Terminal size={24} className="text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">No commands yet</p>
          <p className="text-zinc-600 text-sm mt-1 mb-4">Create slash commands to use in Claude Code</p>
          <button
            onClick={() => navigate('/commands/new')}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-colors"
          >
            <Plus size={13} /> Create command
          </button>
        </div>
      )}

      {commands.data && commands.data.length > 0 && (
        <div className="space-y-2">
          {commands.data.map(cmd => (
            <Link
              key={cmd.slug}
              to={`/commands/${cmd.slug}`}
              className="group flex items-center gap-4 bg-zinc-900 border border-zinc-800/80 rounded-2xl px-5 py-3.5 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0">
                <Terminal size={15} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-100">/{cmd.frontmatter.name}</div>
                <div className="text-xs text-zinc-500 truncate mt-0.5">{cmd.frontmatter.description}</div>
              </div>
              {cmd.directory && (
                <div className="flex items-center gap-1 text-xs text-zinc-600">
                  <FolderOpen size={12} />
                  {cmd.directory.split('/').pop()}
                </div>
              )}
              <button
                onClick={(e) => handleDelete(cmd.slug, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-all"
              >
                <Trash2 size={13} />
              </button>
              <ChevronRight size={13} className="text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
