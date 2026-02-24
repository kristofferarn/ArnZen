import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { GlobalConfig, Project } from '../shared/types'

const api = {
  loadProjects: (): Promise<{ projects: Project[]; lastActiveProjectId: string | null }> =>
    ipcRenderer.invoke('load-projects'),
  saveProject: (project: Project): Promise<void> => ipcRenderer.invoke('save-project', project),
  saveGlobalConfig: (config: GlobalConfig): Promise<void> =>
    ipcRenderer.invoke('save-global-config', config),
  removeProject: (projectId: string): Promise<void> =>
    ipcRenderer.invoke('remove-project', projectId),
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('select-folder'),
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
  }
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
