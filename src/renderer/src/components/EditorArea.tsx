import { useEffect, useRef, useState, useCallback } from 'react'
import { useActiveProject, useWorkspaceStore } from '../stores/workspace-store'
import { useEditorStore } from '../stores/editor-store'
import { FileTree } from './FileTree'
import { FileViewer } from './FileViewer'

const MIN_TREE_WIDTH = 160
const MAX_TREE_WIDTH = 500
const DEFAULT_TREE_WIDTH = 250

export function EditorArea(): React.JSX.Element {
  const project = useActiveProject()
  const { updateEditorState } = useWorkspaceStore()
  const { openFiles, activeFilePath, openFile, hydrate, clear } = useEditorStore()
  const [treeWidth, setTreeWidth] = useState(DEFAULT_TREE_WIDTH)
  const resizing = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Hydrate editor state from project on mount or project switch
  const lastProjectId = useRef<string | null>(null)
  useEffect(() => {
    if (!project) {
      clear()
      lastProjectId.current = null
      return
    }
    if (project.id !== lastProjectId.current) {
      lastProjectId.current = project.id
      const editorOpenFiles = project.widgetState.editorOpenFiles ?? []
      const editorActiveFile = project.widgetState.editorActiveFile ?? null
      if (editorOpenFiles.length > 0) {
        hydrate(editorOpenFiles, editorActiveFile)
      } else {
        clear()
      }
    }
  }, [project?.id])

  // Sync editor state back to workspace store for persistence
  useEffect(() => {
    if (!project) return
    const paths = openFiles.map((f) => f.path)
    updateEditorState(paths, activeFilePath)
  }, [openFiles, activeFilePath])

  // Resize handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    resizing.current = true

    const startX = e.clientX
    const startWidth = treeWidth

    const handleMouseMove = (moveEvent: MouseEvent): void => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.min(MAX_TREE_WIDTH, Math.max(MIN_TREE_WIDTH, startWidth + delta))
      setTreeWidth(newWidth)
    }

    const handleMouseUp = (): void => {
      resizing.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [treeWidth])

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
        No project selected
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 flex min-h-0">
      {/* File tree */}
      <div
        className="flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] shrink-0"
        style={{ width: treeWidth }}
      >
        <div className="h-8 flex items-center px-3 text-xs text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] shrink-0 mono">
          Explorer
        </div>
        <FileTree rootPath={project.rootPath} onFileSelect={openFile} activeFilePath={activeFilePath} />
      </div>

      {/* Resize handle */}
      <div
        className="w-1 cursor-col-resize hover:bg-[var(--color-accent)]/30 transition-colors duration-150 shrink-0"
        onMouseDown={handleMouseDown}
      />

      {/* File viewer */}
      <FileViewer />
    </div>
  )
}
