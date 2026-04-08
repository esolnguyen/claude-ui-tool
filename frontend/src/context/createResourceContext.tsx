import { createContext, useContext, type ReactNode } from 'react'
import { useCrud } from '../hooks/useCrud'

type CrudValue<T, P> = ReturnType<typeof useCrud<T, P>>

export function createResourceContext<T, P>(apiPath: string) {
  const Context = createContext<CrudValue<T, P> | null>(null)

  function Provider({ children }: { children: ReactNode }) {
    const crud = useCrud<T, P>(apiPath)
    return <Context.Provider value={crud}>{children}</Context.Provider>
  }

  function useResource(): CrudValue<T, P> {
    const ctx = useContext(Context)
    if (!ctx) throw new Error(`Missing provider for "${apiPath}"`)
    return ctx
  }

  return { Provider, useResource }
}
