import type { Workflow, WorkflowPayload } from '../types'
import { createResourceContext } from './createResourceContext'

const { Provider: WorkflowsProvider, useResource: useWorkflows } =
  createResourceContext<Workflow, WorkflowPayload>('/workflows')

export { WorkflowsProvider, useWorkflows }
