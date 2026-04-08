import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Zap, Trash2, Github, Package, X, Download, ChevronRight } from 'lucide-react'
import { useSkills } from '../../context/SkillsContext'
import { api } from '../../utils/api'
import { useQueryClient } from '@tanstack/react-query'

function ImportGithubModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const handleImport = async () => {
    if (!url.trim()) return
    setLoading(true)
    setError(null)
    try {
      await api.post('/github/import', { url: url.trim() })
      await queryClient.invalidateQueries({ queryKey: ['/skills'] })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
              <Github size={15} className="text-zinc-300" />
            </div>
            <h2 className="text-sm font-semibold text-zinc-100">Import from GitHub</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors">
            <X size={15} />
          </button>
        </div>

        <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
          Paste a GitHub repo URL. It will be cloned to <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">~/.claude/github/</code> and its skills will appear in the list.
        </p>

        <input
          autoFocus
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleImport()}
          placeholder="https://github.com/owner/repo"
          className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 mb-3 transition-colors"
        />

        {error && (
          <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg mb-3">
            {error}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors rounded-xl hover:bg-zinc-800">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!url.trim() || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/30"
          >
            <Download size={14} />
            {loading ? 'Cloning…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

const sourceTag = (source?: string) => {
  if (source === 'github') return <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded-md"><Github size={10} />GitHub</span>
  if (source === 'plugin') return <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded-md"><Package size={10} />Plugin</span>
  return null
}

export function SkillsPage() {
  const navigate = useNavigate()
  const { list: skills, remove: deleteSkill } = useSkills()
  const [showImport, setShowImport] = useState(false)

  const handleDelete = async (slug: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (!confirm(`Delete skill "${slug}"?`)) return
    await deleteSkill.mutateAsync(slug)
  }

  return (
    <div className="p-6">
      {showImport && <ImportGithubModal onClose={() => setShowImport(false)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Skills</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Reusable skills for your agents</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 rounded-xl text-sm font-medium transition-colors"
          >
            <Github size={14} />
            Import from GitHub
          </button>
          <button
            onClick={() => navigate('/skills/new')}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/30"
          >
            <Plus size={15} />
            New Skill
          </button>
        </div>
      </div>

      {skills.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      )}

      {!skills.isLoading && skills.data?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
            <Zap size={24} className="text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">No skills yet</p>
          <p className="text-zinc-600 text-sm mt-1 mb-4">Create a skill or import one from GitHub</p>
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-colors">
              <Github size={13} /> Import
            </button>
            <button onClick={() => navigate('/skills/new')} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-colors">
              <Plus size={13} /> Create
            </button>
          </div>
        </div>
      )}

      {skills.data && skills.data.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {skills.data.map(skill => (
            <Link
              key={skill.slug}
              to={`/skills/${skill.slug}`}
              className="group relative bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200"
            >
              <button
                onClick={(e) => handleDelete(skill.slug, e)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-all"
              >
                <Trash2 size={13} />
              </button>

              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center shrink-0">
                  <Zap size={15} className="text-amber-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-zinc-100 truncate">{skill.frontmatter.name}</div>
                  <div className="mt-0.5">{sourceTag(skill.source)}</div>
                </div>
              </div>

              <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-3">{skill.frontmatter.description}</p>

              <div className="flex items-center justify-between pt-2.5 border-t border-zinc-800/60">
                {skill.frontmatter.context
                  ? <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded-md">{skill.frontmatter.context}</span>
                  : <span />
                }
                <ChevronRight size={13} className="text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
