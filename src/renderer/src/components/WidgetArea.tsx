import { useState, useCallback, ComponentType } from 'react'
import { Mosaic, MosaicWindow, MosaicNode } from 'react-mosaic-component'
import { FolderOpen, Minus, X } from 'lucide-react'
import { useActiveProject, useWorkspaceStore } from '../stores/workspace-store'
import {
  widgetRegistry,
  terminalPresets,
  getBaseType,
  getWidget,
  getInstanceSuffix
} from '../stores/widget-registry'
import { WidgetTray } from './WidgetTray'
import { getMosaicLeaves } from '../../../shared/types'

function WidgetToolbar({
  widgetId,
  isFocused,
  onFocus
}: {
  widgetId: string
  isFocused: boolean
  onFocus: () => void
}): React.JSX.Element {
  const { minimizePanel, removePanel } = useWorkspaceStore()
  const project = useActiveProject()
  const widgetDef = getWidget(widgetId)

  if (!widgetDef) {
    return <div className="h-7 bg-[var(--color-bg-secondary)]" />
  }

  const Icon = widgetDef.icon
  const color = widgetDef.color

  let displayLabel = widgetDef.label
  const suffix = getInstanceSuffix(widgetId)
  if (suffix && project) {
    const termState = project.widgetState.terminals[suffix]
    if (termState) displayLabel = termState.label
  }

  return (
    <div className="flex flex-col" onMouseDown={onFocus}>
      {/* Toolbar row */}
      <div
        className="flex items-center h-7 px-2.5 shrink-0 transition-colors duration-150 cursor-move"
        style={{
          background: isFocused
            ? 'var(--color-bg-tertiary)'
            : 'var(--color-bg-secondary)',
          borderLeft: isFocused ? `2px solid ${color}` : '2px solid transparent'
        }}
      >
        <span
          className="mr-1.5 transition-colors duration-150"
          style={{ color: isFocused ? color : 'var(--color-text-muted)' }}
        >
          <Icon size={12} />
        </span>
        <span
          className="mono text-[10px] font-semibold uppercase tracking-wider flex-1 truncate transition-colors duration-150"
          style={{ color: isFocused ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}
        >
          {displayLabel}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            minimizePanel(widgetId)
          }}
          className="p-0.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors duration-150 mr-0.5"
          title="Minimize"
        >
          <Minus size={11} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            removePanel(widgetId)
          }}
          className="p-0.5 rounded hover:bg-[var(--color-danger-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors duration-150"
          title="Close"
        >
          <X size={11} />
        </button>
      </div>

      {/* Separator */}
      <div className="h-px shrink-0 bg-[var(--color-border)]" />
    </div>
  )
}

export function WidgetArea(): React.JSX.Element {
  const project = useActiveProject()
  const { updateMosaicLayout, addPanel } = useWorkspaceStore()
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const handleChange = useCallback(
    (newNode: MosaicNode<string> | null) => {
      updateMosaicLayout(newNode)
    },
    [updateMosaicLayout]
  )

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-[var(--color-text-muted)]">
        <div className="p-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
          <FolderOpen size={40} strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-[var(--color-text-secondary)]">
            No project open
          </p>
          <p className="text-sm mt-1 text-[var(--color-text-muted)]">
            Select a project from the toolbar
          </p>
        </div>
      </div>
    )
  }

  const { mosaic } = project.layout

  if (mosaic === null) {
    const suggestedWidgets: {
      label: string
      icon: ComponentType<{ size?: number; className?: string }>
      color: string
      description: string
      action: () => void
    }[] = [
      {
        label: 'Source Control',
        icon: widgetRegistry.find((w) => w.id === 'source-control')!.icon,
        color: widgetRegistry.find((w) => w.id === 'source-control')!.color,
        description: 'Stage, commit, and push changes',
        action: () => addPanel('source-control')
      },
      {
        label: 'Issues',
        icon: widgetRegistry.find((w) => w.id === 'issues')!.icon,
        color: widgetRegistry.find((w) => w.id === 'issues')!.color,
        description: 'Track and manage GitHub issues',
        action: () => addPanel('issues')
      },
      {
        label: 'Pull Requests',
        icon: widgetRegistry.find((w) => w.id === 'pulls')!.icon,
        color: widgetRegistry.find((w) => w.id === 'pulls')!.color,
        description: 'Review and merge pull requests',
        action: () => addPanel('pulls')
      },
      {
        label: terminalPresets[0].label,
        icon: terminalPresets[0].icon,
        color: terminalPresets[0].color,
        description: 'AI-powered coding assistant',
        action: () =>
          addPanel('terminal', {
            label: terminalPresets[0].label,
            initialCommand: terminalPresets[0].initialCommand
          })
      }
    ]

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-base font-medium text-[var(--color-text-secondary)]">
              Get started
            </p>
            <p className="text-sm mt-1 text-[var(--color-text-muted)]">
              Pick a widget to add to your workspace
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 px-6 max-w-lg">
            {suggestedWidgets.map((w) => {
              const Icon = w.icon
              return (
                <button
                  key={w.label}
                  onClick={w.action}
                  className="group flex flex-col items-center gap-3 w-36 p-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-raised)] hover:border-[var(--color-border-strong)] transition-colors duration-150"
                >
                  <div
                    className="p-3 rounded-md bg-[var(--color-bg-tertiary)] transition-colors duration-150"
                    style={{ color: w.color }}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {w.label}
                    </p>
                    <p className="text-xs mt-0.5 text-[var(--color-text-muted)]">
                      {w.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        <WidgetTray />
      </div>
    )
  }

  const leaves = getMosaicLeaves(mosaic)
  const activeFocusId = focusedId && leaves.includes(focusedId) ? focusedId : leaves[0]

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden pt-1 pb-0.5 px-0.5">
        <Mosaic<string>
          className=""
          value={mosaic as MosaicNode<string>}
          onChange={handleChange}
          renderTile={(id, path) => {
            const widgetDef = getWidget(id)
            if (!widgetDef) return <div />
            const WidgetComponent = widgetDef.component
            const isFocused = id === activeFocusId

            return (
              <MosaicWindow<string>
                path={path}
                title=""
                toolbarControls={<></>}
                renderToolbar={() => (
                  <div className="w-full">
                    <WidgetToolbar
                      widgetId={id}
                      isFocused={isFocused}
                      onFocus={() => setFocusedId(id)}
                    />
                  </div>
                )}
                className={isFocused ? 'mosaic-window-focused' : ''}
              >
                <div
                  className="h-full overflow-hidden bg-[var(--color-bg-primary)]"
                  onMouseDown={() => setFocusedId(id)}
                >
                  <WidgetComponent instanceId={id} />
                </div>
              </MosaicWindow>
            )
          }}
          zeroStateView={<></>}
        />
      </div>
      <WidgetTray />
    </div>
  )
}
