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
          className="flex-1 bg-white/4 text-[var(--color-text-primary)] px-3 py-2 rounded-xl border border-[var(--glass-border)] outline-none focus:border-[var(--color-accent)]/40 focus:shadow-[0_0_0_2px_var(--color-accent-subtle)] transition-all duration-200 placeholder:text-[var(--color-text-muted)]"
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/5 transition-all duration-150"
          title={expanded ? 'Collapse details' : 'Expand details'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <button
          onClick={handleSubmit}
          className="p-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white transition-all duration-200 hover:shadow-[0_0_12px_var(--color-accent-glow)]"
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
            className="w-full bg-white/4 text-sm text-[var(--color-text-primary)] px-3 py-2 rounded-xl border border-[var(--glass-border)] outline-none resize-none focus:border-[var(--color-accent)]/30 transition-all duration-200 placeholder:text-[var(--color-text-muted)]"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-muted)]">Priority:</span>
            {(['low', 'medium', 'high'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all duration-150 ${
                  priority === p
                    ? 'bg-white/10'
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
