import { useState, useRef, useEffect, useCallback } from 'react'
import { GitBranch, ChevronDown, X, Check, Download, RefreshCw } from 'lucide-react'
import { useActiveProject } from '../stores/workspace-store'
import { useGitStore, useGitInfo } from '../stores/git-store'

export function GitBranchMenu(): React.JSX.Element {
  const project = useActiveProject()
  const gitInfo = useGitInfo(project?.id)
  const refresh = useGitStore((s) => s.refresh)
  const setError = useGitStore((s) => s.setError)

  const [open, setOpen] = useState(false)
  const [newBranch, setNewBranch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [fetching, setFetching] = useState(false)
  const [pulling, setPulling] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Refresh git info for current project
  const doRefresh = useCallback(() => {
    if (project) refresh(project.id, project.rootPath)
  }, [project?.id, project?.rootPath, refresh])

  // Refresh on project switch
  useEffect(() => {
    doRefresh()
  }, [doRefresh])

  // Polling: 5s normally, 2s when dropdown open; pause on blur, resume on focus
  const branchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!project) return

    const delay = open ? 2000 : 5000

    const startPolling = (): void => {
      if (branchIntervalRef.current) clearInterval(branchIntervalRef.current)
      branchIntervalRef.current = setInterval(doRefresh, delay)
    }

    const stopPolling = (): void => {
      if (branchIntervalRef.current) {
        clearInterval(branchIntervalRef.current)
        branchIntervalRef.current = null
      }
    }

    const handleFocus = (): void => {
      doRefresh()
      startPolling()
    }

    if (document.hasFocus()) startPolling()
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', stopPolling)

    return () => {
      stopPolling()
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', stopPolling)
    }
  }, [project?.id, open, doRefresh])

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirmDelete(null)
        setNewBranch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Auto-clear errors after 5s
  useEffect(() => {
    if (!project || !gitInfo.error) return
    const timeout = setTimeout(() => setError(project.id, null), 5000)
    return () => clearTimeout(timeout)
  }, [gitInfo.error, project?.id, setError])

  const handleCheckout = async (branch: string): Promise<void> => {
    if (!project) return
    try {
      await window.api.gitCheckout(project.rootPath, branch)
      await refresh(project.id, project.rootPath)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Surface a friendlier message for dirty-tree errors
      if (msg.includes('Your local changes') || msg.includes('would be overwritten')) {
        setError(project.id, 'Commit or stash changes first')
      } else {
        setError(project.id, msg)
      }
    }
  }

  const handleCreate = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!project || !newBranch.trim()) return
    try {
      await window.api.gitCreateBranch(project.rootPath, newBranch.trim())
      setNewBranch('')
      await refresh(project.id, project.rootPath)
    } catch (err) {
      setError(project.id, err instanceof Error ? err.message : String(err))
    }
  }

  const handleDelete = async (branch: string): Promise<void> => {
    if (!project) return
    try {
      await window.api.gitDeleteBranch(project.rootPath, branch)
      setConfirmDelete(null)
      await refresh(project.id, project.rootPath)
    } catch (err) {
      setError(project.id, err instanceof Error ? err.message : String(err))
    }
  }

  const handleFetch = async (): Promise<void> => {
    if (!project || fetching) return
    setFetching(true)
    try {
      await window.api.gitFetch(project.rootPath)
      await refresh(project.id, project.rootPath)
    } catch (err) {
      setError(project.id, err instanceof Error ? err.message : String(err))
    } finally {
      setFetching(false)
    }
  }

  const handlePull = async (): Promise<void> => {
    if (!project || pulling) return
    setPulling(true)
    try {
      await window.api.gitPull(project.rootPath)
      await refresh(project.id, project.rootPath)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Your local changes') || msg.includes('would be overwritten')) {
        setError(project.id, 'Commit or stash changes first')
      } else {
        setError(project.id, msg)
      }
    } finally {
      setPulling(false)
    }
  }

  const disabled = !project || !gitInfo.isRepo

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => {
          if (!disabled) {
            setOpen(!open)
            setConfirmDelete(null)
            setNewBranch('')
          }
        }}
        disabled={!project}
        className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md text-sm transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
          disabled
            ? 'text-[var(--color-text-muted)]'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
        }`}
      >
        <GitBranch size={14} />
        {!project || !gitInfo.isRepo ? (
          <span className="text-[var(--color-text-muted)]">No repo</span>
        ) : (
          <>
            <span className={`truncate max-w-[120px] ${gitInfo.detached ? 'mono' : ''}`}>
              {gitInfo.branch || '...'}
            </span>
            {gitInfo.dirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#c9956b] shrink-0" />
            )}
          </>
        )}
        {!disabled && <ChevronDown size={12} className="shrink-0" />}
      </button>

      {open && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-md bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] shadow-lg z-50">
          {/* Branch list header */}
          <div className="mono text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] px-3 pt-2 pb-1">
            Branches
          </div>

          {/* Branch list */}
          <div className="max-h-[200px] overflow-y-auto">
            {gitInfo.branches.map((branch) => {
              const isCurrent = branch === gitInfo.branch && !gitInfo.detached

              if (confirmDelete === branch) {
                return (
                  <div
                    key={branch}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm"
                  >
                    <span className="flex-1 text-[var(--color-text-secondary)] truncate">
                      Delete &quot;{branch}&quot;?
                    </span>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-1.5 py-0.5 rounded text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(branch)}
                      className="px-1.5 py-0.5 rounded text-xs text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                )
              }

              return (
                <div
                  key={branch}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm group hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
                >
                  <span className="w-4 shrink-0 flex justify-center">
                    {isCurrent && <Check size={13} className="text-[var(--color-accent)]" />}
                  </span>
                  <button
                    onClick={() => !isCurrent && handleCheckout(branch)}
                    disabled={isCurrent}
                    className={`flex-1 text-left truncate ${
                      isCurrent
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-secondary)] cursor-pointer'
                    }`}
                  >
                    {branch}
                  </button>
                  {!isCurrent && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete(branch)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--color-danger-subtle)] hover:text-[var(--color-danger)] text-[var(--color-text-muted)] transition-all duration-150"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Fetch / Pull */}
          <div className="border-t border-[var(--color-border)] px-3 py-1.5 flex items-center gap-1">
            <button
              onClick={handleFetch}
              disabled={fetching}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={fetching ? 'animate-spin' : ''} />
              Fetch
            </button>
            <button
              onClick={handlePull}
              disabled={pulling}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-50"
            >
              <Download size={12} className={pulling ? 'animate-bounce' : ''} />
              Pull
            </button>
          </div>

          {/* Create branch */}
          <div className="border-t border-[var(--color-border)] px-3 py-2">
            <form onSubmit={handleCreate} className="flex items-center gap-2">
              <input
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                placeholder="new-branch-name"
                className="min-w-0 flex-1 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded px-2 py-1 text-sm text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]/50 transition-colors mono placeholder:text-[var(--color-text-secondary)]"
              />
              <button
                type="submit"
                disabled={!newBranch.trim()}
                className="px-2.5 py-1 rounded text-xs bg-[var(--color-accent-muted)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-[var(--color-bg-primary)] transition-colors mono shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-accent-muted)] disabled:hover:text-[var(--color-accent)]"
              >
                Create
              </button>
            </form>
          </div>

          {/* Error display */}
          {gitInfo.error && (
            <div className="border-t border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-danger)]">
              {gitInfo.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
