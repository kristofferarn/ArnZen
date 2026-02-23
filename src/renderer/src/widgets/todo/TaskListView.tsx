import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useActiveProject } from '../../stores/workspace-store'
import { TASK_STATUSES, TASK_STATUS_CONFIG, TaskStatus } from '../../../../shared/types'
import { TaskCard } from './TaskCard'

export function TaskListView(): React.JSX.Element {
  const project = useActiveProject()
  const [collapsedSections, setCollapsedSections] = useState<Set<TaskStatus>>(new Set())

  if (!project) return <div />

  const todos = project.widgetState.todos

  const toggleSection = (status: TaskStatus): void => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  if (todos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
        No tasks yet. Add one above.
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-2">
      {TASK_STATUSES.map((status) => {
        const tasksInGroup = todos.filter((t) => t.status === status)
        if (tasksInGroup.length === 0) return null
        const collapsed = collapsedSections.has(status)
        const config = TASK_STATUS_CONFIG[status]

        return (
          <div key={status} className="mb-3">
            <button
              onClick={() => toggleSection(status)}
              className="flex items-center gap-2 px-2 py-1.5 w-full text-left hover:bg-white/3 rounded-lg transition-all duration-150"
            >
              {collapsed ? (
                <ChevronRight size={12} className="text-[var(--color-text-muted)]" />
              ) : (
                <ChevronDown size={12} className="text-[var(--color-text-muted)]" />
              )}
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: config.color }}
              >
                {config.label}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] ml-1">
                {tasksInGroup.length}
              </span>
            </button>

            {!collapsed && (
              <div className="mt-0.5">
                {tasksInGroup.map((task) => (
                  <TaskCard key={task.id} task={task} variant="list" />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
