import type { Command, CommandPayload } from '../types'
import { createResourceContext } from './createResourceContext'

const { Provider: CommandsProvider, useResource: useCommands } =
  createResourceContext<Command, CommandPayload>('/commands')

export { CommandsProvider, useCommands }
