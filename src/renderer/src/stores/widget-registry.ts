import { ComponentType } from 'react'
import { Bot, CheckSquare, CircleDot, FileSearch, GitCommitHorizontal, GitPullRequestDraft, Terminal } from 'lucide-react'
import { TodoWidget } from '../widgets/TodoWidget'
import { TerminalWidget } from '../widgets/TerminalWidget'
import { SourceControlWidget } from '../widgets/source-control/SourceControlWidget'
import { IssuesWidget } from '../widgets/issues/IssuesWidget'
import { PullsWidget } from '../widgets/pulls/PullsWidget'
import { FileViewerWidget } from '../widgets/FileViewerWidget'

export interface WidgetDefinition {
  id: string
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
  component: ComponentType<{ instanceId?: string }>
  color: string
  allowMultiple?: boolean
}

export interface TerminalPreset {
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
  color: string
  initialCommand: string
}

export const widgetRegistry: WidgetDefinition[] = [
  {
    id: 'todo',
    label: 'To-Do',
    icon: CheckSquare,
    component: TodoWidget,
    color: '#7ab88a'
  },
  {
    id: 'source-control',
    label: 'Source Control',
    icon: GitCommitHorizontal,
    component: SourceControlWidget,
    color: '#6b9fd4'
  },
  {
    id: 'issues',
    label: 'Issues',
    icon: CircleDot,
    component: IssuesWidget,
    color: '#8a7ab8'
  },
  {
    id: 'pulls',
    label: 'Pull Requests',
    icon: GitPullRequestDraft,
    component: PullsWidget,
    color: '#3fb950'
  },
  {
    id: 'file-viewer',
    label: 'File Viewer',
    icon: FileSearch,
    component: FileViewerWidget,
    color: '#7ba5b8',
    allowMultiple: true
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: Terminal,
    component: TerminalWidget,
    color: '#8a8f9a',
    allowMultiple: true
  }
]

export const terminalPresets: TerminalPreset[] = [
  {
    label: 'Claude Code',
    icon: Bot,
    color: '#c9956b',
    initialCommand: 'cls; claude --chrome'
  }
]

/** Extract base widget type from a panel ID. 'terminal:abc123' -> 'terminal', 'todo' -> 'todo' */
export function getBaseType(panelId: string): string {
  const idx = panelId.indexOf(':')
  return idx === -1 ? panelId : panelId.substring(0, idx)
}

/** Extract instance suffix from a panel ID. 'terminal:abc123' -> 'abc123', 'todo' -> undefined */
export function getInstanceSuffix(panelId: string): string | undefined {
  const idx = panelId.indexOf(':')
  return idx === -1 ? undefined : panelId.substring(idx + 1)
}

/** Look up a widget definition by panel ID (handles instance IDs) */
export const getWidget = (panelId: string): WidgetDefinition | undefined =>
  widgetRegistry.find((w) => w.id === getBaseType(panelId))
