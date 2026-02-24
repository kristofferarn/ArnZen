import { ComponentType } from 'react'
import { Bot, CheckSquare, Terminal } from 'lucide-react'
import { TodoWidget } from '../widgets/TodoWidget'
import { TerminalWidget } from '../widgets/TerminalWidget'

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
    id: 'terminal',
    label: 'Terminal',
    icon: Terminal,
    component: TerminalWidget,
    color: '#c9956b',
    allowMultiple: true
  }
]

export const terminalPresets: TerminalPreset[] = [
  {
    label: 'Claude Code',
    icon: Bot,
    color: '#a896c8',
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
