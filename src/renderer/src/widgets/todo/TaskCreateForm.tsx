import { useState } from 'react'
import { Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspace-store'
import { TaskPriority, TASK_PRIORITY_CONFIG } from '../../../../shared/types'

export function TaskCreateForm(): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [expanded, setExpanded] = useState(false)
  const { addTask } = useWorkspaceStore()

  const handleSubmit = (): void => {
    const trimmed = title.trim()
    if (!trimmed) return
    addTask(trimmed, description.trim(), priority)
    setTitle('')
    setDescription('')
    setPriority('medium')
    setExpanded(false)
  }

  return (
    <div className="px-4 pt-4 pb-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          placeholder="Add a task..."
          className="flex-1 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] px-3 py-2 rounded-md border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)]/50 transition-colors duration-150 placeholder:text-[var(--color-text-muted)]"
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
          title={expanded ? 'Collapse details' : 'Expand details'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button
          onClick={handleSubmit}
          className="p-2 rounded-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-bg-deep)] transition-colors duration-150"
        >
          <Plus size={18} />
        </button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full bg-[var(--color-bg-tertiary)] text-sm text-[var(--color-text-primary)] px-3 py-2 rounded-md border border-[var(--color-border)] outline-none resize-none focus:border-[var(--color-accent)]/40 transition-colors duration-150 placeholder:text-[var(--color-text-muted)]"
          />
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Priority:</span>
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-2 py-0.5 rounded text-xs font-medium mono transition-colors duration-150 ${
                  priority === p
                    ? 'bg-[var(--color-bg-hover)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}
                style={priority === p ? { color: TASK_PRIORITY_CONFIG[p].color } : undefined}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
