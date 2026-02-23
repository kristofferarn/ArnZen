import { useRef, useState } from 'react'
import { Allotment } from 'allotment'
import { FolderOpen } from 'lucide-react'
import { useActiveProject, useWorkspaceStore } from '../stores/workspace-store'
import { widgetRegistry, terminalPresets, getBaseType } from '../stores/widget-registry'
import { WidgetPanel } from './WidgetPanel'
import { WidgetTray } from './WidgetTray'

export function WidgetArea(): React.JSX.Element {
  const project = useActiveProject()
  const { updatePanelSizes, addPanel } = useWorkspaceStore()
  const sizesRef = useRef<number[]>([])
  const [focusedId, setFocusedId] = useState<string | null>(null)

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

  const { panels, sizes } = project.layout

  if (panels.length === 0) {
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

  // Auto-focus first panel if none focused
  const activeFocusId = focusedId && panels.includes(focusedId) ? focusedId : panels[0]

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden pt-1.5 pb-0.5 px-0.5">
        <Allotment
          key={project.id + ':' + panels.join(',')}
          defaultSizes={sizes}
          onChange={(newSizes) => {
            sizesRef.current = newSizes
          }}
          onDragEnd={() => {
            if (sizesRef.current.length > 0) {
              updatePanelSizes(sizesRef.current)
            }
          }}
        >
          {panels.map((widgetId) => (
            <Allotment.Pane key={widgetId} minSize={150}>
              <WidgetPanel
                widgetId={widgetId}
                isFocused={widgetId === activeFocusId}
                onFocus={() => setFocusedId(widgetId)}
              />
            </Allotment.Pane>
          ))}
        </Allotment>
      </div>
      <WidgetTray />
    </div>
  )
}
