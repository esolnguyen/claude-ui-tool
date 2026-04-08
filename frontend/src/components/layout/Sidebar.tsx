import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Bot, Terminal, Zap, GitBranch,
  Network, Monitor, Server, Settings, Sun, Moon,
} from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '../../context/ThemeContext'

const navGroups = [
  {
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Resources',
    items: [
      { to: '/agents',    label: 'Agents',    icon: Bot },
      { to: '/commands',  label: 'Commands',  icon: Terminal },
      { to: '/skills',    label: 'Skills',    icon: Zap },
      { to: '/workflows', label: 'Workflows', icon: GitBranch },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/cli',   label: 'CLI',        icon: Monitor },
      { to: '/mcp',   label: 'MCP Servers', icon: Server },
      { to: '/graph', label: 'Graph',       icon: Network },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function Sidebar() {
  const { theme, toggle } = useTheme()

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-zinc-900 border-r border-zinc-800/80 h-screen">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-900/30">
            C
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100 leading-none">Claude</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Agents UI</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    clsx(
                      'group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-blue-600/15 text-blue-400'
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-500 rounded-full" />
                      )}
                      <Icon size={15} className={clsx('shrink-0 transition-colors', isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300')} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-zinc-800/80 flex items-center justify-between">
        <span className="text-[11px] text-zinc-600">v1.0.0</span>
        <button
          onClick={toggle}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>
    </aside>
  )
}
