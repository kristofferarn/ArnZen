import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Minus, Undo2 } from 'lucide-react'
import { GitFileStatus } from '../../../../shared/types'
import { FileRow } from './FileRow'

export function FileGroup({
  label,
  files,
  group,
  onStage,
  onUnstage,
  onDiscard,
  onStageAll,
  onUnstageAll,
  onDiscardAll
}: {
  label: string
  files: GitFileStatus[]
  group: 'staged' | 'unstaged' | 'untracked'
  onStage: (path: string) => void
  onUnstage: (path: string) => void
  onDiscard: (path: string) => void
  onStageAll?: () => void
  onUnstageAll?: () => void
  onDiscardAll?: () => void
}): React.JSX.Element | null {
  const [expanded, setExpanded] = useState(true)
  const [confirmDiscardAll, setConfirmDiscardAll] = useState(false)

  if (files.length === 0) return null

  const handleDiscardAll = (): void => {
    if (!confirmDiscardAll) {
      setConfirmDiscardAll(true)
      setTimeout(() => setConfirmDiscardAll(false), 3000)
      return
    }
    setConfirmDiscardAll(false)
    onDiscardAll?.()
  }

  return (
    <div>
      <div
        className="group flex items-center h-6 px-2 cursor-pointer hover:bg-[var(--color-bg-hover)] select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-[var(--color-text-muted)] mr-0.5">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] flex-1">
          {label}
        </span>
        <span className="text-[10px] tabular-nums text-[var(--color-text-muted)] mr-1">
          {files.length}
        </span>
        <span
          className="hidden group-hover:flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {group === 'staged' ? (
            onUnstageAll && (
              <button
                onClick={onUnstageAll}
                className="p-0.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                title="Unstage All"
              >
                <Minus size={12} />
              </button>
            )
          ) : (
            <>
              {onStageAll && (
                <button
                  onClick={onStageAll}
                  className="p-0.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  title="Stage All"
                >
                  <Plus size={12} />
                </button>
              )}
              {onDiscardAll && (
                <button
                  onClick={handleDiscardAll}
                  className={`p-0.5 rounded ${
                    confirmDiscardAll
                      ? 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)]'
                      : 'hover:bg-[var(--color-danger-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)]'
                  }`}
                  title={confirmDiscardAll ? 'Click again to confirm' : 'Discard All'}
                >
                  <Undo2 size={12} />
                </button>
              )}
            </>
          )}
        </span>
      </div>
      {expanded && (
        <div>
          {files.map((file) => (
            <FileRow
              key={file.path + group}
              file={file}
              group={group}
              onStage={onStage}
              onUnstage={onUnstage}
              onDiscard={onDiscard}
            />
          ))}
        </div>
      )}
    </div>
  )
}
