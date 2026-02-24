import { useState } from 'react'
import { Plus, Minus, Undo2 } from 'lucide-react'
import { GitFileStatus } from '../../../../shared/types'

const STATUS_COLORS: Record<string, string> = {
  M: '#d4a054',
  A: '#7ab88a',
  D: '#c97070',
  R: '#7ba5b8',
  C: '#7ba5b8',
  '?': '#615c54'
}

function getStatusChar(file: GitFileStatus, group: 'staged' | 'unstaged' | 'untracked'): string {
  if (group === 'untracked') return '?'
  if (group === 'staged') return file.indexStatus
  return file.workTreeStatus
}

export function FileRow({
  file,
  group,
  onStage,
  onUnstage,
  onDiscard
}: {
  file: GitFileStatus
  group: 'staged' | 'unstaged' | 'untracked'
  onStage: (path: string) => void
  onUnstage: (path: string) => void
  onDiscard: (path: string) => void
}): React.JSX.Element {
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const statusChar = getStatusChar(file, group)
  const color = STATUS_COLORS[statusChar] || '#615c54'

  const lastSlash = file.path.lastIndexOf('/')
  const dir = lastSlash !== -1 ? file.path.substring(0, lastSlash + 1) : ''
  const filename = lastSlash !== -1 ? file.path.substring(lastSlash + 1) : file.path

  const handleDiscard = (): void => {
    if (!confirmDiscard) {
      setConfirmDiscard(true)
      setTimeout(() => setConfirmDiscard(false), 3000)
      return
    }
    setConfirmDiscard(false)
    onDiscard(file.path)
  }

  return (
    <div className="group flex items-center h-6 px-2 hover:bg-[var(--color-bg-hover)] text-xs">
      <span
        className="w-4 shrink-0 text-center font-mono font-semibold text-[10px]"
        style={{ color }}
      >
        {statusChar}
      </span>
      <span className="flex-1 truncate ml-1.5">
        {dir && (
          <span className="text-[var(--color-text-muted)]">{dir}</span>
        )}
        <span className="text-[var(--color-text-primary)]">{filename}</span>
      </span>
      <span className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1">
        {group === 'staged' ? (
          <button
            onClick={() => onUnstage(file.path)}
            className="p-0.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            title="Unstage"
          >
            <Minus size={12} />
          </button>
        ) : (
          <>
            <button
              onClick={() => onStage(file.path)}
              className="p-0.5 rounded hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              title="Stage"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={handleDiscard}
              className={`p-0.5 rounded ${
                confirmDiscard
                  ? 'bg-[var(--color-danger-subtle)] text-[var(--color-danger)]'
                  : 'hover:bg-[var(--color-danger-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)]'
              }`}
              title={confirmDiscard ? 'Click again to confirm' : 'Discard changes'}
            >
              <Undo2 size={12} />
            </button>
          </>
        )}
      </span>
    </div>
  )
}
