import { useState, useEffect, useRef, useCallback } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import { Plus, X, Edit2, Trash2, Languages } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { useActiveProject, useWorkspaceStore } from '../stores/workspace-store'
import { getInstanceSuffix } from '../stores/widget-registry'
import { ScratchPadTab } from '../../../shared/types'
import '../lib/monaco-setup'

// Available language options for the selector
const LANGUAGE_OPTIONS = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'shell', label: 'Shell' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' }
]

export function ScratchPadWidget({ instanceId }: { instanceId?: string }): React.JSX.Element {
  const project = useActiveProject()
  const { updateScratchPadState } = useWorkspaceStore()
  const suffix = instanceId ? getInstanceSuffix(instanceId) : undefined

  // Persisted state
  const scratchState = suffix ? project?.widgetState.scratchPads[suffix] : undefined
  const tabs = scratchState?.tabs ?? []
  const activeTabId = scratchState?.activeTabId ?? ''

  // Find active tab
  const activeTab = tabs.find((t) => t.id === activeTabId)

  // Local state for responsive UI
  const [localContent, setLocalContent] = useState(activeTab?.content ?? '')
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Sync local content when active tab changes
  useEffect(() => {
    setLocalContent(activeTab?.content ?? '')
  }, [activeTab?.id, activeTab?.content])

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingTabId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingTabId])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleContentChange = useCallback(
    (newContent: string) => {
      if (!suffix) return

      // Update local state immediately for responsive UI
      setLocalContent(newContent)

      // Debounce persistence
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const updatedTabs = tabs.map((tab) =>
          tab.id === activeTabId ? { ...tab, content: newContent } : tab
        )
        updateScratchPadState(suffix, { tabs: updatedTabs })
      }, 500)
    },
    [suffix, tabs, activeTabId, updateScratchPadState]
  )

  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      if (!suffix) return
      const updatedTabs = tabs.map((tab) =>
        tab.id === activeTabId ? { ...tab, language: newLanguage } : tab
      )
      updateScratchPadState(suffix, { tabs: updatedTabs })
    },
    [suffix, tabs, activeTabId, updateScratchPadState]
  )

  const handleTabSwitch = useCallback(
    (tabId: string) => {
      if (!suffix) return
      updateScratchPadState(suffix, { activeTabId: tabId })
    },
    [suffix, updateScratchPadState]
  )

  const handleTabCreate = useCallback(() => {
    if (!suffix) return
    const newTab: ScratchPadTab = {
      id: uuid(),
      name: `Scratch ${tabs.length + 1}`,
      content: '',
      language: 'plaintext'
    }
    const updatedTabs = [...tabs, newTab]
    updateScratchPadState(suffix, { tabs: updatedTabs, activeTabId: newTab.id })
  }, [suffix, tabs, updateScratchPadState])

  const handleTabRename = useCallback(
    (tabId: string, newName: string) => {
      if (!suffix || !newName.trim()) return
      const updatedTabs = tabs.map((tab) =>
        tab.id === tabId ? { ...tab, name: newName.trim() } : tab
      )
      updateScratchPadState(suffix, { tabs: updatedTabs })
      setEditingTabId(null)
    },
    [suffix, tabs, updateScratchPadState]
  )

  const handleTabDelete = useCallback(
    (tabId: string) => {
      if (!suffix || tabs.length <= 1) return

      const tabIndex = tabs.findIndex((t) => t.id === tabId)
      const updatedTabs = tabs.filter((t) => t.id !== tabId)

      // If deleting active tab, switch to adjacent tab
      let newActiveTabId = activeTabId
      if (tabId === activeTabId) {
        const newIndex = Math.max(0, tabIndex - 1)
        newActiveTabId = updatedTabs[newIndex]?.id ?? updatedTabs[0]?.id ?? ''
      }

      updateScratchPadState(suffix, { tabs: updatedTabs, activeTabId: newActiveTabId })
    },
    [suffix, tabs, activeTabId, updateScratchPadState]
  )

  const handleClearContent = useCallback(() => {
    if (!suffix || !activeTab) return

    // Confirm if content exists
    if (activeTab.content.trim()) {
      const confirmed = window.confirm(
        `Clear all content in "${activeTab.name}"? This cannot be undone.`
      )
      if (!confirmed) return
    }

    const updatedTabs = tabs.map((tab) => (tab.id === activeTabId ? { ...tab, content: '' } : tab))
    updateScratchPadState(suffix, { tabs: updatedTabs })
    setLocalContent('')
  }, [suffix, tabs, activeTabId, activeTab, updateScratchPadState])

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  const startEditingTab = useCallback((tabId: string, currentName: string) => {
    setEditingTabId(tabId)
    setEditingName(currentName)
  }, [])

  const cancelEditingTab = useCallback(() => {
    setEditingTabId(null)
    setEditingName('')
  }, [])

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
        No project selected
      </div>
    )
  }

  if (!scratchState || tabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--color-text-muted)] text-sm">
        <span>No tabs available</span>
        <button
          onClick={handleTabCreate}
          className="px-3 py-1.5 rounded bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] transition-colors duration-150"
        >
          Create First Tab
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex items-center h-8 px-1 gap-1 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] shrink-0 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId
          const isEditing = tab.id === editingTabId
          const truncatedName = tab.name.length > 20 ? `${tab.name.slice(0, 20)}...` : tab.name

          return (
            <div
              key={tab.id}
              className={`flex items-center gap-1 px-2 h-6 rounded transition-colors duration-100 ${
                isActive
                  ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]'
                  : 'bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]'
              }`}
            >
              {isEditing ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTabRename(tab.id, editingName)
                    } else if (e.key === 'Escape') {
                      cancelEditingTab()
                    }
                  }}
                  onBlur={() => handleTabRename(tab.id, editingName)}
                  className="w-24 px-1 py-0.5 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-accent)]"
                />
              ) : (
                <>
                  <button
                    onClick={() => handleTabSwitch(tab.id)}
                    className="text-xs font-medium"
                    title={tab.name}
                  >
                    {truncatedName}
                  </button>
                  {isActive && (
                    <>
                      <button
                        onClick={() => startEditingTab(tab.id, tab.name)}
                        className="p-0.5 rounded hover:bg-[var(--color-bg-hover)] text-[var(--color-text-muted)] transition-colors duration-100"
                        title="Rename tab"
                      >
                        <Edit2 size={11} />
                      </button>
                      {tabs.length > 1 && (
                        <button
                          onClick={() => handleTabDelete(tab.id)}
                          className="p-0.5 rounded hover:bg-[var(--color-danger-subtle)] hover:text-[var(--color-danger)] transition-colors duration-100"
                          title="Delete tab"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )
        })}
        <button
          onClick={handleTabCreate}
          className="flex items-center justify-center w-6 h-6 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] transition-colors duration-100"
          title="New tab"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center h-7 px-2 gap-2 bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] shrink-0">
        <div className="flex items-center gap-1">
          <Languages size={13} className="text-[var(--color-text-muted)]" />
          <select
            value={activeTab?.language ?? 'plaintext'}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="px-1.5 py-0.5 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-accent)] cursor-pointer"
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1" />

        <button
          onClick={handleClearContent}
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-subtle)] transition-colors duration-150"
          title="Clear content"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        {activeTab ? (
          <Editor
            key={activeTab.id}
            value={localContent}
            onChange={(value) => handleContentChange(value ?? '')}
            language={activeTab.language}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={{
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
          <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
            No active tab
          </div>
        )}
      </div>
    </div>
  )
}
