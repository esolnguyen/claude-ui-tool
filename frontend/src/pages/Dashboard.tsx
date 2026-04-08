import { Link } from 'react-router-dom'
import { Bot, Terminal, Zap, GitBranch, ArrowRight, Plus } from 'lucide-react'
import { useAgents } from '../context/AgentsContext'
import { useCommands } from '../context/CommandsContext'
import { useSkills } from '../context/SkillsContext'
import { useWorkflows } from '../context/WorkflowsContext'

const stats = [
  { label: 'Agents',    to: '/agents',    icon: Bot,       color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   glow: 'shadow-blue-900/20'   },
  { label: 'Commands',  to: '/commands',  icon: Terminal,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: 'shadow-emerald-900/20' },
  { label: 'Skills',    to: '/skills',    icon: Zap,       color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  glow: 'shadow-amber-900/20'  },
  { label: 'Workflows', to: '/workflows', icon: GitBranch, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', glow: 'shadow-purple-900/20' },
]

const quickActions = [
  { to: '/agents/new',    label: 'New Agent',    desc: 'Create an AI agent',     icon: Bot,       color: 'text-blue-400' },
  { to: '/commands/new',  label: 'New Command',  desc: 'Add a slash command',    icon: Terminal,  color: 'text-emerald-400' },
  { to: '/skills/new',    label: 'New Skill',    desc: 'Define a reusable skill', icon: Zap,       color: 'text-amber-400' },
  { to: '/workflows/new', label: 'New Workflow', desc: 'Build a multi-step flow', icon: GitBranch, color: 'text-purple-400' },
]

export function Dashboard() {
  const { list: agents }    = useAgents()
  const { list: commands }  = useCommands()
  const { list: skills }    = useSkills()
  const { list: workflows } = useWorkflows()

  const counts = [agents.data?.length, commands.data?.length, skills.data?.length, workflows.data?.length]
  const loading = [agents.isLoading, commands.isLoading, skills.isLoading, workflows.isLoading]

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Manage your Claude Code configuration</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        {stats.map(({ label, to, icon: Icon, color, bg, border, glow }, i) => (
          <Link
            key={to}
            to={to}
            className={`group relative bg-zinc-900 border ${border} rounded-2xl p-4 hover:shadow-lg ${glow} transition-all duration-200 hover:-translate-y-0.5`}
          >
            <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <div className="text-2xl font-bold text-zinc-100 tabular-nums">
              {loading[i] ? <span className="text-zinc-700">—</span> : counts[i] ?? 0}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5 flex items-center justify-between">
              {label}
              <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Agents */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-300">Recent Agents</h2>
            <Link to="/agents" className="text-xs text-zinc-500 hover:text-blue-400 transition-colors flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div className="p-3">
            {agents.isLoading ? (
              <div className="space-y-1.5 p-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton h-9 rounded-lg" />
                ))}
              </div>
            ) : agents.data?.length === 0 ? (
              <div className="py-8 text-center">
                <Bot size={28} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">No agents yet</p>
                <Link to="/agents/new" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  <Plus size={11} /> Create one
                </Link>
              </div>
            ) : (
              <div className="space-y-0.5">
                {agents.data?.slice(0, 5).map(agent => (
                  <Link
                    key={agent.slug}
                    to={`/agents/${agent.slug}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-zinc-800/60 transition-colors group"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: agent.frontmatter.color || '#3b82f6' }}
                    >
                      {agent.frontmatter.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors flex-1 truncate">{agent.frontmatter.name}</span>
                    <span className="text-xs text-zinc-600">{agent.frontmatter.model || 'default'}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-300">Quick Actions</h2>
          </div>
          <div className="p-3 space-y-0.5">
            {quickActions.map(({ to, label, desc, icon: Icon, color }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800/60 transition-colors"
              >
                <div className="w-7 h-7 bg-zinc-800 group-hover:bg-zinc-700 rounded-lg flex items-center justify-center transition-colors shrink-0">
                  <Icon size={13} className={color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">{label}</div>
                  <div className="text-xs text-zinc-600">{desc}</div>
                </div>
                <ArrowRight size={13} className="text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
