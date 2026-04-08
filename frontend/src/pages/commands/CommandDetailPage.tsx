import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Trash2, ArrowLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useCommands } from '../../context/CommandsContext'
import { useAgents } from '../../context/AgentsContext'
import { api } from '../../utils/api'
import type { Command, CommandFrontmatter } from '../../types'

const ALLOWED_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash', 'WebFetch', 'TodoWrite']

const inputCls = 'w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors'
const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5'

export function CommandDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const isNew = slug === 'new'

  const { data: command, isLoading } = useQuery<Command>({
    queryKey: ['commands', slug],
    queryFn: () => api.get<Command>(`/commands/${slug}`),
    enabled: !!slug && !isNew,
  })
  const { create, update, remove } = useCommands()
  const { list: agents } = useAgents()

  const [fm, setFm] = useState<Partial<CommandFrontmatter>>({ name: '', description: '' })
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (command) { setFm(command.frontmatter); setBody(command.body) }
  }, [command])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { frontmatter: fm as CommandFrontmatter, body }
      if (isNew) {
        const created = await create.mutateAsync(payload)
        navigate(`/commands/${created.slug}`, { replace: true })
      } else {
        await update.mutateAsync({ slug: slug!, payload })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete command "${slug}"?`)) return
    await remove.mutateAsync(slug!)
    navigate('/commands')
  }

  const toggleTool = (tool: string) => {
    const current = fm['allowed-tools'] || []
    setFm(f => ({ ...f, 'allowed-tools': current.includes(tool) ? current.filter(t => t !== tool) : [...current, tool] }))
  }

  if (!isNew && isLoading) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="skeleton h-8 w-40 rounded-xl mb-6" />
        <div className="space-y-4">
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/commands')}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-bold text-zinc-100">
          {isNew ? 'New Command' : `/${fm.name || slug}`}
        </h1>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <input type="text" value={fm.name || ''} onChange={e => setFm(f => ({ ...f, name: e.target.value }))}
              className={inputCls} placeholder="my-command" />
          </div>
          <div>
            <label className={labelCls}>Argument Hint</label>
            <input type="text" value={fm['argument-hint'] || ''} onChange={e => setFm(f => ({ ...f, 'argument-hint': e.target.value }))}
              className={inputCls} placeholder="[optional args]" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <input type="text" value={fm.description || ''} onChange={e => setFm(f => ({ ...f, description: e.target.value }))}
            className={inputCls} placeholder="What this command does…" />
        </div>

        <div>
          <label className={labelCls}>Agent</label>
          <select value={(fm as any).agent || ''} onChange={e => setFm(f => ({ ...f, agent: e.target.value || undefined }))}
            className={inputCls}>
            <option value="">None</option>
            {agents.data?.map(a => <option key={a.slug} value={a.slug}>{a.frontmatter.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Allowed Tools</label>
          <div className="flex flex-wrap gap-2">
            {ALLOWED_TOOLS.map(tool => {
              const active = (fm['allowed-tools'] || []).includes(tool)
              return (
                <button key={tool} onClick={() => toggleTool(tool)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${active
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-300'
                  }`}>
                  {tool}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className={labelCls}>Prompt</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={14}
            className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 font-mono resize-y transition-colors"
            placeholder="Command prompt…" />
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/60">
          <button onClick={handleSave} disabled={saving || !fm.name}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/30">
            <Save size={14} />
            {saving ? 'Saving…' : 'Save'}
          </button>
          {!isNew && (
            <button onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-zinc-400 border border-zinc-700 rounded-xl text-sm font-medium transition-colors">
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
