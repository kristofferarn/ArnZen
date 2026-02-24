import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import {
  Project,
  Task,
  TaskStatus,
  TaskPriority,
  TodoViewMode,
  TerminalInstanceState,
  MosaicLayoutNode,
  DEFAULT_WIDGET_STATE,
  DEFAULT_LAYOUT,
  DEFAULT_PROJECT_SETTINGS,
  DEV_SERVER_SUFFIX,
  PROJECT_COLORS,
  getMosaicLeaves,
  removeMosaicLeaf,
  addMosaicLeaf
} from '../../../shared/types'
import { widgetRegistry, getBaseType, getInstanceSuffix } from './widget-registry'

interface AddPanelOptions {
  label?: string
  initialCommand?: string
}

interface WorkspaceState {
  projects: Project[]
  activeProjectId: string | null

  // Project actions
  addProject: (name: string, rootPath: string) => void
  removeProject: (id: string) => void
  setActiveProject: (id: string) => void
  updateProjectColor: (id: string, color: string) => void

  // Widget layout
  addPanel: (widgetId: string, options?: AddPanelOptions) => void
  removePanel: (panelId: string) => void
  minimizePanel: (panelId: string) => void
  restorePanel: (panelId: string) => void
  updateMosaicLayout: (node: MosaicLayoutNode<string> | null) => void
  updateTerminalLabel: (instanceSuffix: string, label: string) => void

  // Dev server
  updateDevCommand: (command: string) => void

  // Task actions
  addTask: (title: string, description?: string, priority?: TaskPriority) => void
  updateTask: (
    taskId: string,
    updates: Partial<Pick<Task, 'title' | 'description' | 'status' | 'priority'>>
  ) => void
  removeTask: (taskId: string) => void
  moveTaskToStatus: (taskId: string, newStatus: TaskStatus, insertIndex?: number) => void
  clearDoneTasks: () => void
  setTodoViewMode: (mode: TodoViewMode) => void

  // Notes
  updateNotes: (notes: string) => void

