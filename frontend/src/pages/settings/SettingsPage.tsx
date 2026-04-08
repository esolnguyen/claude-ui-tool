import { useState, useEffect } from 'react'
import { Save, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../utils/api'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Record<string, unknown>>('/settings'),
  })

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.put('/settings', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  })

  const [raw, setRaw] = useState('')
  const [parseError, setParseError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) setRaw(JSON.stringify(settings, null, 2))
  }, [settings])

  const handleSave = async () => {
    setParseError('')
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>
      await save.mutateAsync(parsed)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Invalid JSON')
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Settings</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Edit <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300 text-xs">~/.claude/settings.json</code>
        </p>
      </div>

      {isLoading ? (
        <div className="skeleton h-96 rounded-2xl" />
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={raw}
              onChange={e => { setRaw(e.target.value); setParseError('') }}
              rows={24}
              className="w-full px-4 py-3.5 bg-zinc-900 border border-zinc-800/80 rounded-2xl text-sm text-zinc-100 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 resize-y transition-colors"
              spellCheck={false}
            />
          </div>

          {parseError && (
            <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">
              {parseError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={save.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-900/30"
            >
              <Save size={14} />
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle2 size={13} />
                Saved
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
