import { useState, useCallback } from 'react'
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
    return <div className="h-7 bg-[var(--glass-bg)]" />
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
        className="flex items-center h-7 px-2.5 shrink-0 transition-colors duration-200 cursor-move"
        style={{
          background: isFocused
            ? `linear-gradient(180deg, ${color}08, transparent)`
            : 'rgba(16, 19, 27, 0.6)'
        }}
      >
        <span
          className="mr-1.5 transition-colors duration-200"
          style={{ color: isFocused ? color : 'var(--color-text-muted)' }}
        >
          <Icon size={12} />
        </span>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider flex-1 truncate transition-colors duration-200"
          style={{ color: isFocused ? color : 'var(--color-text-secondary)' }}
        >
          {displayLabel}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            minimizePanel(widgetId)
          }}
          className="p-0.5 rounded hover:bg-white/8 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all duration-150 mr-0.5"
          title="Minimize"
        >
          <Minus size={11} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            removePanel(widgetId)
          }}
          className="p-0.5 rounded hover:bg-[var(--color-danger-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all duration-150"
          title="Close"
        >
          <X size={11} />
        </button>
      </div>

      {/* Separator */}
      <div
        className="h-px shrink-0"
        style={{
          background: isFocused
            ? `linear-gradient(90deg, transparent, ${color}30, transparent)`
            : 'var(--glass-border)'
        }}
      />
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
        <div className="p-5 rounded-2xl bg-white/3 border border-[var(--glass-border)]">
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
    const descriptions: Record<string, string> = {
      todo: 'Track tasks and stay organized',
      terminal: 'Run commands in your project'
    }

    const availableWidgets = widgetRegistry.filter((w) => {
      if (w.allowMultiple) return true
      return !project.layout.minimized.some((p) => getBaseType(p) === w.id)
    })

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
            {availableWidgets.map((w) => {
              const Icon = w.icon
              return (
                <button
                  key={w.id}
                  onClick={() => addPanel(w.id)}
                  className="group flex flex-col items-center gap-3 w-36 p-5 rounded-xl bg-white/3 border border-[var(--glass-border)] hover:bg-white/6 hover:border-white/10 transition-all duration-200"
                >
                  <div
                    className="p-3 rounded-xl bg-white/4 transition-all duration-200"
                    style={{
                      boxShadow: `0 0 0 rgba(0,0,0,0)`,
                      color: w.color
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 20px ${w.color}25`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 0 rgba(0,0,0,0)`
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {w.label}
                    </p>
                    <p className="text-xs mt-0.5 text-[var(--color-text-muted)]">
                      {descriptions[w.id] || ''}
                    </p>
                  </div>
                </button>
              )
            })}
            {terminalPresets.map((preset) => {
              const PresetIcon = preset.icon
              return (
                <button
                  key={preset.label}
                  onClick={() =>
                    addPanel('terminal', {
                      label: preset.label,
                      initialCommand: preset.initialCommand
                    })
                  }
                  className="group flex flex-col items-center gap-3 w-36 p-5 rounded-xl bg-white/3 border border-[var(--glass-border)] hover:bg-white/6 hover:border-white/10 transition-all duration-200"
                >
                  <div
                    className="p-3 rounded-xl bg-white/4 transition-all duration-200"
                    style={{
                      boxShadow: `0 0 0 rgba(0,0,0,0)`,
                      color: preset.color
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 20px ${preset.color}25`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = `0 0 0 rgba(0,0,0,0)`
                    }}
                  >
                    <PresetIcon size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      {preset.label}
                    </p>
                    <p className="text-xs mt-0.5 text-[var(--color-text-muted)]">
                      AI-powered coding assistant
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
      <div className="flex-1 overflow-hidden pt-1.5 pb-0.5 px-0.5">
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
                  className="h-full overflow-hidden"
                  style={{ background: 'var(--glass-bg-solid)' }}
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
