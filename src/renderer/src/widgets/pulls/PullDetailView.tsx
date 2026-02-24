import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X, RefreshCw, Loader2, AlertCircle, ExternalLink, Bot, GitBranch, GitMerge,
  Check, Circle, Eye, ChevronDown, ChevronRight, XCircle
} from 'lucide-react'
import { GitHubPRDetail, PRMergeMethod, PRCheckStatus } from '../../../../shared/types'
import { PullComment } from './PullComment'

interface PullDetailViewProps {
  pr: GitHubPRDetail
  loadingDetail: boolean
  addingComment: boolean
  merging: boolean
  error: string | null
  onClose: () => void
  onAddComment: (body: string) => void
  onRefresh: () => void
  onMerge: (method: PRMergeMethod, deleteBranch?: boolean) => void
  onClosePR: () => void
  onReviewWithClaude: (label: string, initialCommand: string) => void
}

function CIStatusSummary({ checks }: { checks: PRCheckStatus[] }): React.JSX.Element | null {
  if (checks.length === 0) return null

  const passed = checks.filter(
    (c) => c.conclusion === 'SUCCESS' || c.conclusion === 'NEUTRAL' || c.conclusion === 'SKIPPED'
  ).length
  const failed = checks.filter((c) => c.conclusion === 'FAILURE').length
  const pending = checks.length - passed - failed

  const allPassed = passed === checks.length

  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {allPassed ? (
        <Check size={12} className="text-[#3fb950]" />
      ) : failed > 0 ? (
        <XCircle size={12} className="text-[#f85149]" />
      ) : (
        <Circle size={10} className="text-[#d29922] fill-current" />
      )}
      <span className="text-[var(--color-text-secondary)]">
        {passed}/{checks.length} checks passed
        {failed > 0 && `, ${failed} failed`}
        {pending > 0 && `, ${pending} pending`}
      </span>
    </div>
  )
}

