import type { Skill, SkillPayload } from '../types'
import { createResourceContext } from './createResourceContext'

const { Provider: SkillsProvider, useResource: useSkills } =
  createResourceContext<Skill, SkillPayload>('/skills')

export { SkillsProvider, useSkills }
