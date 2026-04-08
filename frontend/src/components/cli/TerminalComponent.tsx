import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

export function TerminalComponent() {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    const term = new Terminal({
      theme: {
        background: '#09090b',
        foreground: '#f4f4f5',
        cursor: '#a1a1aa',
      },
      fontSize: 14,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      cursorBlink: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    fitAddonRef.current = fitAddon

    if (containerRef.current) {
      term.open(containerRef.current)
      fitAddon.fit()
    }
    termRef.current = term

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/cli`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'execute',
        cols: term.cols,
        rows: term.rows,
      }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string)
        if (msg.type === 'session') {
          sessionIdRef.current = msg.sessionId as string
        } else if (msg.type === 'output') {
          term.write(msg.data as string)
        } else if (msg.type === 'exit') {
          term.write('\r\n\x1b[90m[Session ended]\x1b[0m\r\n')
        } else if (msg.type === 'error') {
          term.write(`\r\n\x1b[31mError: ${msg.error}\x1b[0m\r\n`)
        }
      } catch (e) {
        console.error('[Terminal] Failed to parse message', e)
      }
    }

    ws.onclose = () => {
      term.write('\r\n\x1b[90m[Disconnected]\x1b[0m\r\n')
    }

    term.onData((data) => {
      if (sessionIdRef.current && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', sessionId: sessionIdRef.current, data }))
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        fitAddon.fit()
        if (sessionIdRef.current && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'resize',
            sessionId: sessionIdRef.current,
            cols: term.cols,
            rows: term.rows,
          }))
        }
      })
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      if (sessionIdRef.current && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'kill', sessionId: sessionIdRef.current }))
      }
      ws.close()
      term.dispose()
    }
  }, [])

  return (
    <div className="h-full w-full bg-zinc-950 p-2">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
