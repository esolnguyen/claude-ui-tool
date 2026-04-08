import type { Agent, AgentPayload } from '../types'
import { createResourceContext } from './createResourceContext'

const { Provider: AgentsProvider, useResource: useAgents } =
  createResourceContext<Agent, AgentPayload>('/agents')

export { AgentsProvider, useAgents }
