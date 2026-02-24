import { useCallback } from 'react'
import { useDrag } from 'react-dnd'
import { MosaicDragType } from 'react-mosaic-component'
import { useWorkspaceStore, useActiveProject } from '../stores/workspace-store'
import { getWidget, getBaseType, getInstanceSuffix } from '../stores/widget-registry'
import { MOSAIC_ID } from './WidgetArea'
import { Project } from '../../../shared/types'

interface MosaicDropResult {
  path?: ('first' | 'second')[]
  position?: 'top' | 'bottom' | 'left' | 'right'
}

function DraggableTrayButton({
  widgetId,
  project
}: {
  widgetId: string
  project: Project
}): React.JSX.Element | null {
  const { restorePanel, restorePanelAt } = useWorkspaceStore()

  const widgetDef = getWidget(widgetId)

  const [{ isDragging }, connectDrag] = useDrag({
    type: MosaicDragType.WINDOW,
    item: { mosaicId: MOSAIC_ID, hideTimer: 0 },
    end: (_item, monitor) => {
      const result = monitor.getDropResult() as MosaicDropResult | null
      if (result?.path !== undefined && result?.position !== undefined) {
        restorePanelAt(widgetId, result.path, result.position)
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  // Wrapper to bridge react-dnd v16 ConnectDragSource with React 19 ref type
  const dragRef = useCallback(
    (node: HTMLButtonElement | null) => {
      connectDrag(node)
    },
    [connectDrag]
  )

  if (!widgetDef) return null

  const Icon = widgetDef.icon
  let color = widgetDef.color
  let displayLabel = widgetDef.label
  const suffix = getInstanceSuffix(widgetId)
  const baseType = getBaseType(widgetId)
  if (suffix) {
    if (baseType === 'terminal') {
      const termState = project.widgetState.terminals[suffix]
      if (termState) {
        displayLabel = termState.label
        if (termState.color) color = termState.color
      }
    } else if (baseType === 'file-viewer') {
      const viewerState = project.widgetState.fileViewers[suffix]
      if (viewerState?.currentFilePath) {
        displayLabel = viewerState.currentFilePath.split(/[\\/]/).pop() || widgetDef.label
      }
    }
  }

  return (
    <button
      ref={dragRef}
      onClick={() => restorePanel(widgetId)}
      className="flex items-center gap-1.5 px-2.5 h-6 rounded text-xs font-medium mono transition-colors duration-150 border cursor-grab active:cursor-grabbing"
      style={{
        background: `${color}10`,
        borderColor: `${color}20`,
        color: color,
        opacity: isDragging ? 0.4 : 1
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}1a`
        e.currentTarget.style.borderColor = `${color}35`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `${color}10`
        e.currentTarget.style.borderColor = `${color}20`
      }}
      title={`Click to restore or drag into workspace — ${displayLabel}`}
    >
      <Icon size={12} />
      <span>{displayLabel}</span>
    </button>
  )
}

export function WidgetTray(): React.JSX.Element | null {
  const project = useActiveProject()

  if (!project || project.layout.minimized.length === 0) return null

  return (
    <div className="flex items-center h-9 px-3 gap-1.5 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] shrink-0">
      {project.layout.minimized.map((widgetId) => (
        <DraggableTrayButton key={widgetId} widgetId={widgetId} project={project} />
      ))}
    </div>
  )
}