export function PullDetailView({
  pr,
  loadingDetail,
  addingComment,
  merging,
  error,
  onClose,
  onAddComment,
  onRefresh,
  onMerge,
  onClosePR,
  onReviewWithClaude
}: PullDetailViewProps): React.JSX.Element {
  const [commentBody, setCommentBody] = useState('')
  const [showMergeMenu, setShowMergeMenu] = useState(false)
  const [showChecks, setShowChecks] = useState(false)
  const [deleteBranch, setDeleteBranch] = useState(false)

  const handleSubmitComment = useCallback(() => {
    const trimmed = commentBody.trim()
    if (!trimmed || addingComment) return
    onAddComment(trimmed)
    setCommentBody('')
  }, [commentBody, addingComment, onAddComment])

  const handleMerge = useCallback(
    (method: PRMergeMethod) => {
      setShowMergeMenu(false)
      onMerge(method, deleteBranch)
    },
    [onMerge, deleteBranch]
  )

  const handleReviewWithClaude = useCallback(() => {
    const command = `cls; claude "Review PR #${pr.number} using gh cli. Provide feedback on the changes."`
    onReviewWithClaude(`Claude: PR #${pr.number}`, command)
    onClose()
  }, [pr.number, onReviewWithClaude, onClose])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close merge menu on outside click
  useEffect(() => {
    if (!showMergeMenu) return
    const handleClick = (): void => setShowMergeMenu(false)
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMergeMenu])

  const isOpen = pr.state === 'OPEN'
  const isMerged = pr.state === 'MERGED'
  const canMerge = isOpen && pr.mergeable !== 'CONFLICTING'

  const stateColor = isMerged
    ? 'bg-[#8957e5]/20 text-[#bc8cff]'
    : isOpen
      ? 'bg-[#238636]/20 text-[#3fb950]'
      : 'bg-[#f85149]/20 text-[#f85149]'

  const stateLabel = isMerged ? 'Merged' : isOpen ? 'Open' : 'Closed'

  const reviewDecisionLabel =
    pr.reviewDecision === 'APPROVED'
      ? 'Approved'
      : pr.reviewDecision === 'CHANGES_REQUESTED'
        ? 'Changes requested'
        : pr.reviewDecision === 'REVIEW_REQUIRED'
          ? 'Review required'
          : null

  const reviewDecisionIcon =
    pr.reviewDecision === 'APPROVED' ? (
      <Check size={12} className="text-[#3fb950]" />
    ) : pr.reviewDecision === 'CHANGES_REQUESTED' ? (
      <Circle size={10} className="text-[#d29922] fill-current" />
    ) : pr.reviewDecision === 'REVIEW_REQUIRED' ? (
      <Eye size={12} className="text-[var(--color-text-muted)]" />
    ) : null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div
        className="relative w-[90%] max-w-2xl max-h-[80vh] flex flex-col rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-strong)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)] space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="mono text-[12px] text-[var(--color-text-muted)]">#{pr.number}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] mono leading-none ${stateColor}`}>
              {stateLabel}
            </span>
            {pr.isDraft && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] mono leading-none bg-[var(--color-bg-hover)] text-[var(--color-text-muted)]">
                Draft
              </span>
            )}
            <div className="ml-auto flex items-center gap-1">
              {/* Merge button */}
              {canMerge && (
                <>
                  <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setShowMergeMenu(!showMergeMenu)}
                      disabled={merging}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#3fb950] hover:bg-[#3fb950]/10 transition-colors duration-150 disabled:opacity-50"
                    >
                      {merging ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <GitMerge size={13} />
                      )}
                      Merge
                      <ChevronDown size={11} />
                    </button>
                    {showMergeMenu && (
                      <div className="absolute top-full right-0 mt-1 w-44 py-1 rounded-md bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] shadow-lg z-50">
                        <button
                          onClick={() => handleMerge('merge')}
                          className="w-full px-3 py-1.5 text-left text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                        >
                          Merge commit
                        </button>
                        <button
                          onClick={() => handleMerge('squash')}
                          className="w-full px-3 py-1.5 text-left text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                        >
                          Squash and merge
                        </button>
                        <button
                          onClick={() => handleMerge('rebase')}
                          className="w-full px-3 py-1.5 text-left text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                        >
                          Rebase and merge
                        </button>
                        <div className="border-t border-[var(--color-border)] my-1" />
                        <label
                          className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer"
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={deleteBranch}
                            onChange={(e) => setDeleteBranch(e.target.checked)}
                            className="accent-[var(--color-accent)]"
                          />
                          Delete branch
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
                </>
              )}
              {/* Close/Reopen */}
              {isOpen && (
                <>
                  <button
                    onClick={onClosePR}
                    disabled={merging}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#f85149] hover:bg-[#f85149]/10 transition-colors duration-150 disabled:opacity-50"
                    title="Close pull request"
                  >
                    <XCircle size={13} />
                    Close
                  </button>
                  <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
                </>
              )}
              {/* Review with Claude */}
              <button
                onClick={handleReviewWithClaude}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#c9956b] hover:bg-[#c9956b]/10 transition-colors duration-150"
                title="Review with Claude"
              >
                <Bot size={13} />
                Review
              </button>
              <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
              <button
                onClick={onRefresh}
                disabled={loadingDetail}
                className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150 disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw size={13} className={loadingDetail ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => window.open(pr.url, '_blank')}
                className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
                title="Open in browser"
              >
                <ExternalLink size={13} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
                title="Close"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="text-[14px] font-medium text-[var(--color-text-primary)] leading-snug">
            {pr.title}
          </div>

          {/* Branch info + stats */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              <GitBranch size={11} />
              <span className="text-[var(--color-text-secondary)]">{pr.headRefName}</span>
              <span>&rarr;</span>
              <span>{pr.baseRefName}</span>
            </span>
            <span>
              <span className="text-[#3fb950]">+{pr.additions}</span>
              {' / '}
              <span className="text-[#f85149]">-{pr.deletions}</span>
            </span>
            <span>{pr.changedFiles} file{pr.changedFiles !== 1 ? 's' : ''}</span>
            <span>{pr.commits} commit{pr.commits !== 1 ? 's' : ''}</span>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
            <span>by <span className="text-[var(--color-text-secondary)]">{pr.author}</span></span>
            {pr.assignees.length > 0 && (
              <span>assigned to <span className="text-[var(--color-text-secondary)]">{pr.assignees.join(', ')}</span></span>
            )}
            {pr.reviewRequests.length > 0 && (
              <span>review from <span className="text-[var(--color-text-secondary)]">{pr.reviewRequests.join(', ')}</span></span>
            )}
            {pr.milestone && (
              <span className="mono">{pr.milestone}</span>
            )}
          </div>

          {/* Review decision + CI checks */}
          <div className="flex flex-wrap items-center gap-3">
            {reviewDecisionLabel && (
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                {reviewDecisionIcon}
                {reviewDecisionLabel}
              </div>
            )}
            {pr.checks.length > 0 && (
              <button
                onClick={() => setShowChecks(!showChecks)}
                className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                {showChecks ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <CIStatusSummary checks={pr.checks} />
              </button>
            )}
          </div>

          {/* Expanded checks */}
          {showChecks && pr.checks.length > 0 && (
            <div className="space-y-0.5 pl-1">
              {pr.checks.map((check) => (
                <div key={check.name} className="flex items-center gap-1.5 text-[10px]">
                  {check.conclusion === 'SUCCESS' || check.conclusion === 'NEUTRAL' || check.conclusion === 'SKIPPED' ? (
                    <Check size={10} className="text-[#3fb950]" />
                  ) : check.conclusion === 'FAILURE' ? (
                    <XCircle size={10} className="text-[#f85149]" />
                  ) : (
                    <Circle size={8} className="text-[#d29922] fill-current" />
                  )}
                  <span className="text-[var(--color-text-secondary)] truncate">{check.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Merge conflict warning */}
          {isOpen && pr.mergeable === 'CONFLICTING' && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#f85149]">
              <AlertCircle size={12} />
              This branch has conflicts that must be resolved
            </div>
          )}

          {/* Labels */}
          {pr.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pr.labels.map((label) => (
                <span
                  key={label.name}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] mono leading-relaxed"
                  style={{
                    backgroundColor: `#${label.color}22`,
                    color: `#${label.color}`
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {pr.body && (
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <div className="text-[13px] text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                {pr.body}
              </div>
            </div>
          )}

          {pr.comments.length > 0 && (
            <div>
              <div className="px-5 pt-4 pb-2">
                <span className="text-[10px] mono text-[var(--color-text-muted)] uppercase tracking-wider">
                  Comments ({pr.comments.length})
                </span>
              </div>
              {pr.comments.map((comment) => (
                <PullComment key={comment.id} comment={comment} />
              ))}
            </div>
          )}

          {pr.comments.length === 0 && !pr.body && (
            <div className="flex items-center justify-center h-24 text-xs text-[var(--color-text-muted)]">
              No description or comments
            </div>
          )}
        </div>

        {/* Add comment form */}
        <div className="px-5 py-3 border-t border-[var(--color-border)] space-y-2">
          <textarea
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmitComment()
            }}
            placeholder="Add a comment..."
            rows={2}
            className="w-full bg-[var(--color-bg-tertiary)] text-[13px] text-[var(--color-text-primary)] px-3 py-2 rounded-md border border-[var(--color-border)] outline-none resize-none focus:border-[var(--color-accent)]/40 transition-colors duration-150 placeholder:text-[var(--color-text-muted)]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--color-text-muted)]">Ctrl+Enter to submit</span>
            <button
              onClick={handleSubmitComment}
              disabled={!commentBody.trim() || addingComment}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-bg-deep)] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingComment && <Loader2 size={12} className="animate-spin" />}
              Comment
            </button>
          </div>
        </div>

        {/* Error bar */}
        {error && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-[11px] rounded-b-lg border-t border-[var(--color-border)]">
            <AlertCircle size={12} className="shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
