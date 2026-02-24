import { useState, useRef, useEffect } from 'react'
import { TASK_STATUS_CONFIG, TASK_STATUSES, TaskStatus } from '../../../../shared/types'

interface TaskStatusMenuProps {
  current: TaskStatus
  onChange: (status: TaskStatus) => void
}

export function TaskStatusMenu({ current, onChange }: TaskStatusMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const config = TASK_STATUS_CONFIG[current]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium mono hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
        style={{ color: config.color }}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: config.color }}
        />
        {config.label}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-32 py-1 rounded-md bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] shadow-lg z-50">
          {TASK_STATUSES.map((status) => {
            const s = TASK_STATUS_CONFIG[status]
            return (
              <button
                key={status}
                onClick={() => {
                  onChange(status)
                  setOpen(false)
                }}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-xs hover:bg-[var(--color-bg-hover)] transition-colors duration-150 ${
                  status === current
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
