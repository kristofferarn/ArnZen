import { create } from 'zustand'

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || filePath
}

interface OpenFile {
  path: string
  name: string
}

interface EditorState {
  openFiles: OpenFile[]
  activeFilePath: string | null
  fileContents: Map<string, string>

  openFile: (filePath: string) => Promise<void>
  closeFile: (filePath: string) => void
  setActiveFile: (filePath: string) => void
  hydrate: (openFiles: string[], activeFile: string | null) => void
  clear: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  openFiles: [],
  activeFilePath: null,
  fileContents: new Map(),

  openFile: async (filePath: string) => {
    const { openFiles, fileContents } = get()

    // If already open, just activate
    if (openFiles.some((f) => f.path === filePath)) {
      set({ activeFilePath: filePath })
      return
    }

    // Fetch content via IPC
    const result = await window.api.readFile(filePath)
    const newContents = new Map(fileContents)
    if ('content' in result) {
      newContents.set(filePath, result.content)
    } else {
      newContents.set(filePath, `// ${result.error}`)
    }

    set({
      openFiles: [...openFiles, { path: filePath, name: basename(filePath) }],
      activeFilePath: filePath,
      fileContents: newContents
    })
  },

  closeFile: (filePath: string) => {
    const { openFiles, activeFilePath, fileContents } = get()
    const filtered = openFiles.filter((f) => f.path !== filePath)
    const newContents = new Map(fileContents)
    newContents.delete(filePath)

    let newActive = activeFilePath
    if (activeFilePath === filePath) {
      // Activate the next tab, or the previous one, or null
      const closedIndex = openFiles.findIndex((f) => f.path === filePath)
      if (filtered.length > 0) {
        const nextIndex = Math.min(closedIndex, filtered.length - 1)
        newActive = filtered[nextIndex].path
      } else {
        newActive = null
      }
    }

    set({ openFiles: filtered, activeFilePath: newActive, fileContents: newContents })
  },

  setActiveFile: (filePath: string) => {
    set({ activeFilePath: filePath })
  },

  hydrate: (openFilePaths: string[], activeFile: string | null) => {
    // Restore tabs from persisted state — content will be fetched on demand
    const openFiles: OpenFile[] = openFilePaths.map((p) => ({
      path: p,
      name: basename(p)
    }))
    set({ openFiles, activeFilePath: activeFile, fileContents: new Map() })

    // Fetch content for the active file immediately
    if (activeFile) {
      get().openFile(activeFile)
    }
  },

  clear: () => {
    set({ openFiles: [], activeFilePath: null, fileContents: new Map() })
  }
}))
