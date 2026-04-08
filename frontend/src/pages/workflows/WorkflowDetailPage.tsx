import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, Trash2, ArrowLeft, Plus, X, GripVertical } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useWorkflows } from '../../context/WorkflowsContext'
import { useAgents } from '../../context/AgentsContext'
import { api } from '../../utils/api'
import type { Workflow, WorkflowStep } from '../../types'

let stepCounter = 0

const inputCls = 'w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors'
const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5'

export function WorkflowDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const isNew = slug === 'new'

  const { data: workflow, isLoading } = useQuery<Workflow>({
    queryKey: ['workflows', slug],
    queryFn: () => api.get<Workflow>(`/workflows/${slug}`),
    enabled: !!slug && !isNew,
  })
  const { create, update, remove } = useWorkflows()
  const { list: agents } = useAgents()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (workflow) { setName(workflow.name); setDescription(workflow.description); setSteps(workflow.steps) }
  }, [workflow])

  const addStep = () => {
    stepCounter++
    setSteps(s => [...s, { id: `step-${stepCounter}`, agentSlug: '', label: `Step ${s.length + 1}` }])
  }

  const updateStep = (id: string, field: keyof WorkflowStep, value: string) =>
    setSteps(s => s.map(step => step.id === id ? { ...step, [field]: value } : step))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { name, description, steps }
      if (isNew) {
        const created = await create.mutateAsync(payload)
        navigate(`/workflows/${created.slug}`, { replace: true })
      } else {
        await update.mutateAsync({ slug: slug!, payload })
      }
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete workflow "${slug}"?`)) return
    await remove.mutateAsync(slug!)
    navigate('/workflows')
  }

  if (!isNew && isLoading) {
    return (
      <div className="p-6 max-w-3xl">
        <div className="skeleton h-8 w-40 rounded-xl mb-6" />
        <div className="space-y-4">
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-40 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/workflows')}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-xl font-bold text-zinc-100">{isNew ? 'New Workflow' : name || slug}</h1>
      </div>

      <div className="space-y-5">
        <div>
          <label className={labelCls}>Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className={inputCls} placeholder="My Workflow" />
        </div>

        <div>
          <label className={labelCls}>Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            className={inputCls} placeholder="What this workflow does…" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-zinc-400">Steps</label>
            <button
              onClick={addStep}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Plus size={12} /> Add Step
            </button>
          </div>

          {steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 bg-zinc-800/50 border border-zinc-700/60 rounded-xl text-center">
              <p className="text-xs text-zinc-500">No steps yet</p>
              <button onClick={addStep} className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                Add your first step
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-2 bg-zinc-800/60 border border-zinc-700/60 rounded-xl px-3 py-2.5">
                  <GripVertical size={14} className="text-zinc-700 shrink-0 cursor-grab" />
                  <span className="text-xs text-zinc-600 w-5 shrink-0">{idx + 1}</span>
                  <input
                    type="text"
                    value={step.label}
                    onChange={e => updateStep(step.id, 'label', e.target.value)}
                    placeholder="Step label"
                    className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
                  />
                  <select
                    value={step.agentSlug}
                    onChange={e => updateStep(step.id, 'agentSlug', e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select agent…</option>
                    {agents.data?.map(a => <option key={a.slug} value={a.slug}>{a.frontmatter.name}</option>)}
                  </select>
                  <button
                    onClick={() => setSteps(s => s.filter(s => s.id !== step.id))}
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/60">
          <button onClick={handleSave} disabled={saving || !name}
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
