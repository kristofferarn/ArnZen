import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, RefreshCw, Loader2, AlertCircle, ExternalLink, Bot, GitPullRequest } from 'lucide-react'
import { GitHubIssue, GitHubIssueComment, GitHubLabel } from '../../../../shared/types'
import { IssueComment } from './IssueComment'
import { issueBranchName, issuePrTitle, claudeIssueCommand } from './assign-to-claude'
import { LabelPicker, LabelBadges } from '../pulls/LabelPicker'

export function branchMatchesIssue(branch: string, issueNumber: number): boolean {
  // Match patterns like feat/42-..., fix/42-..., issue-42-..., #42, or number preceded by separator
  const patterns = [
    new RegExp(`^\\w+/${issueNumber}-`),
    new RegExp(`issue-${issueNumber}\\b`),
    new RegExp(`#${issueNumber}\\b`),
    new RegExp(`[-/]${issueNumber}[-/]`),
    new RegExp(`^${issueNumber}-`)
  ]
  return patterns.some((p) => p.test(branch))
}

interface IssueDetailViewProps {
  issue: GitHubIssue & { milestone: string | null; comments: GitHubIssueComment[] }
  loadingDetail: boolean
  addingComment: boolean
  error: string | null
  rootPath: string
  currentBranch: string
  repoLabels: GitHubLabel[]
  loadingLabels: boolean
  onClose: () => void
  onAddComment: (body: string) => void
  onRefresh: () => void
  onAssignToClaude: (label: string, initialCommand: string) => void
  onEditLabels: (add: string[], remove: string[]) => void
  onFetchLabels: () => void
}

export function IssueDetailView({
  issue,
  loadingDetail,
  addingComment,
  error,
  rootPath,
  currentBranch,
  repoLabels,
  loadingLabels,
  onClose,
  onAddComment,
  onRefresh,
  onAssignToClaude,
  onEditLabels,
  onFetchLabels
}: IssueDetailViewProps): React.JSX.Element {
  const [commentBody, setCommentBody] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [creatingPr, setCreatingPr] = useState(false)
  const [prUrl, setPrUrl] = useState<string | null>(null)

  const showCreatePr = branchMatchesIssue(currentBranch, issue.number)

  const handleSubmitComment = useCallback(() => {
    const trimmed = commentBody.trim()
    if (!trimmed || addingComment) return
    onAddComment(trimmed)
    setCommentBody('')
  }, [commentBody, addingComment, onAddComment])

  const handleAssignToClaude = useCallback(async () => {
    if (assigning) return
    setAssigning(true)
    setAssignError(null)

    const branchName = issueBranchName(issue.number, issue.title, issue.labels)

    try {
      // Check if branch exists first, create or checkout accordingly
      const branches = await window.api.gitBranches(rootPath)
      if (branches.includes(branchName)) {
        await window.api.gitCheckout(rootPath, branchName)
      } else {
        await window.api.gitCreateBranch(rootPath, branchName)
      }

      const command = claudeIssueCommand(issue.number)
      onAssignToClaude(`#${issue.number}: ${issue.title}`, command)
      onClose()
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : String(err))
      setAssigning(false)
    }
  }, [assigning, issue, rootPath, onAssignToClaude, onClose])

  const handleCreatePr = useCallback(async () => {
    if (creatingPr) return
    setCreatingPr(true)
    setAssignError(null)

    try {
      const title = issuePrTitle(issue.number, issue.title, issue.labels)
      const body = `Closes #${issue.number}`
      const result = await window.api.ghCreatePr(rootPath, title, body)
      setPrUrl(result.url)
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreatingPr(false)
    }
  }, [creatingPr, issue, rootPath])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const isOpen = issue.state === 'OPEN'
  const displayError = assignError || error

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Dialog */}
      <div
        className="relative w-[90%] max-w-2xl max-h-[80vh] flex flex-col rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border-strong)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-[var(--color-border)] space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="mono text-[12px] text-[var(--color-text-muted)]">#{issue.number}</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] mono leading-none ${
                isOpen
                  ? 'bg-[#238636]/20 text-[#3fb950]'
                  : 'bg-[#8957e5]/20 text-[#bc8cff]'
              }`}
            >
              {isOpen ? 'Open' : 'Closed'}
            </span>
            <div className="ml-auto flex items-center gap-1">
              {showCreatePr && !prUrl && (
                <>
                  <button
                    onClick={handleCreatePr}
                    disabled={creatingPr}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#3fb950] hover:bg-[#3fb950]/10 transition-colors duration-150 disabled:opacity-50"
                    title="Push branch and create pull request"
                  >
                    {creatingPr ? <Loader2 size={13} className="animate-spin" /> : <GitPullRequest size={13} />}
                    Create PR
                  </button>
                  <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
                </>
              )}
              {prUrl && (
                <>
                  <button
                    onClick={() => window.open(prUrl, '_blank')}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#3fb950] hover:bg-[#3fb950]/10 transition-colors duration-150"
                    title="Open pull request"
                  >
                    <GitPullRequest size={13} />
                    PR created
                  </button>
                  <div className="w-px h-4 bg-[var(--color-border)] mx-0.5" />
                </>
              )}
              <button
                onClick={handleAssignToClaude}
                disabled={assigning}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#c9956b] hover:bg-[#c9956b]/10 transition-colors duration-150 disabled:opacity-50"
                title="Create branch and open Claude Code"
              >
                {assigning ? <Loader2 size={13} className="animate-spin" /> : <Bot size={13} />}
                Assign to Claude
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
                onClick={() => window.open(issue.url, '_blank')}
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
            {issue.title}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
            <span>by <span className="text-[var(--color-text-secondary)]">{issue.author}</span></span>
            {issue.assignees.length > 0 && (
              <span>assigned to <span className="text-[var(--color-text-secondary)]">{issue.assignees.join(', ')}</span></span>
            )}
            {issue.milestone && (
              <span className="mono">{issue.milestone}</span>
            )}
          </div>

          {/* Labels */}
          <div className="flex flex-wrap items-center gap-1.5">
            <LabelBadges
              labels={issue.labels}
              onRemove={isOpen ? (name) => onEditLabels([], [name]) : undefined}
            />
            {isOpen && (
              <LabelPicker
                repoLabels={repoLabels}
                selected={issue.labels.map((l) => l.name)}
                loading={loadingLabels}
                onToggle={(name) => {
                  const has = issue.labels.some((l) => l.name === name)
                  onEditLabels(has ? [] : [name], has ? [name] : [])
                }}
                onOpen={onFetchLabels}
              />
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingDetail ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw size={16} className="animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : (
            <>
              {/* Body */}
              {issue.body && (
                <div className="px-5 py-4 border-b border-[var(--color-border)]">
                  <div className="text-[13px] text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                    {issue.body}
                  </div>
                </div>
              )}

              {/* Comments */}
              {issue.comments.length > 0 && (
                <div>
                  <div className="px-5 pt-4 pb-2">
                    <span className="text-[10px] mono text-[var(--color-text-muted)] uppercase tracking-wider">
                      Comments ({issue.comments.length})
                    </span>
                  </div>
                  {issue.comments.map((comment) => (
                    <IssueComment key={comment.id} comment={comment} />
                  ))}
                </div>
              )}

              {issue.comments.length === 0 && !issue.body && (
                <div className="flex items-center justify-center h-24 text-xs text-[var(--color-text-muted)]">
                  No description or comments
                </div>
              )}
            </>
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
        {displayError && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-[11px] rounded-b-lg border-t border-[var(--color-border)]">
            <AlertCircle size={12} className="shrink-0" />
            <span className="truncate">{displayError}</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
