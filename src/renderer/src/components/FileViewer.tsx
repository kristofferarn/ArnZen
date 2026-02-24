import { useEffect, useRef } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import { X, FileCode2 } from 'lucide-react'
import { useEditorStore } from '../stores/editor-store'
import { getLanguage } from '../lib/monaco-setup'

// Side-effect: configures Monaco workers and loader
import '../lib/monaco-setup'

export function FileViewer(): React.JSX.Element {
  const { openFiles, activeFilePath, fileContents, setActiveFile, closeFile } = useEditorStore()
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)

  const activeContent = activeFilePath ? fileContents.get(activeFilePath) : undefined

  // Fetch content for the active tab if not yet loaded
  useEffect(() => {
    if (activeFilePath && activeContent === undefined) {
      useEditorStore.getState().openFile(activeFilePath)
    }
  }, [activeFilePath, activeContent])

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  if (openFiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)] text-sm">
        <div className="flex flex-col items-center gap-2">
          <FileCode2 size={32} className="opacity-40" />
          <span>Select a file to view</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Tab bar */}
      <div className="flex items-center h-8 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] overflow-x-auto">
        {openFiles.map((file) => (
          <div
            key={file.path}
            className={`group flex items-center gap-1.5 px-3 h-full text-xs border-r border-[var(--color-border)] cursor-pointer shrink-0 transition-colors duration-100 ${
              file.path === activeFilePath
                ? 'bg-[var(--color-bg-deep)] text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]'
            }`}
            onClick={() => setActiveFile(file.path)}
          >
            <span className="truncate max-w-[120px]">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeFile(file.path)
              }}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--color-bg-tertiary)] transition-opacity duration-100"
            >
              <X size={11} />
            </button>
          </div>
        ))}
      </div>

      {/* Monaco editor */}
      <div className="flex-1 min-h-0">
        {activeContent !== undefined ? (
          <Editor
            key={activeFilePath}
            value={activeContent}
            language={activeFilePath ? getLanguage(activeFilePath) : 'plaintext'}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              wordWrap: 'off',
              folding: true,
              automaticLayout: true,
              padding: { top: 8 }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
            Loading...
          </div>
        )}
      </div>
    </div>
  )
}
