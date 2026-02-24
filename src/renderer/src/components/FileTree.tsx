import { useState, useEffect, useCallback } from 'react'
import { Folder, FolderOpen, FileText, FileCode2, FileJson, FileImage, ChevronRight, ChevronDown } from 'lucide-react'
import { DirEntry } from '../../../shared/types'
import { useEditorStore } from '../stores/editor-store'

const FILE_ICON_MAP: Record<string, typeof FileText> = {
  ts: FileCode2,
  tsx: FileCode2,
  js: FileCode2,
  jsx: FileCode2,
  json: FileJson,
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  svg: FileImage,
  gif: FileImage,
  ico: FileImage
}

function getFileIcon(name: string): typeof FileText {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return FILE_ICON_MAP[ext] || FileText
}

interface TreeNodeProps {
  name: string
  path: string
  isDirectory: boolean
  depth: number
}

function TreeNode({ name, path, isDirectory, depth }: TreeNodeProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<DirEntry[] | null>(null)
  const [loading, setLoading] = useState(false)
  const { openFile, activeFilePath } = useEditorStore()

  const toggle = useCallback(async () => {
    if (!isDirectory) {
      openFile(path)
      return
    }

    if (expanded) {
      setExpanded(false)
      return
    }

    if (children === null) {
      setLoading(true)
      const entries = await window.api.readDir(path)
      setChildren(entries)
      setLoading(false)
    }
    setExpanded(true)
  }, [isDirectory, expanded, children, path, openFile])

  const isActive = !isDirectory && activeFilePath === path

  const Icon = isDirectory
    ? (expanded ? FolderOpen : Folder)
    : getFileIcon(name)

  return (
    <div>
      <button
        onClick={toggle}
        className={`flex items-center gap-1.5 w-full text-left py-[3px] pr-2 text-sm hover:bg-[var(--color-bg-hover)] transition-colors duration-100 ${
          isActive
            ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
            : 'text-[var(--color-text-secondary)]'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isDirectory && (
          <span className="text-[var(--color-text-muted)] shrink-0">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        )}
        {!isDirectory && <span className="w-3 shrink-0" />}
        <Icon
          size={14}
          className={`shrink-0 ${
            isDirectory
              ? 'text-[var(--color-accent)]'
              : 'text-[var(--color-text-muted)]'
          }`}
        />
        <span className="truncate">{name}</span>
      </button>

      {isDirectory && expanded && children && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.name}
              name={child.name}
              path={`${path}/${child.name}`}
              isDirectory={child.isDirectory}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {isDirectory && expanded && loading && (
        <div
          className="py-1 text-xs text-[var(--color-text-muted)]"
          style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
        >
          Loading...
        </div>
      )}
    </div>
  )
}

interface FileTreeProps {
  rootPath: string
}

export function FileTree({ rootPath }: FileTreeProps): React.JSX.Element {
  const [entries, setEntries] = useState<DirEntry[]>([])

  useEffect(() => {
    window.api.readDir(rootPath).then(setEntries)
  }, [rootPath])

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden select-none">
      {entries.map((entry) => (
        <TreeNode
          key={entry.name}
          name={entry.name}
          path={`${rootPath}/${entry.name}`}
          isDirectory={entry.isDirectory}
          depth={0}
        />
      ))}
    </div>
  )
}
