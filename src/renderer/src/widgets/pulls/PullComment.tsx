import { GitHubPRComment } from '../../../../shared/types'

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

interface PullCommentProps {
  comment: GitHubPRComment
}

export function PullComment({ comment }: PullCommentProps): React.JSX.Element {
  const initials = comment.author.slice(0, 2).toUpperCase()

  return (
    <div className="px-5 py-2.5 border-b border-[var(--color-border)]/50">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center">
          <span className="text-[9px] mono text-[var(--color-text-muted)] leading-none">
            {initials}
          </span>
        </div>
        <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
          {comment.author}
        </span>
        <span className="text-[10px] text-[var(--color-text-muted)] mono">
          {timeAgo(comment.createdAt)}
        </span>
      </div>
      <div className="pl-7 text-[12px] text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
        {comment.body}
      </div>
    </div>
  )
}
