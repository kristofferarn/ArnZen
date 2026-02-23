import { TASK_PRIORITY_CONFIG, TaskPriority } from '../../../../shared/types'

interface TaskPriorityBadgeProps {
  priority: TaskPriority
}

export function TaskPriorityBadge({ priority }: TaskPriorityBadgeProps): React.JSX.Element | null {
  if (priority === 'medium') return null
  const config = TASK_PRIORITY_CONFIG[priority]
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0"
      style={{ color: config.color, backgroundColor: config.color + '15' }}
    >
      {config.label}
    </span>
  )
}
