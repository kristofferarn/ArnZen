import { useEffect, useCallback, useState } from 'react'
import { AlertCircle, Plus, RefreshCw, Search } from 'lucide-react'
import { useActiveProject, useWorkspaceStore } from '../../stores/workspace-store'
import { usePulls, usePullsStore, PRStateFilter } from '../../stores/pulls-store'
import { useGitInfo } from '../../stores/git-store'
import { PRMergeMethod } from '../../../../shared/types'
import { PullRow } from './PullRow'
import { PullCreateForm } from './PullCreateForm'
import { PullDetailView } from './PullDetailView'

const STATE_OPTIONS: { value: PRStateFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'merged', label: 'Merged' },
  { value: 'all', label: 'All' }
]

export function PullsWidget(): React.JSX.Element {
  const project = useActiveProject()
  const pulls = usePulls(project?.id)
  const gitInfo = useGitInfo(project?.id)
  const [showCreate, setShowCreate] = useState(false)

  const projectId = project?.id
  const rootPath = project?.rootPath

  useEffect(() => {
    if (!projectId || !rootPath) return
    const store = usePullsStore.getState()
    store.detectRepo(projectId, rootPath).then(() => {
      store.refresh(projectId, rootPath)
    })
  }, [projectId, rootPath])

  useEffect(() => {
    if (!projectId || !rootPath) return
    usePullsStore.getState().refresh(projectId, rootPath)
  }, [projectId, rootPath, pulls.filter.state])

  const handleRefresh = useCallback(() => {
    if (!projectId || !rootPath) return
    usePullsStore.getState().refresh(projectId, rootPath)
  }, [projectId, rootPath])

  const handleSetState = useCallback(
    (state: PRStateFilter) => {
      if (!projectId) return
      usePullsStore.getState().setFilter(projectId, { state })
    },
    [projectId]
  )

  const handleSearch = useCallback(
    (search: string) => {
      if (!projectId) return
      usePullsStore.getState().setFilter(projectId, { search })
    },
    [projectId]
  )

  const handleCreate = useCallback(
    (title: string, body: string) => {
      if (!projectId || !rootPath) return
      usePullsStore.getState().createPR(projectId, rootPath, title, body).then(() => {
        setShowCreate(false)
      })
    },
    [projectId, rootPath]
  )

  const handleSelectPR = useCallback(
    (prNumber: number) => {
      if (!projectId || !rootPath) return
      usePullsStore.getState().selectPR(projectId, rootPath, prNumber)
    },
    [projectId, rootPath]
  )

  const handleDeselectPR = useCallback(() => {
    if (!projectId) return
    usePullsStore.getState().deselectPR(projectId)
  }, [projectId])

  const handleAddComment = useCallback(
    (body: string) => {
      if (!projectId || !rootPath || !pulls.selectedPR) return
      usePullsStore.getState().addComment(projectId, rootPath, pulls.selectedPR, body)
    },
    [projectId, rootPath, pulls.selectedPR]
  )

  const handleMerge = useCallback(
    (method: PRMergeMethod) => {
      if (!projectId || !rootPath || !pulls.selectedPR) return
      usePullsStore.getState().mergePR(projectId, rootPath, pulls.selectedPR, method)
    },
    [projectId, rootPath, pulls.selectedPR]
  )

  const handleClosePR = useCallback(() => {
    if (!projectId || !rootPath || !pulls.selectedPR) return
    usePullsStore.getState().closePR(projectId, rootPath, pulls.selectedPR)
  }, [projectId, rootPath, pulls.selectedPR])

  const handleRefreshDetail = useCallback(() => {
    if (!projectId || !rootPath || !pulls.selectedPR) return
    usePullsStore.getState().selectPR(projectId, rootPath, pulls.selectedPR)
  }, [projectId, rootPath, pulls.selectedPR])

  const handleReviewWithClaude = useCallback(
    (label: string, initialCommand: string) => {
      useWorkspaceStore.getState().addPanel('terminal', { label, initialCommand })
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

  const searchTerm = pulls.filter.search.toLowerCase()
  const filteredPRs = searchTerm
    ? pulls.prs.filter(
        (pr) =>
          pr.title.toLowerCase().includes(searchTerm) ||
          String(pr.number).includes(searchTerm) ||
          pr.labels.some((l) => l.name.toLowerCase().includes(searchTerm)) ||
          pr.headRefName.toLowerCase().includes(searchTerm) ||
          pr.baseRefName.toLowerCase().includes(searchTerm)
      )
    : pulls.prs

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              type="text"
              value={pulls.filter.search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search pull requests..."
              className="w-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] text-xs pl-8 pr-3 py-1.5 rounded-md border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)]/50 transition-colors duration-150 placeholder:text-[var(--color-text-muted)]"
            />
          </div>
          <button
            onClick={handleRefresh}
            disabled={pulls.loading}
            className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={pulls.loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
            title="New pull request"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {STATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSetState(opt.value)}
              className={`px-2 py-0.5 rounded text-[11px] mono transition-colors duration-150 ${
                pulls.filter.state === opt.value
                  ? 'bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {!pulls.loading && (
            <span className="ml-auto text-[10px] mono text-[var(--color-text-muted)]">
              {filteredPRs.length} PR{filteredPRs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {showCreate && (
        <PullCreateForm
          creating={pulls.creating}
          currentBranch={gitInfo.branch}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {pulls.loading && pulls.prs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw size={16} className="animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : filteredPRs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-1 text-[var(--color-text-muted)]">
            <span className="text-xs">
              {searchTerm ? 'No matching pull requests' : 'No pull requests found'}
            </span>
          </div>
        ) : (
          filteredPRs.map((pr) => (
            <PullRow
              key={pr.number}
              pr={pr}
              onClick={() => handleSelectPR(pr.number)}
            />
          ))
        )}
      </div>

      {pulls.error && !pulls.selectedPR && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-[10px] border-t border-[var(--color-border)]">
          <AlertCircle size={12} className="shrink-0" />
          <span className="truncate">{pulls.error}</span>
        </div>
      )}

      {pulls.selectedPR !== null && pulls.prDetail && (
        <PullDetailView
          pr={pulls.prDetail}
          loadingDetail={pulls.loadingDetail}
          addingComment={pulls.addingComment}
          merging={pulls.merging}
          error={pulls.error}
          onClose={handleDeselectPR}
          onAddComment={handleAddComment}
          onRefresh={handleRefreshDetail}
          onMerge={handleMerge}
          onClosePR={handleClosePR}
          onReviewWithClaude={handleReviewWithClaude}
        />
      )}
    </div>
  )
}
