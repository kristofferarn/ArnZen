import { useState, useRef, useEffect } from 'react'
import { FolderOpen, Plus, X, Play, Square, ChevronDown, Pencil, LayoutGrid, Code2 } from 'lucide-react'
import { useWorkspaceStore, useActiveProject } from '../stores/workspace-store'
import { widgetRegistry, terminalPresets, getBaseType } from '../stores/widget-registry'
import { useDevServerStore } from '../stores/devserver-store'
import { GitBranchMenu } from './GitBranchMenu'
import { DEV_SERVER_SUFFIX, DEV_SERVER_PANEL_ID, getMosaicLeaves } from '../../../shared/types'

export function Toolbar(): React.JSX.Element {
  const { projects, addProject, setActiveProject, removeProject, addPanel, removePanel, updateDevCommand, setViewMode } = useWorkspaceStore()
  const project = useActiveProject()
  const { running, peekOpen, setRunning, togglePeek, closePeek } = useDevServerStore()

  const [showProjectMenu, setShowProjectMenu] = useState(false)
  const [showDevPopover, setShowDevPopover] = useState(false)
  const [editingCommand, setEditingCommand] = useState(false)
  const [commandDraft, setCommandDraft] = useState('')

  const projectMenuRef = useRef<HTMLDivElement>(null)
  const devPopoverRef = useRef<HTMLDivElement>(null)

  const isDevServerRunning = project ? running.has(project.id) : false
  const isPeekOpen = project ? peekOpen.has(project.id) : false
  const devCommand = project?.settings?.devCommand || 'npm run dev'

  // Listen for dev server PTY exit events (global, handles all projects)
  useEffect(() => {
    return window.api.onTerminalExit((id) => {
      if (id.endsWith(`:${DEV_SERVER_SUFFIX}`)) {
        const projectId = id.slice(0, -(DEV_SERVER_SUFFIX.length + 1))
        setRunning(projectId, false)
      }
    })
  }, [setRunning])

  const handleToggleDevServer = async (): Promise<void> => {
    if (!project) return
    const sessionId = `${project.id}:${DEV_SERVER_SUFFIX}`

    if (isDevServerRunning) {
      // Stop
      window.api.terminalKill(sessionId)
      setRunning(project.id, false)
      closePeek(project.id)
    } else {
      // Clean up legacy panel if it exists from the old implementation
      const leaves = getMosaicLeaves(project.layout.mosaic)
      if (
        leaves.includes(DEV_SERVER_PANEL_ID) ||
        project.layout.minimized.includes(DEV_SERVER_PANEL_ID)
      ) {
        removePanel(DEV_SERVER_PANEL_ID)
      }
      // Spawn PTY in background
      const { alreadyRunning } = await window.api.terminalSpawn(
        sessionId, project.rootPath, 120, 30
      )
      if (!alreadyRunning) {
        window.api.terminalInput(sessionId, project.settings.devCommand + '\r')
      }
      setRunning(project.id, true)
    }
  }

  // Close menus on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setShowProjectMenu(false)
      }
      if (devPopoverRef.current && !devPopoverRef.current.contains(e.target as Node)) {
        setShowDevPopover(false)
        setEditingCommand(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleAddProject = async (): Promise<void> => {
    const folderPath = await window.api.selectFolder()
    if (!folderPath) return
    const name = folderPath.split(/[\\/]/).pop() || 'Untitled'
    addProject(name, folderPath)
    setShowProjectMenu(false)
  }

  const existingLeaves = project ? getMosaicLeaves(project.layout.mosaic) : []

  return (
    <div className="relative z-10 flex items-center h-10 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-3 app-no-drag">
      {/* Left: project & context */}
      <div className="flex items-center gap-2">
      {/* Project selector */}
      <div className="relative" ref={projectMenuRef}>
        <button
          onClick={() => setShowProjectMenu(!showProjectMenu)}
          className="flex items-center gap-2 px-2.5 h-7 rounded-md text-sm hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
        >
          <FolderOpen size={15} style={project ? { color: project.color } : undefined} className={project ? '' : 'text-[var(--color-text-muted)]'} />
          {project ? (
            <span className="text-[var(--color-text-primary)] truncate max-w-[140px]">
              {project.name}
            </span>
          ) : (
            <span className="text-[var(--color-text-muted)]">No project</span>
          )}
        </button>

        {showProjectMenu && (
          <div className="absolute top-full left-0 mt-1 w-56 py-1 rounded-md bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] shadow-lg z-50">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProject(p.id)
                  setShowProjectMenu(false)
                }}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm hover:bg-[var(--color-bg-hover)] transition-colors duration-150 group"
              >
                <FolderOpen size={14} className="shrink-0" style={{ color: p.color }} />
                <span
                  className={`flex-1 text-left truncate ${
                    p.id === project?.id
                      ? 'text-[var(--color-text-primary)]'
                      : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  {p.name}
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    removeProject(p.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--color-danger-subtle)] hover:text-[var(--color-danger)] text-[var(--color-text-muted)] transition-all duration-150"
                >
                  <X size={12} />
                </span>
              </button>
            ))}

            <div className="border-t border-[var(--color-border)] mt-1 pt-1">
              <button
                onClick={handleAddProject}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
              >
                <Plus size={14} />
                <span>Add project</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-[var(--color-border)]" />

      {/* Git branch */}
      <GitBranchMenu />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: workspace actions */}
      <div className="flex items-center gap-2">
      {/* Mode toggle */}
      <div className="flex items-center h-7 rounded-md overflow-hidden border border-[var(--color-border)]">
        <button
          onClick={() => setViewMode('widgets')}
          disabled={!project}
          className={`flex items-center gap-1 px-2 h-full text-xs transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
            !project || project.widgetState.viewMode === 'widgets'
              ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
          }`}
          title="Widget panels"
        >
          <LayoutGrid size={13} />
        </button>
        <button
          onClick={() => setViewMode('editor')}
          disabled={!project}
          className={`flex items-center gap-1 px-2 h-full text-xs transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
            project?.widgetState.viewMode === 'editor'
              ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
          }`}
          title="Code viewer"
        >
          <Code2 size={13} />
        </button>
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-[var(--color-border)]" />

      {/* Dev server toggle */}
      <div className="relative" ref={devPopoverRef}>
        <div className="flex items-center">
          <button
            onClick={handleToggleDevServer}
            disabled={!project}
            className={`flex items-center gap-1.5 pl-2.5 h-7 text-sm transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
              isDevServerRunning
                ? 'text-[var(--color-success)] bg-[var(--color-success-subtle)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
            } ${!isDevServerRunning ? 'pr-1.5 rounded-l-md' : 'rounded-l-md'}`}
            title={isDevServerRunning ? 'Stop dev server' : 'Start dev server'}
          >
            {isDevServerRunning ? (
              <Square size={13} fill="currentColor" />
            ) : (
              <Play size={13} fill="currentColor" />
            )}
          </button>
          {isDevServerRunning ? (
            <button
              onClick={() => project && togglePeek(project.id)}
              className={`flex items-center gap-1 pr-1.5 h-7 text-sm transition-colors duration-150 ${
                isPeekOpen
                  ? 'text-[var(--color-success)] bg-[var(--color-success-subtle)]'
                  : 'text-[var(--color-success)]/70 bg-[var(--color-success-subtle)] hover:text-[var(--color-success)]'
              }`}
              title={isPeekOpen ? 'Hide dev server output' : 'Show dev server output'}
            >
              <span className="mono text-xs">Dev</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
            </button>
          ) : (
            <span className="pr-1.5 h-7 flex items-center text-sm text-[var(--color-text-muted)] mono text-xs">Dev</span>
          )}
          <button
            onClick={() => {
              if (!project) return
              setShowDevPopover(!showDevPopover)
              setCommandDraft(devCommand)
              setEditingCommand(false)
            }}
            disabled={!project}
            className={`flex items-center px-1 h-7 rounded-r-md text-sm transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
              isDevServerRunning
                ? 'text-[var(--color-success)]/60 hover:text-[var(--color-success)] hover:bg-[var(--color-success-subtle)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
            }`}
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {showDevPopover && (
          <div className="absolute top-full right-0 mt-1 w-64 py-2 px-3 rounded-md bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] shadow-lg z-50">
            <div className="mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1.5">
              Dev command
            </div>
            {editingCommand ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const trimmed = commandDraft.trim()
                  if (trimmed) {
                    updateDevCommand(trimmed)
                  }
                  setEditingCommand(false)
                  setShowDevPopover(false)
                }}
                className="flex gap-1.5"
              >
                <input
                  autoFocus
                  value={commandDraft}
                  onChange={(e) => setCommandDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingCommand(false)
                    }
                  }}
                  className="flex-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50 transition-colors mono"
                  placeholder="npm run dev"
                />
                <button
                  type="submit"
                  className="px-2 py-1 rounded text-xs bg-[var(--color-accent-subtle)] text-[var(--color-accent)] hover:bg-[var(--color-accent-muted)] transition-colors mono"
                >
                  Save
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setCommandDraft(devCommand)
                  setEditingCommand(true)
                }}
                className="flex items-center gap-2 w-full text-left group"
              >
                <code className="mono flex-1 text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded truncate">
                  {devCommand}
                </code>
                <Pencil
                  size={12}
                  className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-[var(--color-border)]" />

      {/* Widget buttons */}
      {widgetRegistry.map((w) => {
        const Icon = w.icon
        const isPresent = !w.allowMultiple && (
          existingLeaves.some((p) => getBaseType(p) === w.id) ||
          project?.layout.minimized.some((p) => getBaseType(p) === w.id)
        )
        return (
          <button
            key={w.id}
            onClick={() => addPanel(w.id)}
            disabled={!project || isPresent}
            className="flex items-center gap-1.5 px-2 h-7 rounded-md text-xs transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-bg-hover)]"
            style={{ color: w.color }}
            title={isPresent ? `${w.label} is already active` : w.label}
          >
            <Icon size={14} />
            <span>{w.label}</span>
          </button>
        )
      })}

      {terminalPresets.map((preset) => {
        const PresetIcon = preset.icon
        return (
          <button
            key={preset.label}
            onClick={() => addPanel('terminal', {
              label: preset.label,
              initialCommand: preset.initialCommand
            })}
            disabled={!project}
            className="flex items-center gap-1.5 px-2 h-7 rounded-md text-xs transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-bg-hover)]"
            style={{ color: preset.color }}
            title={preset.label}
          >
            <PresetIcon size={14} />
            <span>{preset.label}</span>
          </button>
        )
      })}
      </div>
    </div>
  )
}
