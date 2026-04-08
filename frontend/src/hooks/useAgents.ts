// Re-exported from context — use context/AgentsContext directly
export { useAgents } from '../context/AgentsContext'

import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import type { Agent } from '../types'

export function useAgent(slug: string) {
  return useQuery<Agent>({
    queryKey: ['agents', slug],
    queryFn: () => api.get<Agent>(`/agents/${slug}`),
    enabled: !!slug && slug !== 'new',
  })
}
