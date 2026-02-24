import { MessageSquare } from 'lucide-react'
import { GitHubIssue } from '../../../../shared/types'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

interface IssueRowProps {
  issue: GitHubIssue
  active?: boolean
  onClick: () => void
}

export function IssueRow({ issue, active, onClick }: IssueRowProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 hover:bg-[var(--color-bg-hover)] transition-colors duration-100 border-b border-[var(--color-border)]/50 group ${
        active ? 'bg-[var(--color-accent)]/8 border-l-2 border-l-[var(--color-accent)]' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="mono text-[11px] text-[var(--color-text-muted)] pt-0.5 shrink-0">
          #{issue.number}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-[var(--color-text-primary)] leading-snug truncate">
            {issue.title}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {issue.labels.slice(0, 3).map((label) => (
              <span
                key={label.name}
                className="inline-flex items-center px-1.5 py-0 rounded-full text-[10px] mono leading-relaxed"
                style={{
                  backgroundColor: `#${label.color}22`,
                  color: `#${label.color}`
                }}
              >
                {label.name}
              </span>
            ))}
            {issue.labels.length > 3 && (
              <span className="text-[10px] text-[var(--color-text-muted)] mono">
                +{issue.labels.length - 3}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {issue.commentsCount > 0 && (
            <span className="flex items-center gap-0.5 text-[var(--color-text-muted)]">
              <MessageSquare size={11} />
              <span className="text-[10px] mono">{issue.commentsCount}</span>
            </span>
          )}
          <span className="text-[10px] text-[var(--color-text-muted)] mono">
            {timeAgo(issue.createdAt)}
          </span>
        </div>
      </div>
    </button>
  )
}
