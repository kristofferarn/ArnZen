import { ElectronAPI } from '@electron-toolkit/preload'
import { DirEntry, GitHubIssue, GitHubIssueComment, GitHubLabel, GitHubPR, GitHubPRDetail, PRMergeMethod, GitStatusDetailResult, GitStatusResult, GlobalConfig, Project } from '../shared/types'

interface ArnZenAPI {
  loadProjects: () => Promise<{ projects: Project[]; lastActiveProjectId: string | null }>
  saveProject: (project: Project) => Promise<void>
  saveGlobalConfig: (config: GlobalConfig) => Promise<void>
  removeProject: (projectId: string) => Promise<void>
  selectFolder: () => Promise<string | null>
  openInVSCode: (folderPath: string) => Promise<void>
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
  gitStatusDetail: (cwd: string) => Promise<GitStatusDetailResult>
  gitStage: (cwd: string, paths: string[]) => Promise<void>
  gitStageAll: (cwd: string) => Promise<void>
  gitUnstage: (cwd: string, paths: string[]) => Promise<void>
  gitUnstageAll: (cwd: string) => Promise<void>
  gitDiscard: (cwd: string, paths: string[]) => Promise<void>
  gitCommit: (cwd: string, message: string) => Promise<void>
  gitPush: (cwd: string) => Promise<void>

  // GitHub (via gh CLI)
  ghDetectRepo: (cwd: string) => Promise<{ owner: string; name: string }>
  ghListIssues: (cwd: string, state: string, limit: number) => Promise<GitHubIssue[]>
  ghCreateIssue: (cwd: string, title: string, body: string, labels?: string[]) => Promise<{ number: number; url: string }>
  ghGetIssue: (cwd: string, issueNumber: number) => Promise<GitHubIssue & { comments: GitHubIssueComment[]; milestone: string | null }>
  ghAddComment: (cwd: string, issueNumber: number, body: string) => Promise<void>
  ghEditIssueLabels: (cwd: string, issueNumber: number, add: string[], remove: string[]) => Promise<void>
  ghDefaultBranch: (cwd: string) => Promise<string>
  ghListLabels: (cwd: string) => Promise<GitHubLabel[]>
  ghEditPrLabels: (cwd: string, prNumber: number, add: string[], remove: string[]) => Promise<void>
  ghCreatePr: (cwd: string, title: string, body: string, head?: string, base?: string, labels?: string[]) => Promise<{ url: string }>
  ghListPrs: (cwd: string, state: string, limit: number) => Promise<GitHubPR[]>
  ghGetPr: (cwd: string, prNumber: number) => Promise<GitHubPRDetail>
  ghMergePr: (cwd: string, prNumber: number, method: PRMergeMethod, deleteBranch?: boolean) => Promise<void>
  ghClosePr: (cwd: string, prNumber: number) => Promise<void>
  ghCommentPr: (cwd: string, prNumber: number, body: string) => Promise<void>

  // Filesystem (editor)
  globFiles: (rootPath: string, extension: string) => Promise<string[]>
  readDir: (dirPath: string) => Promise<DirEntry[]>
  readFile: (filePath: string) => Promise<{ content: string } | { error: string }>
  watchFile: (watchId: string, filePath: string) => void
  unwatchFile: (watchId: string) => void
  onFileChanged: (callback: (watchId: string, filePath: string) => void) => () => void

  // Auto-updater
  onUpdateAvailable: (callback: (version: string) => void) => () => void
  onUpdateDownloaded: (callback: () => void) => () => void
  updaterDownload: () => void
  updaterInstall: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ArnZenAPI
  }
}
