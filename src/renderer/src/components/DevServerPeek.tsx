import { useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { useActiveProject } from '../stores/workspace-store'
import { useDevServerStore } from '../stores/devserver-store'
import { attachClipboardHandler } from '../lib/terminal-clipboard'
import { DEV_SERVER_SUFFIX } from '../../../shared/types'

export function DevServerPeek(): React.JSX.Element | null {
  const project = useActiveProject()
  const { peekOpen, closePeek, setRunning } = useDevServerStore()

  const isOpen = project ? peekOpen.has(project.id) : false

  if (!isOpen || !project) return null

  return (
    <DevServerPeekPanel
      projectId={project.id}
      rootPath={project.rootPath}
      devCommand={project.settings?.devCommand || 'npm run dev'}
      onClose={() => closePeek(project.id)}
      onRunningChange={(running) => setRunning(project.id, running)}
    />
  )
}

interface PeekPanelProps {
  projectId: string
  rootPath: string
  devCommand: string
  onClose: () => void
  onRunningChange: (running: boolean) => void
}

function DevServerPeekPanel({ projectId, rootPath, devCommand, onClose, onRunningChange }: PeekPanelProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const devCommandRef = useRef(devCommand)
  devCommandRef.current = devCommand

  const onRunningChangeRef = useRef(onRunningChange)
  onRunningChangeRef.current = onRunningChange

  const setupTerminal = useCallback(() => {
    if (!containerRef.current) return

    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    const ptySessionId = `${projectId}:${DEV_SERVER_SUFFIX}`

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 1.3,
      theme: {
        background: '#1a1c24',
        foreground: '#dad5cd',
        cursor: '#c9956b',
        cursorAccent: '#1a1c24',
        selectionBackground: '#c9956b30',
        black: '#24272f',
        red: '#c97070',
        green: '#7ab88a',
        yellow: '#c9a856',
        blue: '#7ba5b8',
        magenta: '#b87a8e',
        cyan: '#6aabb8',
        white: '#dad5cd',
        brightBlack: '#615c54',
        brightRed: '#d68585',
        brightGreen: '#8eca9c',
        brightYellow: '#d6ba6a',
        brightBlue: '#8eb8ca',
        brightMagenta: '#ca8ea0',
        brightCyan: '#7ebeca',
        brightWhite: '#f0ebe3'
      }
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    terminal.open(containerRef.current)

    attachClipboardHandler(terminal)

    try {
      terminal.loadAddon(new WebglAddon())
    } catch {
      // WebGL not available, fall back to canvas renderer
    }

    fitAddon.fit()

    // Buffer live output until scrollback is replayed on reattach
    let pendingOutput: string[] = []
    let scrollbackLoaded = false

    // Wire input: user typing → PTY
    const inputDisposable = terminal.onData((data) => {
      window.api.terminalInput(ptySessionId, data)
    })

    // Wire output: PTY → terminal display
    const removeOutputListener = window.api.onTerminalOutput((id, data) => {
      if (id === ptySessionId) {
        if (scrollbackLoaded) {
          terminal.write(data)
        } else {
          pendingOutput.push(data)
        }
      }
    })

    // Handle PTY exit: show message and allow respawn
    const removeExitListener = window.api.onTerminalExit((id) => {
      if (id === ptySessionId) {
        terminal.writeln('\r\n\x1b[90m[Process exited. Press Enter to restart]\x1b[0m')
        const restartDisposable = terminal.onKey(({ key }) => {
          if (key === '\r') {
            restartDisposable.dispose()
            terminal.clear()
            window.api
              .terminalSpawn(ptySessionId, rootPath, terminal.cols, terminal.rows)
              .then((result) => {
                if (!result.alreadyRunning) {
                  window.api.terminalInput(ptySessionId, devCommandRef.current + '\r')
                }
                onRunningChangeRef.current(true)
              })
          }
        })
      }
    })

    // Reattach to existing PTY session (gets scrollback)
    window.api
      .terminalSpawn(ptySessionId, rootPath, terminal.cols, terminal.rows)
      .then(({ alreadyRunning, scrollback }) => {
        if (alreadyRunning && scrollback) {
          terminal.write(scrollback)
        }
        for (const chunk of pendingOutput) {
          terminal.write(chunk)
        }
        pendingOutput = []
        scrollbackLoaded = true
      })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit()
        window.api.terminalResize(ptySessionId, terminalRef.current.cols, terminalRef.current.rows)
      }
    })
    resizeObserver.observe(containerRef.current)

    // Cleanup — disposes xterm but does NOT kill the PTY
    cleanupRef.current = () => {
      resizeObserver.disconnect()
      inputDisposable.dispose()
      removeOutputListener()
      removeExitListener()
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [projectId, rootPath])

  useEffect(() => {
    setupTerminal()
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [setupTerminal])

  return (
    <div className="h-[200px] flex flex-col border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] shrink-0">
      <div className="flex items-center justify-between h-7 px-3 border-b border-[var(--color-border)] shrink-0">
        <span className="mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
          Dev Server
        </span>
        <button
          onClick={onClose}
          className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
          title="Close peek"
        >
          <X size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <div ref={containerRef} className="h-full w-full p-1 bg-[#1a1c24]" />
      </div>
    </div>
  )
}
