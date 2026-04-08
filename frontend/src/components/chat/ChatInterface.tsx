import { useState, useEffect, useRef } from 'react'
import { Send, Square, ChevronDown, ChevronRight, Wrench, Plus } from 'lucide-react'
import { useChatContext } from '../../context/ChatContext'
import clsx from 'clsx'

interface DisplayMessage {
  id: string
  role?: 'user' | 'assistant'
  kind: string
  content: string
  toolName?: string
  toolInput?: unknown
}

export function ChatInterface() {
  const { messages, streamingText, isConnected, isStreaming, send, abort, clearSession } = useChatContext()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    send(input.trim())
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
        <span className={clsx('text-xs px-2 py-0.5 rounded-full', isConnected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500')}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        <div className="flex items-center gap-3">
          {isStreaming && (
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              Generating…
            </span>
          )}
          <button onClick={clearSession} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors" title="New chat">
            <Plus size={13} />New chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-500 text-sm">Start a conversation with Claude</p>
          </div>
        )}
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        {streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3">
              <p className="text-sm text-zinc-100 whitespace-pre-wrap">{streamingText}<span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-text-bottom" /></p>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-zinc-800">
        <div className="flex gap-2 items-end">
          <textarea ref={textareaRef} value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px' }}
            onKeyDown={handleKeyDown} disabled={!isConnected}
            placeholder={isConnected ? 'Message Claude… (Enter to send, Shift+Enter for newline)' : 'Connecting…'}
            rows={1} className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none overflow-hidden disabled:opacity-50" />
          {isStreaming ? (
            <button onClick={abort} className="shrink-0 p-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl transition-colors">
              <Square size={16} />
            </button>
          ) : (
            <button onClick={handleSend} disabled={!input.trim() || !isConnected}
              className="shrink-0 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors">
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: DisplayMessage }) {
  const [expanded, setExpanded] = useState(false)

  if (msg.kind === 'tool_use') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:bg-zinc-800 w-full transition-colors">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <Wrench size={13} className="text-zinc-500" />
            <span className="font-mono">{msg.toolName}</span>
          </button>
          {expanded && (
            <div className="px-3 pb-3">
              <pre className="text-xs text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap">{JSON.stringify(msg.toolInput, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (msg.kind === 'error') {
    return (
      <div className="bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3">
        <p className="text-sm text-red-400">{msg.content}</p>
      </div>
    )
  }

  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={clsx('max-w-[80%] rounded-2xl px-4 py-3', isUser ? 'bg-blue-600 text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-100')}>
        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>
  )
}
