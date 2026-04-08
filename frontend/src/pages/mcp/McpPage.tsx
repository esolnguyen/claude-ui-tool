import { useState } from 'react'
import { Plus, Trash2, Server, X, Github, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../utils/api'
import clsx from 'clsx'

interface McpServer {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  type?: string
}

interface EnvRow { key: string; value: string }

const PRESETS: Record<string, Omit<McpServer, 'name'> & { defaultName: string; description: string }> = {
  github: {
    defaultName: 'github',
    description: 'Official GitHub MCP server',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: '' },
  },
}

const inputCls = 'w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors'

function EnvEditor({ rows, onChange }: { rows: EnvRow[]; onChange: (rows: EnvRow[]) => void }) {
  const [hidden, setHidden] = useState<Set<number>>(new Set())

  const toggle = (i: number) =>
    setHidden(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })

  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={row.key}
            onChange={e => { const r = [...rows]; r[i] = { ...r[i], key: e.target.value }; onChange(r) }}
            placeholder="KEY"
            className="w-40 px-2.5 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
          <div className="relative flex-1">
            <input
              type={hidden.has(i) ? 'password' : 'text'}
              value={row.value}
              onChange={e => { const r = [...rows]; r[i] = { ...r[i], value: e.target.value }; onChange(r) }}
              placeholder="value"
              className="w-full px-2.5 py-2 pr-8 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
            />
            <button type="button" onClick={() => toggle(i)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
              {hidden.has(i) ? <Eye size={12} /> : <EyeOff size={12} />}
            </button>
          </div>
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { key: '', value: '' }])}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        + Add variable
      </button>
    </div>
  )
}

function ArgsEditor({ args, onChange }: { args: string[]; onChange: (args: string[]) => void }) {
  return (
    <div className="space-y-2">
      {args.map((arg, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={arg}
            onChange={e => { const a = [...args]; a[i] = e.target.value; onChange(a) }}
            placeholder={`arg ${i}`}
            className="flex-1 px-2.5 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
          />
          <button type="button" onClick={() => onChange(args.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...args, ''])}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        + Add arg
      </button>
    </div>
  )
}

function AddServerModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState<string[]>([])
  const [envRows, setEnvRows] = useState<EnvRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showPresets, setShowPresets] = useState(true)

  const applyPreset = (key: string) => {
    const p = PRESETS[key]
    setName(p.defaultName)
    setCommand(p.command)
    setArgs(p.args ?? [])
    setEnvRows(Object.entries(p.env ?? {}).map(([k, v]) => ({ key: k, value: v })))
    setShowPresets(false)
  }

  const add = useMutation({
    mutationFn: (payload: McpServer) => api.post<McpServer>('/mcp', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp'] })
      onClose()
    },
    onError: (e: Error) => setError(e.message),
  })

  const handleSubmit = () => {
    if (!name.trim() || !command.trim()) { setError('Name and command are required'); return }
    const env = Object.fromEntries(envRows.filter(r => r.key).map(r => [r.key, r.value]))
    add.mutate({
      name: name.trim(),
      command: command.trim(),
      args: args.filter(Boolean).length ? args.filter(Boolean) : undefined,
      env: Object.keys(env).length ? env : undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Server size={15} className="text-zinc-300" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-100">Add MCP Server</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Presets */}
          <div>
            <button
              type="button"
              onClick={() => setShowPresets(p => !p)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors mb-2"
            >
              {showPresets ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Quick presets
            </button>
            {showPresets && (
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPreset('github')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 rounded-xl text-xs text-zinc-300 transition-colors"
                >
                  <Github size={12} />
                  GitHub MCP
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              placeholder="github" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Command</label>
            <input value={command} onChange={e => setCommand(e.target.value)}
              placeholder="npx" className={`${inputCls} font-mono`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Arguments</label>
            <ArgsEditor args={args} onChange={setArgs} />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Environment variables</label>
            <EnvEditor rows={envRows} onChange={setEnvRows} />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end px-6 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors rounded-xl hover:bg-zinc-800">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={add.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/30"
          >
            <Plus size={14} />
            {add.isPending ? 'Adding…' : 'Add Server'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ServerCard({ server, onDelete }: { server: McpServer; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showEnv, setShowEnv] = useState(false)
  const envEntries = Object.entries(server.env ?? {})
  const hasDetails = !!(server.args?.length || envEntries.length)

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
            <Server size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">{server.name}</p>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              {server.command}{server.args?.length ? ' ' + server.args.join(' ') : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {hasDetails && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800/60 px-5 py-3.5 space-y-3 bg-zinc-800/20">
          {server.args?.length ? (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1.5">Args</p>
              <div className="flex flex-wrap gap-1.5">
                {server.args.map((a, i) => (
                  <span key={i} className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-lg">{a}</span>
                ))}
              </div>
            </div>
          ) : null}

          {envEntries.length ? (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-xs font-medium text-zinc-500">Env</p>
                <button onClick={() => setShowEnv(e => !e)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                  {showEnv ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
              </div>
              <div className="space-y-1">
                {envEntries.map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs font-mono">
                    <span className="text-zinc-400">{k}</span>
                    <span className="text-zinc-600">=</span>
                    <span className={clsx('text-zinc-300', !showEnv && 'blur-sm select-none')}>{v || '(empty)'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

export function McpPage() {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const { data: servers = [], isLoading } = useQuery({
    queryKey: ['mcp'],
    queryFn: () => api.get<McpServer[]>('/mcp'),
  })

  const remove = useMutation({
    mutationFn: (name: string) => api.delete(`/mcp/${name}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp'] }),
  })

  const handleDelete = (name: string) => {
    if (!confirm(`Remove MCP server "${name}"?`)) return
    remove.mutate(name)
  }

  return (
    <div className="p-6">
      {showAdd && <AddServerModal onClose={() => setShowAdd(false)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">MCP Servers</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Model Context Protocol servers</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/30"
        >
          <Plus size={15} />
          Add Server
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && servers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
            <Server size={24} className="text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">No MCP servers</p>
          <p className="text-zinc-600 text-sm mt-1 mb-4">Add servers to extend Claude with external tools</p>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-colors"
          >
            <Plus size={13} /> Add server
          </button>
        </div>
      )}

      {servers.length > 0 && (
        <div className="space-y-3 max-w-2xl">
          {servers.map(server => (
            <ServerCard key={server.name} server={server} onDelete={() => handleDelete(server.name)} />
          ))}
        </div>
      )}
    </div>
  )
}
