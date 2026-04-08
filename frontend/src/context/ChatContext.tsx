import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { useWebSocketChat } from '../hooks/useWebSocketChat'
import type { NormalizedMessage } from '../types'

interface DisplayMessage {
  id: string
  role?: 'user' | 'assistant'
  kind: string
  content: string
  toolName?: string
  toolInput?: unknown
}

interface ChatContextValue {
  messages: DisplayMessage[]
  sessionId: string | undefined
  streamingText: string
  isConnected: boolean
  isStreaming: boolean
  send: (text: string) => void
  abort: () => void
  clearSession: () => void
}

const STORAGE_KEY = 'chat_session'

function loadSession(): { messages: DisplayMessage[]; sessionId: string | undefined } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { messages: [], sessionId: undefined }
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const saved = loadSession()
  const [messages, setMessages] = useState<DisplayMessage[]>(saved.messages)
  const [sessionId, setSessionId] = useState<string | undefined>(saved.sessionId)
  const [streamingText, setStreamingText] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, sessionId }))
  }, [messages, sessionId])

  const handleMessage = useCallback((msg: NormalizedMessage) => {
    if (msg.kind === 'session_created') {
      setSessionId(msg.sessionId || (msg as unknown as { newSessionId?: string }).newSessionId || msg.content)
      return
    }
    if (msg.kind === 'stream_delta') {
      setStreamingText(prev => prev + (msg.content || ''))
      return
    }
    if (msg.kind === 'stream_end' || msg.kind === 'complete') {
      setStreamingText(prev => {
        if (prev) {
          setMessages(m => [...m, { id: msg.id, role: 'assistant', kind: 'text', content: prev }])
        }
        return ''
      })
      return
    }
    if (msg.kind === 'text' && msg.role === 'assistant') {
      setMessages(m => [...m, { id: msg.id, role: 'assistant', kind: 'text', content: msg.content || '' }])
      return
    }
    if (msg.kind === 'tool_use') {
      setMessages(m => [...m, { id: msg.id, kind: 'tool_use', content: '', toolName: msg.toolName, toolInput: msg.toolInput }])
      return
    }
    if (msg.kind === 'error') {
      setMessages(m => [...m, { id: msg.id, kind: 'error', content: msg.content || 'An error occurred' }])
    }
  }, [])

  const { isConnected, isStreaming, connect, sendMessage } = useWebSocketChat({ onMessage: handleMessage })

  useEffect(() => { connect() }, [connect])

  const send = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return
    setMessages(m => [...m, { id: Date.now().toString(), role: 'user', kind: 'text', content: text.trim() }])
    sendMessage({ type: 'start', message: text.trim(), sessionId })
  }, [isStreaming, sendMessage, sessionId])

  const abort = useCallback(() => {
    if (sessionId) sendMessage({ type: 'abort', sessionId })
  }, [sendMessage, sessionId])

  const clearSession = useCallback(() => {
    setMessages([])
    setSessionId(undefined)
    setStreamingText('')
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <ChatContext.Provider value={{ messages, sessionId, streamingText, isConnected, isStreaming, send, abort, clearSession }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('Missing ChatProvider')
  return ctx
}
