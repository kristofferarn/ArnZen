import { useEffect, useRef } from 'react'
import Editor, { loader, OnMount } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import { X, FileCode2 } from 'lucide-react'
import { useEditorStore } from '../stores/editor-store'

// Configure Monaco workers locally (Electron CSP blocks CDN scripts)
self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    return new editorWorker()
  }
}

loader.config({ monaco })

const EXT_LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  md: 'markdown',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  svg: 'xml',
  sh: 'shell',
  bash: 'shell',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  sql: 'sql',
  graphql: 'graphql',
  toml: 'ini',
  ini: 'ini',
  env: 'ini',
  dockerfile: 'dockerfile',
  makefile: 'shell'
}

function getLanguage(filePath: string): string {
  const name = filePath.split('/').pop()?.toLowerCase() || ''
  // Handle dotfiles
  if (name === 'dockerfile') return 'dockerfile'
  if (name === 'makefile') return 'shell'
  const ext = name.split('.').pop() || ''
  return EXT_LANGUAGE_MAP[ext] || 'plaintext'
}

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
