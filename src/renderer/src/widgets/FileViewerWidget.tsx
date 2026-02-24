import { useState, useEffect, useRef, useCallback } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, WrapText, FileCode2 } from 'lucide-react'
import { useActiveProject, useWorkspaceStore } from '../stores/workspace-store'
import { getInstanceSuffix } from '../stores/widget-registry'
import { FileTree } from '../components/FileTree'
import { getLanguage } from '../lib/monaco-setup'

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

export function FileViewerWidget({ instanceId }: { instanceId?: string }): React.JSX.Element {
  const project = useActiveProject()
  const { updateFileViewerState } = useWorkspaceStore()
  const suffix = instanceId ? getInstanceSuffix(instanceId) : undefined

  // Persisted state
  const viewerState = suffix ? project?.widgetState.fileViewers[suffix] : undefined
  const currentFilePath = viewerState?.currentFilePath ?? null
  const wordWrap = viewerState?.wordWrap ?? false

  // Ephemeral state
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [treeWidth, setTreeWidth] = useState(DEFAULT_TREE_WIDTH)
  const [treeCollapsed, setTreeCollapsed] = useState(false)
  const resizing = useRef(false)
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const watchIdRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set up file watching
  useEffect(() => {
    const watchId = suffix ? `file-viewer:${suffix}` : null
    watchIdRef.current = watchId

    if (!watchId || !currentFilePath) return

    window.api.watchFile(watchId, currentFilePath)

    const cleanup = window.api.onFileChanged((changedWatchId, _filePath) => {
      if (changedWatchId !== watchId) return
      // Debounce reloads
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
    (filePath: string) => {
      if (!suffix) return
      // Push to history
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1)
        return [...trimmed, filePath]
      })
      setHistoryIndex((prev) => prev + 1)
      updateFileViewerState(suffix, { currentFilePath: filePath })
    },
    [suffix, historyIndex, updateFileViewerState]
  )

  const goBack = useCallback(() => {
    if (historyIndex <= 0 || !suffix) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    updateFileViewerState(suffix, { currentFilePath: history[newIndex] })
  }, [historyIndex, history, suffix, updateFileViewerState])

  const goForward = useCallback(() => {
    if (historyIndex >= history.length - 1 || !suffix) return
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    updateFileViewerState(suffix, { currentFilePath: history[newIndex] })
  }, [historyIndex, history, suffix, updateFileViewerState])

  const toggleWordWrap = useCallback(() => {
    if (!suffix) return
    updateFileViewerState(suffix, { wordWrap: !wordWrap })
  }, [suffix, wordWrap, updateFileViewerState])

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

  return (
    <div className="flex h-full min-h-0">
      {/* File tree */}
      {!treeCollapsed && (
        <>
          <div
            className="flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] shrink-0"
            style={{ width: treeWidth }}
          >
            <div className="h-7 flex items-center px-2.5 text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] shrink-0 mono">
              Files
            </div>
            <FileTree
              rootPath={project.rootPath}
              onFileSelect={navigateToFile}
              activeFilePath={currentFilePath}
            />
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

          <button
            onClick={toggleWordWrap}
            className={`p-0.5 rounded transition-colors duration-100 ${
              wordWrap
                ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
            }`}
            title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          >
            <WrapText size={14} />
          </button>
        </div>

        {/* Editor / empty state */}
        <div className="flex-1 min-h-0">
          {!currentFilePath ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-muted)] text-sm">
              <FileCode2 size={28} className="opacity-40" />
              <span>Select a file to view</span>
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
            <Editor
              key={currentFilePath}
              value={content}
              language={getLanguage(currentFilePath)}
              theme="vs-dark"
              onMount={handleEditorMount}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 13,
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                wordWrap: wordWrap ? 'on' : 'off',
                folding: true,
                automaticLayout: true,
                padding: { top: 8 }
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
