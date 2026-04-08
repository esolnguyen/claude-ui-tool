import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { AgentsPage } from './pages/agents/AgentsPage'
import { AgentDetailPage } from './pages/agents/AgentDetailPage'
import { CommandsPage } from './pages/commands/CommandsPage'
import { CommandDetailPage } from './pages/commands/CommandDetailPage'
import { SkillsPage } from './pages/skills/SkillsPage'
import { SkillDetailPage } from './pages/skills/SkillDetailPage'
import { WorkflowsPage } from './pages/workflows/WorkflowsPage'
import { WorkflowDetailPage } from './pages/workflows/WorkflowDetailPage'
import { CliPage } from './pages/cli/CliPage'
import { McpPage } from './pages/mcp/McpPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { GraphPage } from './pages/graph/GraphPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:slug" element={<AgentDetailPage />} />
        <Route path="/commands" element={<CommandsPage />} />
        <Route path="/commands/:slug" element={<CommandDetailPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/skills/:slug" element={<SkillDetailPage />} />
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/workflows/:slug" element={<WorkflowDetailPage />} />
        <Route path="/cli" element={<CliPage />} />
        <Route path="/mcp" element={<McpPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/graph" element={<GraphPage />} />
      </Route>
    </Routes>
  )
}
