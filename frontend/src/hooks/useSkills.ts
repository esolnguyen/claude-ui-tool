// Re-exported from context — use context/SkillsContext directly
export { useSkills } from '../context/SkillsContext'

import { useQuery } from '@tanstack/react-query'
import { api } from '../utils/api'
import type { Skill } from '../types'

export function useSkill(slug: string) {
  return useQuery<Skill>({
    queryKey: ['skills', slug],
    queryFn: () => api.get<Skill>(`/skills/${slug}`),
    enabled: !!slug && slug !== 'new',
  })
}
