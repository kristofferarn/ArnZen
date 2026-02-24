import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { DirEntry, GitHubIssue, GitHubIssueComment, GitHubLabel, GitHubPR, GitHubPRDetail, PRMergeMethod, GitStatusDetailResult, GitStatusResult, GlobalConfig, Project } from '../shared/types'

const api = {
  loadProjects: (): Promise<{ projects: Project[]; lastActiveProjectId: string | null }> =>
    ipcRenderer.invoke('load-projects'),
  saveProject: (project: Project): Promise<void> => ipcRenderer.invoke('save-project', project),
  saveGlobalConfig: (config: GlobalConfig): Promise<void> =>
    ipcRenderer.invoke('save-global-config', config),
  removeProject: (projectId: string): Promise<void> =>
    ipcRenderer.invoke('remove-project', projectId),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),
  openInVSCode: (folderPath: string): Promise<void> => ipcRenderer.invoke('open-in-vscode', folderPath),
  windowMinimize: (): void => ipcRenderer.send('window-minimize'),
  windowMaximize: (): void => ipcRenderer.send('window-maximize'),
  windowClose: (): void => ipcRenderer.send('window-close'),

  // Terminal
  terminalSpawn: (id: string, cwd: string, cols: number, rows: number): Promise<{ alreadyRunning: boolean; scrollback?: string }> =>
    ipcRenderer.invoke('terminal:spawn', id, cwd, cols, rows),
  terminalInput: (id: string, data: string): void => ipcRenderer.send('terminal:input', id, data),
  terminalResize: (id: string, cols: number, rows: number): void =>
    ipcRenderer.send('terminal:resize', id, cols, rows),
  terminalKill: (id: string): void => ipcRenderer.send('terminal:kill', id),
  onTerminalOutput: (callback: (id: string, data: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: string, data: string): void =>
      callback(id, data)
    ipcRenderer.on('terminal:output', handler)
    return () => {
      ipcRenderer.removeListener('terminal:output', handler)
    }
  },
  onTerminalExit: (callback: (id: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: string): void => callback(id)
    ipcRenderer.on('terminal:exit', handler)
    return () => {
      ipcRenderer.removeListener('terminal:exit', handler)
    }
  },

  // Git
  gitIsRepo: (cwd: string): Promise<boolean> =>
    ipcRenderer.invoke('git:is-repo', cwd),
  gitStatus: (cwd: string): Promise<GitStatusResult> =>
    ipcRenderer.invoke('git:status', cwd),
  gitBranches: (cwd: string): Promise<string[]> =>
    ipcRenderer.invoke('git:branches', cwd),
  gitCheckout: (cwd: string, branch: string): Promise<void> =>
    ipcRenderer.invoke('git:checkout', cwd, branch),
  gitCreateBranch: (cwd: string, branch: string): Promise<void> =>
    ipcRenderer.invoke('git:create-branch', cwd, branch),
  gitDeleteBranch: (cwd: string, branch: string): Promise<void> =>
    ipcRenderer.invoke('git:delete-branch', cwd, branch),
  gitFetch: (cwd: string): Promise<void> =>
    ipcRenderer.invoke('git:fetch', cwd),
  gitPull: (cwd: string): Promise<void> =>
    ipcRenderer.invoke('git:pull', cwd),
  gitStatusDetail: (cwd: string): Promise<GitStatusDetailResult> =>
    ipcRenderer.invoke('git:status-detail', cwd),
  gitStage: (cwd: string, paths: string[]): Promise<void> =>
    ipcRenderer.invoke('git:stage', cwd, paths),
  gitStageAll: (cwd: string): Promise<void> =>
    ipcRenderer.invoke('git:stage-all', cwd),
  gitUnstage: (cwd: string, paths: string[]): Promise<void> =>
    ipcRenderer.invoke('git:unstage', cwd, paths),
  gitUnstageAll: (cwd: string): Promise<void> =>
    ipcRenderer.invoke('git:unstage-all', cwd),
  gitDiscard: (cwd: string, paths: string[]): Promise<void> =>
    ipcRenderer.invoke('git:discard', cwd, paths),
  gitCommit: (cwd: string, message: string): Promise<void> =>
    ipcRenderer.invoke('git:commit', cwd, message),
  gitPush: (cwd: string): Promise<void> =>
    ipcRenderer.invoke('git:push', cwd),

  // GitHub (via gh CLI)
  ghDetectRepo: (cwd: string): Promise<{ owner: string; name: string }> =>
    ipcRenderer.invoke('gh:detect-repo', cwd),
  ghListIssues: (cwd: string, state: string, limit: number): Promise<GitHubIssue[]> =>
    ipcRenderer.invoke('gh:list-issues', cwd, state, limit),
  ghCreateIssue: (cwd: string, title: string, body: string, labels?: string[]): Promise<{ number: number; url: string }> =>
    ipcRenderer.invoke('gh:create-issue', cwd, title, body, labels),
  ghGetIssue: (cwd: string, issueNumber: number): Promise<GitHubIssue & { comments: GitHubIssueComment[]; milestone: string | null }> =>
    ipcRenderer.invoke('gh:get-issue', cwd, issueNumber),
  ghAddComment: (cwd: string, issueNumber: number, body: string): Promise<void> =>
    ipcRenderer.invoke('gh:add-comment', cwd, issueNumber, body),
  ghEditIssueLabels: (cwd: string, issueNumber: number, add: string[], remove: string[]): Promise<void> =>
    ipcRenderer.invoke('gh:edit-issue-labels', cwd, issueNumber, add, remove),
  ghDefaultBranch: (cwd: string): Promise<string> =>
    ipcRenderer.invoke('gh:default-branch', cwd),
  ghListLabels: (cwd: string): Promise<GitHubLabel[]> =>
    ipcRenderer.invoke('gh:list-labels', cwd),
  ghEditPrLabels: (cwd: string, prNumber: number, add: string[], remove: string[]): Promise<void> =>
    ipcRenderer.invoke('gh:edit-pr-labels', cwd, prNumber, add, remove),
  ghCreatePr: (cwd: string, title: string, body: string, head?: string, base?: string, labels?: string[]): Promise<{ url: string }> =>
    ipcRenderer.invoke('gh:create-pr', cwd, title, body, head, base, labels),
  ghListPrs: (cwd: string, state: string, limit: number): Promise<GitHubPR[]> =>
    ipcRenderer.invoke('gh:list-prs', cwd, state, limit),
  ghGetPr: (cwd: string, prNumber: number): Promise<GitHubPRDetail> =>
    ipcRenderer.invoke('gh:get-pr', cwd, prNumber),
  ghMergePr: (cwd: string, prNumber: number, method: PRMergeMethod, deleteBranch?: boolean): Promise<void> =>
    ipcRenderer.invoke('gh:merge-pr', cwd, prNumber, method, deleteBranch),
  ghClosePr: (cwd: string, prNumber: number): Promise<void> =>
    ipcRenderer.invoke('gh:close-pr', cwd, prNumber),
  ghCommentPr: (cwd: string, prNumber: number, body: string): Promise<void> =>
    ipcRenderer.invoke('gh:comment-pr', cwd, prNumber, body),

  // Filesystem (editor)
  readDir: (dirPath: string): Promise<DirEntry[]> =>
    ipcRenderer.invoke('fs:read-dir', dirPath),
  readFile: (filePath: string): Promise<{ content: string } | { error: string }> =>
    ipcRenderer.invoke('fs:read-file', filePath),

  // Auto-updater
  onUpdateAvailable: (callback: (version: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, version: string): void => callback(version)
    ipcRenderer.on('updater:update-available', handler)
    return () => { ipcRenderer.removeListener('updater:update-available', handler) }
  },
  onUpdateDownloaded: (callback: () => void): (() => void) => {
    const handler = (): void => callback()
    ipcRenderer.on('updater:update-downloaded', handler)
    return () => { ipcRenderer.removeListener('updater:update-downloaded', handler) }
  },
  updaterDownload: (): void => ipcRenderer.send('updater:download'),
  updaterInstall: (): void => ipcRenderer.send('updater:install')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
