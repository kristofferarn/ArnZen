import { useEffect, useCallback, useState } from 'react'
import { AlertCircle, Plus, RefreshCw, Search } from 'lucide-react'
import { useActiveProject, useWorkspaceStore } from '../../stores/workspace-store'
import { useGitInfo } from '../../stores/git-store'
import { useIssues, useIssuesStore, IssueStateFilter } from '../../stores/issues-store'
import { terminalPresets } from '../../stores/widget-registry'
import { IssueRow } from './IssueRow'
import { IssueCreateForm } from './IssueCreateForm'
import { IssueDetailView, branchMatchesIssue } from './IssueDetailView'

const STATE_OPTIONS: { value: IssueStateFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' }
]

export function IssuesWidget(): React.JSX.Element {
  const project = useActiveProject()
  const issues = useIssues(project?.id)
  const gitInfo = useGitInfo(project?.id)
  const [showCreate, setShowCreate] = useState(false)

  const projectId = project?.id
  const rootPath = project?.rootPath

  // Detect repo + initial fetch on mount
  useEffect(() => {
    if (!projectId || !rootPath) return
    const store = useIssuesStore.getState()
    store.detectRepo(projectId, rootPath).then(() => {
      store.refresh(projectId, rootPath)
    })
  }, [projectId, rootPath])

  // Re-fetch when state filter changes
  useEffect(() => {
    if (!projectId || !rootPath) return
    useIssuesStore.getState().refresh(projectId, rootPath)
  }, [projectId, rootPath, issues.filter.state])

  const handleRefresh = useCallback(() => {
    if (!projectId || !rootPath) return
    useIssuesStore.getState().refresh(projectId, rootPath)
  }, [projectId, rootPath])

  const handleSetState = useCallback(
    (state: IssueStateFilter) => {
      if (!projectId) return
      useIssuesStore.getState().setFilter(projectId, { state })
    },
    [projectId]
  )

  const handleSearch = useCallback(
    (search: string) => {
      if (!projectId) return
      useIssuesStore.getState().setFilter(projectId, { search })
    },
    [projectId]
  )

  const handleCreate = useCallback(
    (title: string, body: string) => {
      if (!projectId || !rootPath) return
      useIssuesStore.getState().createIssue(projectId, rootPath, title, body).then(() => {
        setShowCreate(false)
      })
    },
    [projectId, rootPath]
  )

  const handleSelectIssue = useCallback(
    (issueNumber: number) => {
      if (!projectId || !rootPath) return
      useIssuesStore.getState().selectIssue(projectId, rootPath, issueNumber)
    },
    [projectId, rootPath]
  )

  const handleDeselectIssue = useCallback(() => {
    if (!projectId) return
    useIssuesStore.getState().deselectIssue(projectId)
  }, [projectId])

  const handleAddComment = useCallback(
    (body: string) => {
      if (!projectId || !rootPath || !issues.selectedIssue) return
      useIssuesStore.getState().addComment(projectId, rootPath, issues.selectedIssue, body)
    },
    [projectId, rootPath, issues.selectedIssue]
  )

  const handleRefreshDetail = useCallback(() => {
    if (!projectId || !rootPath || !issues.selectedIssue) return
    useIssuesStore.getState().selectIssue(projectId, rootPath, issues.selectedIssue)
  }, [projectId, rootPath, issues.selectedIssue])

  const handleAssignToClaude = useCallback(
    (label: string, initialCommand: string) => {
      const preset = terminalPresets.find((p) => p.label === 'Claude Code')
      useWorkspaceStore.getState().addPanel('terminal', {
        label,
        initialCommand,
        color: preset?.color,
        labelLocked: true
      })
    },
    []
  )

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
        No project open
      </div>
    )
  }

  // Client-side search filtering
  const searchTerm = issues.filter.search.toLowerCase()
  const filteredIssues = searchTerm
    ? issues.issues.filter(
        (i) =>
          i.title.toLowerCase().includes(searchTerm) ||
          String(i.number).includes(searchTerm) ||
          i.labels.some((l) => l.name.toLowerCase().includes(searchTerm))
      )
    : issues.issues

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-[var(--color-border)]">
        {/* Search + actions row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="text"
              value={issues.filter.search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search issues..."
              className="w-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] text-xs pl-8 pr-3 py-1.5 rounded-md border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)]/50 transition-colors duration-150 placeholder:text-[var(--color-text-muted)]"
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={issues.loading}
            className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={issues.loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
            title="New issue"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* State filter tabs */}
        <div className="flex items-center gap-1">
          {STATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSetState(opt.value)}
              className={`px-2 py-0.5 rounded text-[11px] mono transition-colors duration-150 ${
                issues.filter.state === opt.value
                  ? 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {!issues.loading && (
            <span className="ml-auto text-[10px] mono text-[var(--color-text-muted)]">
              {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <IssueCreateForm
          creating={issues.creating}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Issue list */}
      <div className="flex-1 overflow-y-auto">
        {issues.loading && issues.issues.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw size={16} className="animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1 text-[var(--color-text-muted)]">
            <span className="text-xs">
              {searchTerm ? 'No matching issues' : 'No issues found'}
            </span>
          </div>
        ) : (
          filteredIssues.map((issue) => (
            <IssueRow
              key={issue.number}
              issue={issue}
              active={branchMatchesIssue(gitInfo.branch, issue.number)}
              onClick={() => handleSelectIssue(issue.number)}
            />
          ))
        )}
      </div>

      {/* Error bar */}
      {issues.error && !issues.selectedIssue && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-[10px] border-t border-[var(--color-border)]">
          <AlertCircle size={12} className="shrink-0" />
          <span className="truncate">{issues.error}</span>
        </div>
      )}

      {/* Issue detail modal */}
      {issues.selectedIssue !== null && issues.issueDetail && rootPath && (
        <IssueDetailView
          issue={issues.issueDetail}
          loadingDetail={issues.loadingDetail}
          addingComment={issues.addingComment}
          error={issues.error}
          rootPath={rootPath}
          currentBranch={gitInfo.branch}
          onClose={handleDeselectIssue}
          onAddComment={handleAddComment}
          onRefresh={handleRefreshDetail}
          onAssignToClaude={handleAssignToClaude}
        />
      )}
    </div>
  )
}
