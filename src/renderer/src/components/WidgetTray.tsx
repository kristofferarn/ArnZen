import { useWorkspaceStore, useActiveProject } from '../stores/workspace-store'
import { getWidget, getInstanceSuffix } from '../stores/widget-registry'

export function WidgetTray(): React.JSX.Element | null {
  const project = useActiveProject()
  const { restorePanel } = useWorkspaceStore()

  if (!project || project.layout.minimized.length === 0) return null

  return (
    <div className="flex items-center h-9 px-3 gap-1.5 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
      {project.layout.minimized.map((widgetId) => {
        const widgetDef = getWidget(widgetId)
        if (!widgetDef) return null
        const Icon = widgetDef.icon
        const color = widgetDef.color

        // Use per-instance label for terminal instances
        let displayLabel = widgetDef.label
        const suffix = getInstanceSuffix(widgetId)
        if (suffix) {
          const termState = project.widgetState.terminals[suffix]
          if (termState) displayLabel = termState.label
        }

        return (
          <button
            key={widgetId}
            onClick={() => restorePanel(widgetId)}
            className="flex items-center gap-1.5 px-2.5 h-6 rounded text-xs font-medium mono transition-colors duration-150 border"
            style={{
              background: `${color}10`,
              borderColor: `${color}20`,
              color: color
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${color}1a`
              e.currentTarget.style.borderColor = `${color}35`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${color}10`
              e.currentTarget.style.borderColor = `${color}20`
            }}
            title={`Restore ${displayLabel}`}
          >
            <Icon size={12} />
            <span>{displayLabel}</span>
          </button>
        )
      })}
    </div>
  )
}
