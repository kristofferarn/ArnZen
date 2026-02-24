import { useState, useMemo, useEffect } from 'react'
import { X, Loader2, ChevronDown } from 'lucide-react'
import { parseBranchForPR } from '../issues/assign-to-claude'

interface PullCreateFormProps {
  creating: boolean
  currentBranch?: string
  defaultBranch?: string
  branches: string[]
  onSubmit: (title: string, body: string, head: string, base: string) => void
  onCancel: () => void
}

export function PullCreateForm({
  creating,
  currentBranch,
  defaultBranch,
  branches,
  onSubmit,
  onCancel
}: PullCreateFormProps): React.JSX.Element {
  const defaults = useMemo(() => parseBranchForPR(currentBranch ?? ''), [currentBranch])
  const [title, setTitle] = useState(defaults.title)
  const [body, setBody] = useState(defaults.body)
  const [head, setHead] = useState(currentBranch ?? '')
  const [base, setBase] = useState(defaultBranch ?? '')
  const [userChangedBase, setUserChangedBase] = useState(false)

  useEffect(() => {
    if (defaultBranch && !userChangedBase) setBase(defaultBranch)
  }, [defaultBranch, userChangedBase])

  const handleSubmit = (): void => {
    const trimmed = title.trim()
    if (!trimmed || creating) return
    onSubmit(trimmed, body.trim(), head, base)
  }

  return (
    <div className="px-3 py-3 border-b border-[var(--color-border)] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs mono text-[var(--color-text-muted)] uppercase tracking-wider">
          New Pull Request
        </span>
        <button
          onClick={onCancel}
          className="p-0.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <BranchSelect label="from" value={head} branches={branches} onChange={setHead} />
        <span className="text-[var(--color-text-muted)]">&rarr;</span>
        <BranchSelect label="into" value={base} branches={branches} onChange={(v) => { setBase(v); setUserChangedBase(true) }} />
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
        placeholder="PR title"
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
          Create PR
        </button>
      </div>
    </div>
  )
}

function BranchSelect({
  label,
  value,
  branches,
  onChange
}: {
  label: string
  value: string
  branches: string[]
  onChange: (v: string) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5 min-w-0 flex-1">
      <span className="text-[var(--color-text-muted)] shrink-0">{label}</span>
      <div className="relative flex-1 min-w-0">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] text-xs pl-2 pr-6 py-1.5 rounded-md border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)]/50 transition-colors duration-150 truncate cursor-pointer"
        >
          {branches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
          {value && !branches.includes(value) && (
            <option value={value}>{value}</option>
          )}
        </select>
        <ChevronDown
          size={12}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
        />
      </div>
    </div>
  )
}
