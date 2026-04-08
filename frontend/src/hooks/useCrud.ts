import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../utils/api'

export function useCrud<T, P = Partial<T>>(resourcePath: string) {
  const queryClient = useQueryClient()
  const queryKey = [resourcePath]

  const list = useQuery<T[]>({
    queryKey,
    queryFn: () => api.get<T[]>(resourcePath),
  })

  const create = useMutation({
    mutationFn: (payload: P) => api.post<T>(resourcePath, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const update = useMutation({
    mutationFn: ({ slug, payload }: { slug: string; payload: P }) =>
      api.put<T>(`${resourcePath}/${slug}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const remove = useMutation({
    mutationFn: (slug: string) => api.delete<{ success: boolean }>(`${resourcePath}/${slug}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { list, create, update, remove }
}
