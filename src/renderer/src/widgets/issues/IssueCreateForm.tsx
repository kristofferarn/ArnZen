import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

interface IssueCreateFormProps {
  creating: boolean
  onSubmit: (title: string, body: string) => void
  onCancel: () => void
}

export function IssueCreateForm({ creating, onSubmit, onCancel }: IssueCreateFormProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const handleSubmit = (): void => {
    const trimmed = title.trim()
    if (!trimmed || creating) return
    onSubmit(trimmed, body.trim())
  }

  return (
    <div className="px-3 py-3 border-b border-[var(--color-border)] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs mono text-[var(--color-text-muted)] uppercase tracking-wider">
          New Issue
        </span>
        <button
          onClick={onCancel}
          className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
        >
          <X size={14} />
        </button>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
        placeholder="Issue title"
        autoFocus
        className="w-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] text-sm px-3 py-2 rounded-md border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)]/50 transition-colors duration-150 placeholder:text-[var(--color-text-muted)]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Description (optional)"
        rows={3}
        className="w-full bg-[var(--color-bg-tertiary)] text-sm text-[var(--color-text-primary)] px-3 py-2 rounded-md border border-[var(--color-border)] outline-none resize-none focus:border-[var(--color-accent)]/40 transition-colors duration-150 placeholder:text-[var(--color-text-muted)]"
      />
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || creating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-bg-deep)] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating && <Loader2 size={12} className="animate-spin" />}
          Create Issue
        </button>
      </div>
    </div>
  )
}
