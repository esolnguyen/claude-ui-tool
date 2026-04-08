// Re-exported from context — use context/CommandsContext directly
export { useCommands } from '../context/CommandsContext'

import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import type { Command } from '../types'

export function useCommand(slug: string) {
  return useQuery<Command>({
    queryKey: ['commands', slug],
    queryFn: () => api.get<Command>(`/commands/${slug}`),
    enabled: !!slug && slug !== 'new',
  })
}
