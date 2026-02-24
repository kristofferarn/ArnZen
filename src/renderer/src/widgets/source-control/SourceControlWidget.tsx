import { useEffect, useRef } from 'react'
import { AlertCircle, GitBranch } from 'lucide-react'
import { useActiveProject } from '../../stores/workspace-store'
import { useGitInfo } from '../../stores/git-store'
import { useSourceControl, useSourceControlStore } from '../../stores/source-control-store'
import { CommitSection } from './CommitSection'
import { FileGroup } from './FileGroup'

export function SourceControlWidget(): React.JSX.Element {
  const project = useActiveProject()
  const gitInfo = useGitInfo(project?.id)
  const sc = useSourceControl(project?.id)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const projectId = project?.id
  const rootPath = project?.rootPath
  const isRepo = gitInfo.isRepo

  // Poll every 3s while focused, pause on blur, resume + refresh on focus
  useEffect(() => {
    if (!projectId || !rootPath || !isRepo) return

    const doRefresh = (): void => {
      useSourceControlStore.getState().refresh(projectId, rootPath)
    }

    const startPolling = (): void => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(doRefresh, 3000)
    }

    const stopPolling = (): void => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const handleFocus = (): void => {
      doRefresh()
      startPolling()
    }

    doRefresh()
    if (document.hasFocus()) startPolling()
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', stopPolling)

    return () => {
      stopPolling()
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', stopPolling)
    }
  }, [projectId, rootPath, isRepo])

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-[var(--color-text-muted)]">
        No project open
      </div>
    )
  }

  if (!gitInfo.isRepo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
        <GitBranch size={24} strokeWidth={1.5} />
        <span className="text-xs">Not a git repository</span>
      </div>
    )
  }

  const { staged, unstaged, untracked } = sc.files
  const totalChanges = staged.length + unstaged.length + untracked.length

  const actions = useSourceControlStore.getState
  const handleStage = (path: string): void => {
    actions().stage(project.id, project.rootPath, [path])
  }
  const handleUnstage = (path: string): void => {
    actions().unstage(project.id, project.rootPath, [path])
  }
  const handleDiscard = (path: string): void => {
    actions().discard(project.id, project.rootPath, [path])
  }

  return (
    <div className="flex flex-col h-full">
      <CommitSection
        commitMessage={sc.commitMessage}
        stagedCount={staged.length}
        ahead={sc.ahead}
        committing={sc.committing}
        pushing={sc.pushing}
        onMessageChange={(msg) => actions().setCommitMessage(project.id, msg)}
        onCommit={() => actions().commit(project.id, project.rootPath)}
        onPush={() => actions().push(project.id, project.rootPath)}
      />

      <div className="flex-1 overflow-y-auto">
        {totalChanges === 0 && !sc.loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-1 text-[var(--color-text-muted)]">
            <span className="text-xs">No changes</span>
          </div>
        ) : (
          <>
            <FileGroup
              label="Staged Changes"
              files={staged}
              group="staged"
              onStage={handleStage}
              onUnstage={handleUnstage}
              onDiscard={handleDiscard}
              onUnstageAll={() => actions().unstageAll(project.id, project.rootPath)}
            />
            <FileGroup
              label="Changes"
              files={unstaged}
              group="unstaged"
              onStage={handleStage}
              onUnstage={handleUnstage}
              onDiscard={handleDiscard}
              onStageAll={() => actions().stageAll(project.id, project.rootPath)}
              onDiscardAll={() =>
                actions().discard(project.id, project.rootPath, unstaged.map((f) => f.path))
              }
            />
            <FileGroup
              label="Untracked"
              files={untracked}
              group="untracked"
              onStage={handleStage}
              onUnstage={handleUnstage}
              onDiscard={handleDiscard}
              onStageAll={() =>
                actions().stage(project.id, project.rootPath, untracked.map((f) => f.path))
              }
              onDiscardAll={() =>
                actions().discard(project.id, project.rootPath, untracked.map((f) => f.path))
              }
            />
          </>
        )}
      </div>

      {sc.error && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[var(--color-danger-subtle)] text-[var(--color-danger)] text-[10px] border-t border-[var(--color-border)]">
          <AlertCircle size={12} className="shrink-0" />
          <span className="truncate">{sc.error}</span>
        </div>
      )}
    </div>
  )
}
