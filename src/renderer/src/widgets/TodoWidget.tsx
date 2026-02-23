import { List, Columns3, Trash2 } from 'lucide-react'
import { useWorkspaceStore, useActiveProject } from '../stores/workspace-store'
import { TaskListView } from './todo/TaskListView'
import { TaskKanbanView } from './todo/TaskKanbanView'
import { TaskCreateForm } from './todo/TaskCreateForm'

export function TodoWidget(): React.JSX.Element {
  const project = useActiveProject()
  const { setTodoViewMode, clearDoneTasks } = useWorkspaceStore()

  if (!project)
    return <div className="p-4 text-[var(--color-text-muted)]">No project selected</div>

  const { todoViewMode, todos } = project.widgetState
  const doneCount = todos.filter((t) => t.status === 'done').length
  const remaining = todos.length - doneCount

  return (
    <div className="flex flex-col h-full">
      {/* Header: create form + bar */}
      <div className="shrink-0 border-b border-[var(--glass-border)]">
        <TaskCreateForm />
        <div className="flex items-center justify-between px-4 py-1.5">
          <span className="text-xs text-[var(--color-text-muted)]">
            {remaining} remaining{doneCount > 0 ? ` · ${doneCount} done` : ''}
          </span>
          <div className="flex items-center gap-1">
            {doneCount > 0 && (
              <button
                onClick={clearDoneTasks}
                className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-all duration-150"
                title="Clear done tasks"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              onClick={() => setTodoViewMode('list')}
              className={`p-1 rounded-md transition-all duration-150 ${
                todoViewMode === 'list'
                  ? 'text-[var(--color-text-primary)] bg-white/8'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/5'
              }`}
              title="List view"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setTodoViewMode('kanban')}
              className={`p-1 rounded-md transition-all duration-150 ${
                todoViewMode === 'kanban'
                  ? 'text-[var(--color-text-primary)] bg-white/8'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/5'
              }`}
              title="Kanban view"
            >
              <Columns3 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* View body */}
      <div className="flex-1 overflow-hidden">
        {todoViewMode === 'list' ? <TaskListView /> : <TaskKanbanView />}
      </div>
    </div>
  )
}
