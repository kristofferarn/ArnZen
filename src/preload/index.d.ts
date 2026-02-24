import { ElectronAPI } from '@electron-toolkit/preload'
import { DirEntry, GitStatusResult, GlobalConfig, Project } from '../shared/types'

interface ArnZenAPI {
  loadProjects: () => Promise<{ projects: Project[]; lastActiveProjectId: string | null }>
  saveProject: (project: Project) => Promise<void>
  saveGlobalConfig: (config: GlobalConfig) => Promise<void>
  removeProject: (projectId: string) => Promise<void>
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

  // Git
  gitIsRepo: (cwd: string) => Promise<boolean>
  gitStatus: (cwd: string) => Promise<GitStatusResult>
  gitBranches: (cwd: string) => Promise<string[]>
  gitCheckout: (cwd: string, branch: string) => Promise<void>
  gitCreateBranch: (cwd: string, branch: string) => Promise<void>
  gitDeleteBranch: (cwd: string, branch: string) => Promise<void>
  gitFetch: (cwd: string) => Promise<void>
  gitPull: (cwd: string) => Promise<void>

  // Filesystem (editor)
  readDir: (dirPath: string) => Promise<DirEntry[]>
  readFile: (filePath: string) => Promise<{ content: string } | { error: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ArnZenAPI
  }
}
