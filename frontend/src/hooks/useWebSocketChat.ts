import { useState, useRef, useCallback, useEffect } from 'react'
import type { NormalizedMessage, ChatWebSocketMessage } from '../types'

interface UseChatOptions {
  onMessage?: (msg: NormalizedMessage) => void
  onConnected?: () => void
  onDisconnected?: () => void
  autoConnect?: boolean
}

export function useWebSocketChat(options: UseChatOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/chat`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      optionsRef.current.onConnected?.()
    }

    ws.onclose = () => {
      setIsConnected(false)
      setIsStreaming(false)
      optionsRef.current.onDisconnected?.()
    }

    ws.onerror = () => {
      setIsConnected(false)
      setIsStreaming(false)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as NormalizedMessage
        if (msg.kind === 'complete' || msg.kind === 'error') {
          setIsStreaming(false)
        }
        optionsRef.current.onMessage?.(msg)
      } catch (e) {
        console.error('[WS] Failed to parse message', e)
      }
    }
  }, [])

  const sendMessage = useCallback((msg: ChatWebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      if (msg.type === 'start') setIsStreaming(true)
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  useEffect(() => {
    if (options.autoConnect) connect()
    return () => { wsRef.current?.close() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { isConnected, isStreaming, connect, sendMessage, disconnect }
}
