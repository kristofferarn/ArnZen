// ── View mode ──

export type ViewMode = 'widgets' | 'editor'

// ── Directory entry (for file tree) ──

export interface DirEntry {
  name: string
  isDirectory: boolean
}

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
  todo: { label: 'To Do', color: '#938e85' },
  'in-progress': { label: 'In Progress', color: '#c9a856' },
  done: { label: 'Done', color: '#7ab88a' }
}

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#615c54' },
  medium: { label: 'Medium', color: '#8088a0' },
  high: { label: 'High', color: '#c97070' }
}

// ── Git types ──

export interface GitStatusResult {
  branch: string
  detached: boolean
  dirty: boolean
}

export interface GitFileStatus {
  path: string
  indexStatus: string
  workTreeStatus: string
  origPath?: string
}

export interface GitStatusDetailResult {
  branch: string
  detached: boolean
  ahead: number
  behind: number
  files: GitFileStatus[]
}

// ── GitHub issue types ──

export interface GitHubIssue {
  number: number
  title: string
  body: string
  state: 'OPEN' | 'CLOSED'
  author: string
  labels: { name: string; color: string }[]
  assignees: string[]
  createdAt: string
  updatedAt: string
  commentsCount: number
  url: string
}

export interface GitHubIssueComment {
  id: number
  author: string
  body: string
  createdAt: string
}

export interface GitHubLabel {
  name: string
  color: string
  description: string
}

// ── GitHub PR types ──

export type PRReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | ''
export type PRMergeableState = 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
export type PRMergeMethod = 'merge' | 'squash' | 'rebase'

export interface PRCheckStatus {
  name: string
  state: string
  conclusion: string
}

export interface GitHubPR {
  number: number
  title: string
  body: string
  state: 'OPEN' | 'CLOSED' | 'MERGED'
  author: string
  labels: { name: string; color: string }[]
  assignees: string[]
  createdAt: string
  updatedAt: string
  commentsCount: number
  url: string
  headRefName: string
  baseRefName: string
  isDraft: boolean
  reviewDecision: PRReviewDecision
  mergeable: PRMergeableState
  checks: PRCheckStatus[]
}

export interface GitHubPRComment {
  id: number
  author: string
  body: string
  createdAt: string
}

export interface GitHubPRDetail extends GitHubPR {
  additions: number
  deletions: number
  changedFiles: number
  commits: number
  milestone: string | null
  reviewRequests: string[]
  comments: GitHubPRComment[]
}

// ── Terminal types ──

export interface TerminalInstanceState {
  label: string
  cwd: string
  initialCommand?: string
  color?: string
  labelLocked?: boolean
}

// ── File viewer types ──

export interface FileViewerInstanceState {
  currentFilePath: string | null
  wordWrap: boolean
}

// ── Markdown viewer types ──

export interface MarkdownViewerInstanceState {
  currentFilePath: string | null
  viewMode: 'view' | 'code'
}

// ── Mosaic layout types (structurally compatible with react-mosaic's MosaicNode) ──

export type MosaicDirection = 'row' | 'column'

export interface MosaicParentNode<T> {
  direction: MosaicDirection
  first: MosaicLayoutNode<T>
  second: MosaicLayoutNode<T>
  splitPercentage?: number
}

export type MosaicLayoutNode<T> = MosaicParentNode<T> | T

// ── Widget state ──

export interface WidgetState {
  todos: Task[]
  todoViewMode: TodoViewMode
  terminalCwd: string
  terminals: Record<string, TerminalInstanceState>
  fileViewers: Record<string, FileViewerInstanceState>
  markdownViewers: Record<string, MarkdownViewerInstanceState>
  notes: string
  viewMode: ViewMode
  editorOpenFiles: string[]
  editorActiveFile: string | null
}

export interface WidgetLayout {
  mosaic: MosaicLayoutNode<string> | null
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
  projects: { id: string; rootPath: string }[]
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
  fileViewers: {},
  markdownViewers: {},
  notes: '',
  viewMode: 'widgets',
  editorOpenFiles: [],
  editorActiveFile: null
}

export const DEFAULT_LAYOUT: WidgetLayout = {
  mosaic: null,
  minimized: []
}

// ── Mosaic tree helpers (usable in both main and renderer) ──

export function isMosaicParent<T>(node: MosaicLayoutNode<T>): node is MosaicParentNode<T> {
  return typeof node === 'object' && node !== null && 'direction' in node
}

export function getMosaicLeaves<T>(node: MosaicLayoutNode<T> | null): T[] {
  if (node === null) return []
  if (!isMosaicParent(node)) return [node]
  return [...getMosaicLeaves(node.first), ...getMosaicLeaves(node.second)]
}

export function removeMosaicLeaf<T>(
  node: MosaicLayoutNode<T>,
  leafId: T
): MosaicLayoutNode<T> | null {
  if (!isMosaicParent(node)) {
    return node === leafId ? null : node
  }
  const first = removeMosaicLeaf(node.first, leafId)
  const second = removeMosaicLeaf(node.second, leafId)
  if (first === null) return second
  if (second === null) return first
  return { ...node, first, second }
}

export function addMosaicLeaf<T>(
  current: MosaicLayoutNode<T> | null,
  newLeaf: T
): MosaicLayoutNode<T> {
  if (current === null) return newLeaf
  const leafCount = getMosaicLeaves(current).length
  return {
    direction: 'row' as MosaicDirection,
    first: current,
    second: newLeaf,
    splitPercentage: (leafCount / (leafCount + 1)) * 100
  }
}

/** Convert old panels/sizes array format to a mosaic tree */
export function panelsToMosaicTree(
  panels: string[],
  _sizes?: number[]
): MosaicLayoutNode<string> | null {
  if (panels.length === 0) return null
  if (panels.length === 1) return panels[0]

  // Build a balanced left-leaning tree
  function buildTree(
    items: string[],
    direction: MosaicDirection
  ): MosaicLayoutNode<string> {
    if (items.length === 1) return items[0]
    const mid = Math.ceil(items.length / 2)
    const nextDir: MosaicDirection = direction === 'row' ? 'column' : 'row'
    return {
      direction,
      first: buildTree(items.slice(0, mid), nextDir),
      second: buildTree(items.slice(mid), nextDir)
    }
  }

  return buildTree(panels, 'row')
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  devCommand: 'npm run dev'
}

export const DEV_SERVER_SUFFIX = 'devserver'
export const DEV_SERVER_PANEL_ID = `terminal:${DEV_SERVER_SUFFIX}`

export const PROJECT_COLORS = [
  '#c9956b', // copper
  '#7ab88a', // sage
  '#8088a0', // slate
  '#c9a856', // ochre
  '#7ba5b8', // teal
  '#b87a8e', // wine
  '#a0956b', // sand
  '#8a7ab8' // dusk
]
