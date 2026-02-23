import { ElectronAPI } from '@electron-toolkit/preload'
import { GlobalConfig, Project } from '../shared/types'

interface ArnZenAPI {
  loadProjects: () => Promise<{ projects: Project[]; lastActiveProjectId: string | null }>
  saveProject: (project: Project) => Promise<void>
  saveGlobalConfig: (config: GlobalConfig) => Promise<void>
  removeProject: (rootPath: string) => Promise<void>
  selectFolder: () => Promise<string | null>
  windowMinimize: () => void
  windowMaximize: () => void
  windowClose: () => void

  // Terminal
  terminalSpawn: (id: string, cwd: string, cols: number, rows: number) => Promise<{ alreadyRunning: boolean; scrollback?: string }>
  terminalInput: (id: string, data: string) => void
  terminalResize: (id: string, cols: number, rows: number) => void
  terminalKill: (id: string) => void
  onTerminalOutput: (callback: (id: string, data: string) => void) => () => void
  onTerminalExit: (callback: (id: string) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ArnZenAPI
  }
}
