import { Minus, X } from 'lucide-react'
import { useWorkspaceStore, useActiveProject } from '../stores/workspace-store'
import { getWidget, getInstanceSuffix } from '../stores/widget-registry'

interface WidgetPanelProps {
  widgetId: string
  isFocused: boolean
  onFocus: () => void
}

export function WidgetPanel({ widgetId, isFocused, onFocus }: WidgetPanelProps): React.JSX.Element {
  const { minimizePanel, removePanel } = useWorkspaceStore()
  const project = useActiveProject()
  const widgetDef = getWidget(widgetId)

  if (!widgetDef) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
        Unknown widget
      </div>
    )
  }

  const Icon = widgetDef.icon
  const WidgetComponent = widgetDef.component
  const color = widgetDef.color

  // Use per-instance label for terminal instances
  let displayLabel = widgetDef.label
  const suffix = getInstanceSuffix(widgetId)
  if (suffix && project) {
    const termState = project.widgetState.terminals[suffix]
    if (termState) displayLabel = termState.label
  }

  return (
    <div
      className="h-full p-1.5 first:pl-1.5 last:pr-1.5"
      onMouseDown={onFocus}
    >
      <div
        className="widget-panel flex flex-col h-full rounded-xl overflow-hidden transition-all duration-200"
        style={{
          border: `1px solid ${isFocused ? color + '40' : 'rgba(255,255,255,0.06)'}`,
          boxShadow: isFocused
            ? `0 0 20px ${color}15, 0 0 8px ${color}10, 0 4px 12px rgba(0,0,0,0.3)`
            : '0 2px 8px rgba(0,0,0,0.2)'
        }}
      >
        {/* Colored top accent line */}
        <div
          className="h-[2px] shrink-0 transition-opacity duration-200"
          style={{
            background: `linear-gradient(90deg, ${color}00, ${color}${isFocused ? 'cc' : '40'}, ${color}00)`,
          }}
        />

        {/* Panel header */}
        <div
          className="flex items-center h-7 px-2.5 shrink-0 transition-colors duration-200"
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

        {/* Widget content */}
        <div className="flex-1 overflow-hidden" style={{ background: 'var(--glass-bg-solid)' }}>
          <WidgetComponent instanceId={widgetId} />
        </div>
      </div>
    </div>
  )
}
