import { ArrowUp, Loader2 } from 'lucide-react'

export function CommitSection({
  commitMessage,
  stagedCount,
  ahead,
  committing,
  pushing,
  onMessageChange,
  onCommit,
  onPush
}: {
  commitMessage: string
  stagedCount: number
  ahead: number
  committing: boolean
  pushing: boolean
  onMessageChange: (msg: string) => void
  onCommit: () => void
  onPush: () => void
}): React.JSX.Element {
  const canCommit = commitMessage.trim().length > 0 && stagedCount > 0 && !committing

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && canCommit) {
      e.preventDefault()
      onCommit()
    }
  }

  return (
    <div className="px-2 pt-2 pb-1.5 border-b border-[var(--color-border)] space-y-1.5">
      <textarea
        value={commitMessage}
        onChange={(e) => onMessageChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Commit message"
        rows={3}
        className="w-full resize-none rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-2 py-1.5 text-xs font-mono text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)]"
      />
      <div className="flex gap-1.5">
        <button
          onClick={onCommit}
          disabled={!canCommit}
          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded text-xs font-medium bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          {committing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : null}
          Commit{stagedCount > 0 ? ` (${stagedCount})` : ''}
        </button>
        <button
          onClick={onPush}
          disabled={ahead === 0 || pushing}
          className="flex items-center gap-1.5 h-7 px-3 rounded text-xs font-medium bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title={ahead > 0 ? `Push ${ahead} commit${ahead > 1 ? 's' : ''}` : 'Nothing to push'}
        >
          {pushing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <ArrowUp size={12} />
          )}
          {ahead > 0 ? ahead : ''}
        </button>
      </div>
    </div>
  )
}
