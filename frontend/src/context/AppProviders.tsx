import type { ReactNode } from 'react'
import { ThemeProvider } from './ThemeContext'
import { AgentsProvider } from './AgentsContext'
import { CommandsProvider } from './CommandsContext'
import { SkillsProvider } from './SkillsContext'
import { WorkflowsProvider } from './WorkflowsContext'
import { ChatProvider } from './ChatContext'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AgentsProvider>
        <CommandsProvider>
          <SkillsProvider>
            <WorkflowsProvider>
              <ChatProvider>
                {children}
              </ChatProvider>
            </WorkflowsProvider>
          </SkillsProvider>
        </CommandsProvider>
      </AgentsProvider>
    </ThemeProvider>
  )
}