  // Persistence
  loadProjects: (projects: Project[]) => void
  setActiveProjectId: (id: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  projects: [],
  activeProjectId: null,

  addProject: (name, rootPath) => {
    const colorIndex = get().projects.length % PROJECT_COLORS.length
    const project: Project = {
      id: uuid(),
      name,
      color: PROJECT_COLORS[colorIndex],
      rootPath,
      settings: { ...DEFAULT_PROJECT_SETTINGS },
      widgetState: { ...DEFAULT_WIDGET_STATE, terminalCwd: rootPath },
      layout: { ...DEFAULT_LAYOUT }
    }
    set((s) => ({
      projects: [...s.projects, project],
      activeProjectId: project.id
    }))
  },

  removeProject: (id) => {
    // Kill all terminal PTY sessions for this project (including background dev server)
    const project = get().projects.find((p) => p.id === id)
    if (project) {
      for (const suffix of Object.keys(project.widgetState.terminals)) {
        window.api.terminalKill(`${project.id}:${suffix}`)
      }
      window.api.terminalKill(`${project.id}:${DEV_SERVER_SUFFIX}`)
    }

    set((s) => {
      const projects = s.projects.filter((p) => p.id !== id)
      const activeProjectId =
        s.activeProjectId === id ? (projects[0]?.id ?? null) : s.activeProjectId
      return { projects, activeProjectId }
    })
  },

  setActiveProject: (id) => set({ activeProjectId: id }),

  updateProjectColor: (id, color) => {
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, color } : p))
    }))
  },

  addPanel: (widgetId, options) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return

    const widgetDef = widgetRegistry.find((w) => w.id === widgetId)
    if (!widgetDef) return

    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== activeProjectId) return p

        let panelId: string
        let newWidgetState = p.widgetState
        const existingLeaves = getMosaicLeaves(p.layout.mosaic)

        if (widgetDef.allowMultiple) {
          const instanceSuffix = uuid().substring(0, 8)
          panelId = `${widgetId}:${instanceSuffix}`

          if (widgetId === 'terminal') {
            const terminalState: TerminalInstanceState = {
              label:
                options?.label ||
                `Terminal ${Object.keys(p.widgetState.terminals).length + 1}`,
              cwd: p.rootPath,
              initialCommand: options?.initialCommand
            }
            newWidgetState = {
              ...p.widgetState,
              terminals: { ...p.widgetState.terminals, [instanceSuffix]: terminalState }
            }
          }
        } else {
          panelId = widgetId
          if (
            existingLeaves.some((pid) => getBaseType(pid) === widgetId) ||
            p.layout.minimized.some((pid) => getBaseType(pid) === widgetId)
          )
            return p
        }

        return {
          ...p,
          widgetState: newWidgetState,
          layout: {
            ...p.layout,
            mosaic: addMosaicLeaf(p.layout.mosaic, panelId)
          }
        }
      })
    }))
  },

  removePanel: (panelId) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return

    // Kill PTY for terminal instances
    const baseType = getBaseType(panelId)
    const suffix = getInstanceSuffix(panelId)
    if (baseType === 'terminal' && suffix) {
      const project = get().projects.find((p) => p.id === activeProjectId)
      if (project) {
        window.api.terminalKill(`${project.id}:${suffix}`)
      }
    }

    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== activeProjectId) return p
        if (p.layout.mosaic === null) return p

        let newWidgetState = p.widgetState
        if (baseType === 'terminal' && suffix) {
          const { [suffix]: _, ...remainingTerminals } = p.widgetState.terminals
          newWidgetState = { ...p.widgetState, terminals: remainingTerminals }
        }

        return {
          ...p,
          widgetState: newWidgetState,
          layout: {
            ...p.layout,
            mosaic: removeMosaicLeaf(p.layout.mosaic, panelId)
          }
        }
      })
    }))
  },

  minimizePanel: (panelId) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== activeProjectId) return p
        if (p.layout.mosaic === null) return p
        return {
          ...p,
          layout: {
            mosaic: removeMosaicLeaf(p.layout.mosaic, panelId),
            minimized: [...p.layout.minimized, panelId]
          }
        }
      })
    }))
  },

  restorePanel: (panelId) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== activeProjectId) return p
        if (!p.layout.minimized.includes(panelId)) return p
        return {
          ...p,
          layout: {
            mosaic: addMosaicLeaf(p.layout.mosaic, panelId),
            minimized: p.layout.minimized.filter((id) => id !== panelId)
          }
        }
      })
    }))
  },

  updateMosaicLayout: (node) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === activeProjectId ? { ...p, layout: { ...p.layout, mosaic: node } } : p
      )
    }))
  },

  updateTerminalLabel: (instanceSuffix, label) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== activeProjectId) return p
        const existing = p.widgetState.terminals[instanceSuffix]
        if (!existing) return p
        return {
          ...p,
          widgetState: {
            ...p.widgetState,
            terminals: {
              ...p.widgetState.terminals,
              [instanceSuffix]: { ...existing, label }
            }
          }
        }
      })
    }))
  },

  updateDevCommand: (command) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === activeProjectId
          ? { ...p, settings: { ...p.settings, devCommand: command } }
          : p
      )
    }))
  },

  addTask: (title, description = '', priority = 'medium') => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    const now = Date.now()
    const task: Task = {
      id: uuid(),
      title,
      description,
      status: 'todo',
      priority,
      createdAt: now,
      updatedAt: now
    }
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === activeProjectId
          ? { ...p, widgetState: { ...p.widgetState, todos: [...p.widgetState.todos, task] } }
          : p
      )
    }))
  },

  updateTask: (taskId, updates) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === activeProjectId
          ? {
              ...p,
              widgetState: {
                ...p.widgetState,
                todos: p.widgetState.todos.map((t) =>
                  t.id === taskId ? { ...t, ...updates, updatedAt: Date.now() } : t
                )
              }
            }
          : p
      )
    }))
  },

  removeTask: (taskId) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === activeProjectId
          ? {
              ...p,
              widgetState: {
                ...p.widgetState,
                todos: p.widgetState.todos.filter((t) => t.id !== taskId)
              }
            }
          : p
      )
    }))
  },

  moveTaskToStatus: (taskId, newStatus, insertIndex) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== activeProjectId) return p
        const todos = [...p.widgetState.todos]
        const idx = todos.findIndex((t) => t.id === taskId)
        if (idx === -1) return p
        const [task] = todos.splice(idx, 1)
        const updated = { ...task, status: newStatus, updatedAt: Date.now() }
        if (insertIndex !== undefined) {
          let count = 0
          let arrayIdx = 0
          for (; arrayIdx < todos.length; arrayIdx++) {
            if (todos[arrayIdx].status === newStatus) {
              if (count === insertIndex) break
              count++
            }
          }
          todos.splice(arrayIdx, 0, updated)
        } else {
          let lastIdx = -1
          for (let i = todos.length - 1; i >= 0; i--) {
            if (todos[i].status === newStatus) {
              lastIdx = i
              break
            }
          }
          todos.splice(lastIdx + 1, 0, updated)
        }
        return { ...p, widgetState: { ...p.widgetState, todos } }
      })
    }))
  },

  clearDoneTasks: () => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === activeProjectId
          ? {
              ...p,
              widgetState: {
                ...p.widgetState,
                todos: p.widgetState.todos.filter((t) => t.status !== 'done')
              }
            }
          : p
      )
    }))
  },

  setTodoViewMode: (mode) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === activeProjectId
          ? { ...p, widgetState: { ...p.widgetState, todoViewMode: mode } }
          : p
      )
    }))
  },

  updateNotes: (notes) => {
    const { activeProjectId } = get()
    if (!activeProjectId) return
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === activeProjectId
          ? { ...p, widgetState: { ...p.widgetState, notes } }
          : p
      )
    }))
  },

  loadProjects: (projects) => set({ projects }),
  setActiveProjectId: (id) => set({ activeProjectId: id })
}))

// Selectors
export const useActiveProject = (): Project | undefined =>
  useWorkspaceStore((s) => s.projects.find((p) => p.id === s.activeProjectId))
