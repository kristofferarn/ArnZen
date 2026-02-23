// ── Task types ──

export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TodoViewMode = 'list' | 'kanban'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  createdAt: number
  updatedAt: number
}

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done']

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string }> = {
  todo: { label: 'To Do', color: '#9ba1b0' },
  'in-progress': { label: 'In Progress', color: '#f59e0b' },
  done: { label: 'Done', color: '#34d399' }
}

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#5c6275' },
  medium: { label: 'Medium', color: '#6366f1' },
  high: { label: 'High', color: '#f87171' }
}

// ── Terminal types ──

export interface TerminalInstanceState {
  label: string
  cwd: string
  initialCommand?: string
}

// ── Widget state ──

export interface WidgetState {
  todos: Task[]
  todoViewMode: TodoViewMode
  terminalCwd: string
  terminals: Record<string, TerminalInstanceState>
  notes: string
}

export interface WidgetLayout {
  panels: string[]
  sizes: number[]
  minimized: string[]
}

export interface Project {
  id: string
  name: string
  color: string
  rootPath: string
  settings: ProjectSettings
  widgetState: WidgetState
  layout: WidgetLayout
}

export interface ProjectSettings {
  devCommand: string
}

export interface GlobalConfig {
  projectPaths: string[]
  lastActiveProjectId: string | null
}

export interface WorkspaceConfig {
  project: Omit<Project, 'rootPath'>
}

export const DEFAULT_WIDGET_STATE: WidgetState = {
  todos: [],
  todoViewMode: 'list',
  terminalCwd: '',
  terminals: {},
  notes: ''
}

export const DEFAULT_LAYOUT: WidgetLayout = {
  panels: [],
  sizes: [],
  minimized: []
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  devCommand: 'npm run dev'
}

export const DEV_SERVER_SUFFIX = 'devserver'
export const DEV_SERVER_PANEL_ID = `terminal:${DEV_SERVER_SUFFIX}`

export const PROJECT_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4' // cyan
]
