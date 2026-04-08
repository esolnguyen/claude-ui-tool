// Re-exported from context — use context/WorkflowsContext directly
export { useWorkflows } from '../context/WorkflowsContext'

import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import type { Workflow } from '../types'

export function useWorkflow(slug: string) {
  return useQuery<Workflow>({
    queryKey: ['workflows', slug],
    queryFn: () => api.get<Workflow>(`/workflows/${slug}`),
    enabled: !!slug && slug !== 'new',
  })
}
