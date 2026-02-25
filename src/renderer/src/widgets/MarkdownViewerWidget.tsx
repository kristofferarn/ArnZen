import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Eye,
  Code2,
  Search,
  BookOpen
} from 'lucide-react'
import { useActiveProject, useWorkspaceStore } from '../stores/workspace-store'
import { getInstanceSuffix } from '../stores/widget-registry'

import '../lib/monaco-setup'

const MIN_TREE_WIDTH = 140
const MAX_TREE_WIDTH = 400
const DEFAULT_TREE_WIDTH = 200

function breadcrumbSegments(filePath: string, rootPath: string): string[] {
  const relative = filePath.startsWith(rootPath)
    ? filePath.slice(rootPath.length).replace(/^[\\/]/, '')
    : filePath
  return relative.split(/[\\/]/)
}

export function MarkdownViewerWidget({
  instanceId
}: {
  instanceId?: string
}): React.JSX.Element {
  const project = useActiveProject()
  const { updateMarkdownViewerState } = useWorkspaceStore()
  const suffix = instanceId ? getInstanceSuffix(instanceId) : undefined

  // Persisted state
  const viewerState = suffix ? project?.widgetState.markdownViewers[suffix] : undefined
  const currentFilePath = viewerState?.currentFilePath ?? null
  const viewMode = viewerState?.viewMode ?? 'view'

  // Ephemeral state
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [treeWidth, setTreeWidth] = useState(DEFAULT_TREE_WIDTH)
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  const [mdFiles, setMdFiles] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const resizing = useRef(false)
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const watchIdRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load markdown file list
  useEffect(() => {
    if (!project) return
    window.api.globFiles(project.rootPath, '.md').then(setMdFiles)
  }, [project?.rootPath])

  // Filtered file list
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return mdFiles
    const q = searchQuery.toLowerCase()
    return mdFiles.filter((f) => f.toLowerCase().includes(q))
  }, [mdFiles, searchQuery])

  // Set up file watching
  useEffect(() => {
    const watchId = suffix ? `markdown-viewer:${suffix}` : null
    watchIdRef.current = watchId

    if (!watchId || !currentFilePath) return

    window.api.watchFile(watchId, currentFilePath)

    const cleanup = window.api.onFileChanged((changedWatchId, _filePath) => {
      if (changedWatchId !== watchId) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        loadFileContent(currentFilePath)
      }, 300)
    })

    return () => {
      cleanup()
      window.api.unwatchFile(watchId)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [currentFilePath, suffix])

  // Load file content when currentFilePath changes
  useEffect(() => {
    if (currentFilePath) {
      loadFileContent(currentFilePath)
    } else {
      setContent(null)
      setError(null)
    }
  }, [currentFilePath])

  const loadFileContent = useCallback(async (filePath: string) => {
    setLoading(true)
    setError(null)
    const result = await window.api.readFile(filePath)
    if ('content' in result) {
      setContent(result.content)
      setError(null)
    } else {
      setContent(null)
      setError(result.error)
    }
    setLoading(false)
  }, [])

  const navigateToFile = useCallback(
    (relativePath: string) => {
      if (!suffix || !project) return
      const fullPath = `${project.rootPath}/${relativePath}`
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1)
        return [...trimmed, fullPath]
      })
      setHistoryIndex((prev) => prev + 1)
      updateMarkdownViewerState(suffix, { currentFilePath: fullPath })
    },
    [suffix, project, historyIndex, updateMarkdownViewerState]
  )

  const goBack = useCallback(() => {
    if (historyIndex <= 0 || !suffix) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    updateMarkdownViewerState(suffix, { currentFilePath: history[newIndex] })
  }, [historyIndex, history, suffix, updateMarkdownViewerState])

  const goForward = useCallback(() => {
    if (historyIndex >= history.length - 1 || !suffix) return
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    updateMarkdownViewerState(suffix, { currentFilePath: history[newIndex] })
  }, [historyIndex, history, suffix, updateMarkdownViewerState])

  // Resize handling
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
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
    },
    [treeWidth]
  )

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
        No project selected
      </div>
    )
  }

  // Derive relative path of current file for highlighting
  const currentRelative = currentFilePath?.startsWith(project.rootPath)
    ? currentFilePath.slice(project.rootPath.length).replace(/\\/g, '/').replace(/^\//, '')
    : null

  return (
    <div className="flex h-full min-h-0">
      {/* File list sidebar */}
      {!treeCollapsed && (
        <>
          <div
            className="flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] shrink-0"
            style={{ width: treeWidth }}
          >
            <div className="h-7 flex items-center px-2.5 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] shrink-0 mono">
              Markdown
            </div>

            {/* Search input */}
            <div className="px-1.5 py-1 border-b border-[var(--color-border)] shrink-0">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
                <Search size={12} className="text-[var(--color-text-muted)] shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter files..."
                  className="flex-1 bg-transparent text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none min-w-0"
                />
              </div>
            </div>

            {/* File list */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden select-none">
              {filteredFiles.length === 0 ? (
                <div className="px-2.5 py-3 text-xs text-[var(--color-text-muted)] italic">
                  {mdFiles.length === 0 ? 'No .md files found' : 'No matches'}
                </div>
              ) : (
                filteredFiles.map((relPath) => (
                  <button
                    key={relPath}
                    onClick={() => navigateToFile(relPath)}
                    className={`flex items-center gap-1.5 w-full text-left py-[3px] px-2.5 text-sm hover:bg-[var(--color-bg-hover)] transition-colors duration-100 ${
                      currentRelative === relPath
                        ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-secondary)]'
                    }`}
                    title={relPath}
                  >
                    <span className="truncate">{relPath}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Resize handle */}
          <div
            className="w-1 cursor-col-resize hover:bg-[var(--color-accent)]/30 transition-colors duration-150 shrink-0"
            onMouseDown={handleMouseDown}
          />
        </>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Breadcrumb bar */}
        <div className="flex items-center h-7 px-1.5 gap-1 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] shrink-0">
          <button
            onClick={() => setTreeCollapsed(!treeCollapsed)}
            className="p-0.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] transition-colors duration-100"
            title={treeCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {treeCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
          <button
            onClick={goBack}
            disabled={historyIndex <= 0}
            className="p-0.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] disabled:opacity-30 transition-colors duration-100"
            title="Back"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={goForward}
            disabled={historyIndex >= history.length - 1}
            className="p-0.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] disabled:opacity-30 transition-colors duration-100"
            title="Forward"
          >
            <ChevronRight size={14} />
          </button>

          <div className="flex-1 flex items-center gap-0.5 min-w-0 ml-1 text-xs text-[var(--color-text-muted)] overflow-hidden">
            {currentFilePath && project.rootPath ? (
              breadcrumbSegments(currentFilePath, project.rootPath).map((seg, i, arr) => (
                <span key={i} className="flex items-center gap-0.5 shrink-0">
                  {i > 0 && <span className="text-[var(--color-text-muted)]/50">/</span>}
                  <span
                    className={
                      i === arr.length - 1
                        ? 'text-[var(--color-text-primary)] font-medium'
                        : ''
                    }
                  >
                    {seg}
                  </span>
                </span>
              ))
            ) : (
              <span className="italic">No file selected</span>
            )}
          </div>

          {/* View / Code toggle */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => suffix && updateMarkdownViewerState(suffix, { viewMode: 'view' })}
              className={`p-0.5 rounded transition-colors duration-100 ${
                viewMode === 'view'
                  ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
              }`}
              title="Preview"
            >
              <Eye size={14} />
            </button>
            <button
              onClick={() => suffix && updateMarkdownViewerState(suffix, { viewMode: 'code' })}
              className={`p-0.5 rounded transition-colors duration-100 ${
                viewMode === 'code'
                  ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
              }`}
              title="Source"
            >
              <Code2 size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {!currentFilePath ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-muted)] text-sm">
              <BookOpen size={28} className="opacity-40" />
              <span>Select a markdown file to view</span>
            </div>
          ) : loading && content === null ? (
            <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
              Loading...
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm px-4 text-center">
              {error}
            </div>
          ) : content !== null ? (
            viewMode === 'code' ? (
              <Editor
                key={currentFilePath}
                value={content}
                language="markdown"
                theme="vs-dark"
                onMount={handleEditorMount}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  wordWrap: 'on',
                  folding: true,
                  automaticLayout: true,
                  padding: { top: 8 }
                }}
              />
            ) : (
              <div className="h-full overflow-y-auto p-6">
                <div className="markdown-body max-w-[800px] mx-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                </div>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  )
}
