import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { GitHubLabel } from '../../../../shared/types'

interface LabelPickerProps {
  repoLabels: GitHubLabel[]
  selected: string[]
  loading: boolean
  onToggle: (labelName: string) => void
  onOpen: () => void
}

export function LabelPicker({
  repoLabels,
  selected,
  loading,
  onToggle,
  onOpen
}: LabelPickerProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  const handleOpen = (): void => {
    setOpen(!open)
    if (!open) onOpen()
  }

  const filtered = search
    ? repoLabels.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))
    : repoLabels

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] transition-colors duration-150"
      >
        {loading ? <Loader2 size={11} className="animate-spin" /> : <ChevronDown size={11} />}
        Labels
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-56 rounded-md bg-[var(--color-surface-overlay)] border border-[var(--color-border-strong)] shadow-lg z-50">
          <div className="p-1.5">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter labels..."
              className="w-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] text-[11px] px-2 py-1 rounded border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)]/50 transition-colors duration-150 placeholder:text-[var(--color-text-muted)]"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-0.5">
            {loading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-[var(--color-text-muted)]">
                {search ? 'No matching labels' : 'No labels in repo'}
              </div>
            ) : (
              filtered.map((label) => {
                const isSelected = selected.includes(label.name)
                return (
                  <button
                    key={label.name}
                    onClick={() => onToggle(label.name)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--color-bg-hover)] transition-colors"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0 border"
                      style={{
                        backgroundColor: isSelected ? `#${label.color}` : 'transparent',
                        borderColor: `#${label.color}`
                      }}
                    />
                    <span className="text-[11px] text-[var(--color-text-secondary)] truncate">
                      {label.name}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Inline display of selected labels (for create form / detail view) */
export function LabelBadges({
  labels,
  onRemove
}: {
  labels: { name: string; color: string }[]
  onRemove?: (name: string) => void
}): React.JSX.Element | null {
  if (labels.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label.name}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] mono leading-relaxed ${onRemove ? 'cursor-pointer hover:opacity-80' : ''}`}
          style={{
            backgroundColor: `#${label.color}22`,
            color: `#${label.color}`
          }}
          onClick={onRemove ? () => onRemove(label.name) : undefined}
          title={onRemove ? `Remove ${label.name}` : undefined}
        >
          {label.name}
          {onRemove && <span className="ml-1 opacity-60">&times;</span>}
        </span>
      ))}
    </div>
  )
}
