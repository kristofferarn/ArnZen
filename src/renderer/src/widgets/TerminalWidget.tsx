import { useEffect, useRef, useCallback } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { useActiveProject, useWorkspaceStore } from '../stores/workspace-store'
import { getInstanceSuffix } from '../stores/widget-registry'
import type { ITheme } from '@xterm/xterm'

const defaultTheme: ITheme = {
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

const claudeCodeTheme: ITheme = {
  background: '#1c1914',
  foreground: '#e0d5c7',
  cursor: '#c9956b',
  cursorAccent: '#1c1914',
  selectionBackground: '#c9956b35',
  black: '#2a231c',
  red: '#c97070',
  green: '#7ab88a',
  yellow: '#d4a85c',
  blue: '#7ba5b8',
  magenta: '#b87a8e',
  cyan: '#6aabb8',
  white: '#e0d5c7',
  brightBlack: '#6b5d4f',
  brightRed: '#d68585',
  brightGreen: '#8eca9c',
  brightYellow: '#e0b96a',
  brightBlue: '#8eb8ca',
  brightMagenta: '#ca8ea0',
  brightCyan: '#7ebeca',
  brightWhite: '#f5ede3'
}

interface TerminalWidgetProps {
  instanceId?: string
}

export function TerminalWidget({ instanceId }: TerminalWidgetProps): React.JSX.Element {
  const project = useActiveProject()
  const updateTerminalLabel = useWorkspaceStore((s) => s.updateTerminalLabel)
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Detect instance-specific settings (color, locked label)
  const suffix = instanceId ? getInstanceSuffix(instanceId) : undefined
  const instanceState = suffix ? project?.widgetState.terminals[suffix] : undefined
  const instanceColor = instanceState?.color
  const isClaudeCode = !!instanceColor && instanceColor !== '#8a8f9a'
  const theme = isClaudeCode ? claudeCodeTheme : defaultTheme
  const labelLocked = !!instanceState?.labelLocked

  // Keep a ref to project so setupTerminal can read it without re-running
  // when unrelated project fields (e.g. terminal labels) change.
  const projectRef = useRef(project)
  projectRef.current = project

  const setupTerminal = useCallback(() => {
    const proj = projectRef.current
    if (!containerRef.current || !proj) return

    // Clean up previous instance
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: "'Cascadia Code', 'Consolas', 'Courier New', monospace",
      fontSize: 13,
      lineHeight: 1.3,
      theme
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    terminal.open(containerRef.current)

    // Try loading WebGL addon for GPU-accelerated rendering
    try {
      terminal.loadAddon(new WebglAddon())
    } catch {
      // WebGL not available, fall back to canvas renderer
    }

    fitAddon.fit()

    // Derive PTY session ID from instance suffix
    const instSuffix = instanceId ? getInstanceSuffix(instanceId) : undefined
    const ptySessionId = instSuffix ? `${proj.id}:${instSuffix}` : proj.id

    // Look up instance state for cwd and initial command
    const instanceState = instSuffix ? proj.widgetState.terminals[instSuffix] : undefined
    const cwd = instanceState?.cwd || proj.rootPath
    const initialCommand = instanceState?.initialCommand

    // Buffer live output until scrollback is replayed on reattach
    let pendingOutput: string[] = []
    let scrollbackLoaded = false

    // Wire input: user typing → PTY
    const inputDisposable = terminal.onData((data) => {
      window.api.terminalInput(ptySessionId, data)
    })

    // Wire output: PTY → terminal display (buffered until scrollback loads)
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
              .terminalSpawn(ptySessionId, cwd, terminal.cols, terminal.rows)
              .then((result) => {
                if (!result.alreadyRunning && initialCommand) {
                  window.api.terminalInput(ptySessionId, initialCommand + '\r')
                }
              })
          }
        })
      }
    })

    // Spawn PTY or reattach to existing session
    window.api
      .terminalSpawn(ptySessionId, cwd, terminal.cols, terminal.rows)
      .then(({ alreadyRunning, scrollback }) => {
        if (alreadyRunning && scrollback) {
          terminal.write(scrollback)
        }
        // Flush any output that arrived while waiting for scrollback
        for (const chunk of pendingOutput) {
          terminal.write(chunk)
        }
        pendingOutput = []
        scrollbackLoaded = true

        // Send initial command for new sessions
        if (!alreadyRunning && initialCommand) {
          window.api.terminalInput(ptySessionId, initialCommand + '\r')
        }
      })

    // Listen for terminal title changes (OSC escape sequences from shell/programs)
    // Skip updates when the label is locked (e.g. issue-assigned Claude Code)
    const titleDisposable = terminal.onTitleChange((title) => {
      if (instSuffix && title && !labelLocked) {
        updateTerminalLabel(instSuffix, title)
      }
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current && terminalRef.current) {
        fitAddonRef.current.fit()
        window.api.terminalResize(ptySessionId, terminalRef.current.cols, terminalRef.current.rows)
      }
    })
    resizeObserver.observe(containerRef.current)

    // Cleanup function — disposes xterm but does NOT kill the PTY
    cleanupRef.current = () => {
      resizeObserver.disconnect()
      inputDisposable.dispose()
      titleDisposable.dispose()
      removeOutputListener()
      removeExitListener()
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [instanceId, updateTerminalLabel, theme, labelLocked])

  // Track project ID so the terminal initializes once when the project
  // becomes available (or changes to a different project) without
  // re-running when unrelated project fields update.
  const projectId = project?.id

  useEffect(() => {
    if (!projectId) return
    setupTerminal()
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [projectId, setupTerminal])

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
        No project selected
      </div>
    )
  }

  return (
    <div className="h-full w-full p-2" style={{ background: theme.background }}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}
