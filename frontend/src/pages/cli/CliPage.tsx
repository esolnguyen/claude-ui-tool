import { useState } from 'react'
import { Monitor, MessageSquare } from 'lucide-react'
import clsx from 'clsx'
import { TerminalComponent } from '../../components/cli/TerminalComponent'
import { ChatInterface } from '../../components/chat/ChatInterface'

type Tab = 'terminal' | 'chat'

export function CliPage() {
  const [tab, setTab] = useState<Tab>('terminal')

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0">
        {([
          { id: 'terminal', label: 'Terminal', icon: Monitor },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === id
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'terminal' ? <TerminalComponent /> : <ChatInterface />}
      </div>
    </div>
  )
}
