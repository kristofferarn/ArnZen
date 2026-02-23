import { useState } from 'react'
import { Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspace-store'
import {
  Task,
  TASK_STATUS_CONFIG,
  TASK_PRIORITY_CONFIG,
  TaskStatus
} from '../../../../shared/types'
import { TaskStatusMenu } from './TaskStatusMenu'
import { TaskPriorityBadge } from './TaskPriorityBadge'

interface TaskCardProps {
  task: Task
  variant: 'list' | 'kanban'
  draggable?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

const STATUS_CYCLE: TaskStatus[] = ['todo', 'in-progress', 'done']

export function TaskCard({
  task,
  variant,
  draggable,
  onDragStart,
  onDragEnd
}: TaskCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const { updateTask, removeTask } = useWorkspaceStore()

  const handleTitleSave = (): void => {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== task.title) {
      updateTask(task.id, { title: trimmed })
    } else {
      setTitleDraft(task.title)
    }
    setEditingTitle(false)
  }

  const statusColor = TASK_STATUS_CONFIG[task.status].color

  return (
    <div
      className={`group rounded-xl transition-all duration-150 ${
        variant === 'kanban'
          ? 'bg-white/4 border border-[var(--glass-border)] p-3 mb-2 hover:border-white/10'
          : 'hover:bg-white/4 px-3 py-2.5'
      } ${task.status === 'done' ? 'opacity-60' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Top row */}
      <div className="flex items-center gap-2">
        {draggable && (
          <GripVertical
            size={12}
            className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 cursor-grab shrink-0 transition-opacity duration-150"
          />
        )}

        {/* Status dot — click to cycle */}
        <button
          onClick={() => {
            const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length]
            updateTask(task.id, { status: next })
          }}
          className="w-3.5 h-3.5 rounded-full shrink-0 border-2 transition-all duration-200"
          style={{
            borderColor: statusColor,
            backgroundColor: task.status === 'done' ? statusColor : 'transparent'
          }}
          title={`Status: ${TASK_STATUS_CONFIG[task.status].label}`}
        />

        {/* Title — double-click to edit */}
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSave()
              if (e.key === 'Escape') {
                setTitleDraft(task.title)
                setEditingTitle(false)
              }
            }}
            className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] outline-none border-b border-[var(--color-accent)]"
          />
        ) : (
          <span
            onDoubleClick={() => {
              setTitleDraft(task.title)
              setEditingTitle(true)
            }}
            className={`flex-1 text-sm truncate cursor-default select-none ${
              task.status === 'done'
                ? 'line-through text-[var(--color-text-muted)]'
                : 'text-[var(--color-text-primary)]'
            }`}
          >
            {task.title}
          </span>
        )}

        <TaskPriorityBadge priority={task.priority} />

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors duration-150"
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {/* Delete */}
        <button
          onClick={() => removeTask(task.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[var(--color-danger-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all duration-150"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="mt-2 ml-6 space-y-2">
          <textarea
            value={task.description}
            onChange={(e) => updateTask(task.id, { description: e.target.value })}
            placeholder="Add a description..."
            rows={2}
            className="w-full bg-white/4 text-xs text-[var(--color-text-secondary)] px-2.5 py-2 rounded-lg border border-[var(--glass-border)] outline-none resize-none focus:border-[var(--color-accent)]/30 transition-all duration-200 placeholder:text-[var(--color-text-muted)]"
          />

          <div className="flex items-center gap-3">
            <TaskStatusMenu
              current={task.status}
              onChange={(status) => updateTask(task.id, { status })}
            />
            <div className="flex items-center gap-1">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => updateTask(task.id, { priority: p })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all duration-150 ${
                    task.priority === p
                      ? 'bg-white/10'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  }`}
                  style={task.priority === p ? { color: TASK_PRIORITY_CONFIG[p].color } : undefined}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
