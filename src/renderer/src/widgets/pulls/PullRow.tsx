import { MessageSquare, Check, X as XIcon, Circle, Eye, GitBranch } from 'lucide-react'
import { GitHubPR, PRCheckStatus } from '../../../../shared/types'

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

function CIStatusIcon({ checks }: { checks: PRCheckStatus[] }): React.JSX.Element | null {
  if (checks.length === 0) return null

  const allPassed = checks.every(
    (c) => c.conclusion === 'SUCCESS' || c.conclusion === 'NEUTRAL' || c.conclusion === 'SKIPPED'
  )
  const anyFailed = checks.some((c) => c.conclusion === 'FAILURE')

  if (allPassed) return <Check size={12} className="text-[#3fb950]" />
  if (anyFailed) return <XIcon size={12} className="text-[#f85149]" />
  return <Circle size={10} className="text-[#d29922] fill-current" />
}

function ReviewIcon({ decision }: { decision: GitHubPR['reviewDecision'] }): React.JSX.Element | null {
  if (decision === 'APPROVED') return <Check size={12} className="text-[#3fb950]" />
  if (decision === 'CHANGES_REQUESTED') return <Circle size={10} className="text-[#d29922] fill-current" />
  return <Eye size={12} className="text-[var(--color-text-muted)]" />
}

interface PullRowProps {
  pr: GitHubPR
  onClick: () => void
}

export function PullRow({ pr, onClick }: PullRowProps): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-bg-hover)] transition-colors duration-100 border-b border-[var(--color-border)]/50 group"
    >
      <div className="flex items-start gap-2">
        <span className="mono text-[11px] text-[var(--color-text-muted)] pt-0.5 shrink-0">
          #{pr.number}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-[var(--color-text-primary)] leading-snug truncate">
            {pr.title}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] mono text-[var(--color-text-muted)]">
              <GitBranch size={10} />
              <span className="text-[var(--color-text-secondary)]">{pr.headRefName}</span>
              <span>&rarr;</span>
              <span>{pr.baseRefName}</span>
            </span>
            {pr.isDraft && (
              <span className="px-1.5 py-0 rounded-full text-[9px] mono bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]">
                Draft
              </span>
            )}
            {pr.labels.slice(0, 3).map((label) => (
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
            {pr.labels.length > 3 && (
              <span className="text-[10px] text-[var(--color-text-muted)] mono">
                +{pr.labels.length - 3}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          <CIStatusIcon checks={pr.checks} />
          <ReviewIcon decision={pr.reviewDecision} />
          {pr.commentsCount > 0 && (
            <span className="flex items-center gap-0.5 text-[var(--color-text-muted)]">
              <MessageSquare size={11} />
              <span className="text-[10px] mono">{pr.commentsCount}</span>
            </span>
          )}
          <span className="text-[10px] text-[var(--color-text-muted)] mono">
            {timeAgo(pr.createdAt)}
          </span>
        </div>
      </div>
    </button>
  )
}
