import { useState } from 'react'
import { useActiveProject, useWorkspaceStore } from '../../stores/workspace-store'
import { TASK_STATUSES, TASK_STATUS_CONFIG, TaskStatus } from '../../../../shared/types'
import { TaskCard } from './TaskCard'

export function TaskKanbanView(): React.JSX.Element {
  const project = useActiveProject()
  const { moveTaskToStatus } = useWorkspaceStore()
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)

  if (!project) return <div />

  const todos = project.widgetState.todos

  const handleDragStart = (e: React.DragEvent, taskId: string): void => {
    e.dataTransfer.setData('text/plain', taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, status: TaskStatus): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }

  const handleDrop = (e: React.DragEvent, status: TaskStatus): void => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) {
      moveTaskToStatus(taskId, status)
    }
    setDragOverColumn(null)
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    // Only clear if actually leaving the column (not entering a child)
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragOverColumn(null)
  }

  if (todos.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
        No tasks yet. Add one above.
      </div>
    )
  }

  return (
    <div className="h-full flex gap-2 p-2 overflow-x-auto">
      {TASK_STATUSES.map((status) => {
        const tasksInColumn = todos.filter((t) => t.status === status)
        const config = TASK_STATUS_CONFIG[status]
        const isOver = dragOverColumn === status

        return (
          <div
            key={status}
            className={`flex-1 min-w-[180px] flex flex-col rounded-md border transition-colors duration-150 ${
              isOver
                ? 'border-[var(--color-border-strong)] bg-[var(--color-surface)]'
                : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span
                className="mono text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: config.color }}
              >
                {config.label}
              </span>
              <span className="mono text-[10px] text-[var(--color-text-muted)] ml-auto">
                {tasksInColumn.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2">
              {tasksInColumn.length === 0 && isOver && (
                <div
                  className="h-0.5 rounded-full mb-2"
                  style={{ backgroundColor: config.color + '60' }}
                />
              )}
              {tasksInColumn.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  variant="kanban"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                />
              ))}
              {tasksInColumn.length === 0 && !isOver && (
                <div className="flex items-center justify-center h-16 text-[var(--color-text-muted)] text-xs">
                  No tasks
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
