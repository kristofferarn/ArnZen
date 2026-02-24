import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/logo_transparent.png?asset'
import {
  DEFAULT_PROJECT_SETTINGS,
  GlobalConfig,
  Project,
  WidgetLayout,
  WidgetState,
  WorkspaceConfig,
  panelsToMosaicTree
} from '../shared/types'
import { v4 as uuid } from 'uuid'
import * as pty from 'node-pty'

const GLOBAL_CONFIG_NAME = 'arnzen-config.json'

// PTY session management
const ptySessions = new Map<string, pty.IPty>()
const ptyBuffers = new Map<string, string>()
const ptyScrollbacks = new Map<string, string>()
const MAX_SCROLLBACK_BYTES = 512 * 1024

function killAllPtySessions(): void {
  for (const [id, session] of ptySessions) {
    session.kill()
    ptySessions.delete(id)
    ptyBuffers.delete(id)
    ptyScrollbacks.delete(id)
  }
}

function getGlobalConfigPath(): string {
  return join(app.getPath('userData'), GLOBAL_CONFIG_NAME)
}

function readGlobalConfig(): GlobalConfig {
  const configPath = getGlobalConfigPath()
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, 'utf-8'))
  }
  return { projectPaths: [], lastActiveProjectId: null }
}

function writeGlobalConfig(config: GlobalConfig): void {
  writeFileSync(getGlobalConfigPath(), JSON.stringify(config, null, 2), 'utf-8')
}

function migrateWidgetState(
  widgetState: Record<string, unknown>
): WidgetState {
  const state = widgetState as unknown as WidgetState
  if (!state.terminals) {
    state.terminals = {}
  }
  if (!state.todoViewMode) {
    state.todoViewMode = 'list'
  }
  // Migrate old Todo[] ({ text, done }) to Task[] ({ title, status, ... })
  if (Array.isArray(state.todos) && state.todos.length > 0) {
    const first = state.todos[0] as unknown as Record<string, unknown>
    if ('text' in first && !('title' in first)) {
      const now = Date.now()
      state.todos = (
        state.todos as unknown as Array<{ id: string; text: string; done: boolean }>
      ).map((old) => ({
        id: old.id,
        title: old.text,
        description: '',
        status: (old.done ? 'done' : 'todo') as 'done' | 'todo',
        priority: 'medium' as const,
        createdAt: now,
        updatedAt: now
      }))
    }
  }
  return state
}

function migrateLayout(
  layout: Record<string, unknown>,
  widgetState: WidgetState,
  rootPath: string
): WidgetLayout {
  // Migrate bare 'terminal' panel IDs to instance IDs
  const migratePanelId = (panelId: string): string => {
    if (panelId === 'terminal') {
      const suffix = uuid().substring(0, 8)
      widgetState.terminals[suffix] = {
        label: 'Terminal 1',
        cwd: rootPath
      }
      return `terminal:${suffix}`
    }
    return panelId
  }

  // Very old format: activeWidgetId/openWidgetIds
  if ('activeWidgetId' in layout && !('panels' in layout) && !('mosaic' in layout)) {
    const openIds = layout.openWidgetIds as string[] | undefined
    const activeId = layout.activeWidgetId as string
    const panels = (openIds && openIds.length > 0 ? openIds : [activeId]).map(migratePanelId)
    return { mosaic: panelsToMosaicTree(panels), minimized: [] }
  }

  // Old allotment format: panels/sizes arrays
  if ('panels' in layout && !('mosaic' in layout)) {
    const panels = (layout.panels as string[]).map(migratePanelId)
    const minimized = ((layout.minimized as string[] | undefined) || []).map(migratePanelId)
    return { mosaic: panelsToMosaicTree(panels), minimized }
  }

  // Current mosaic format — still migrate terminal IDs within the tree
  const result = layout as unknown as WidgetLayout
  if (result.mosaic !== null && result.mosaic !== undefined) {
    result.mosaic = migrateMosaicNode(result.mosaic, migratePanelId)
  }
  if (result.minimized) {
    result.minimized = result.minimized.map(migratePanelId)
  }
  return result
}

function migrateMosaicNode(
  node: unknown,
  migratePanelId: (id: string) => string
): WidgetLayout['mosaic'] {
  if (typeof node === 'string') {
    return migratePanelId(node)
  }
  if (typeof node === 'object' && node !== null && 'direction' in node) {
    const parent = node as { direction: string; first: unknown; second: unknown; splitPercentage?: number }
    return {
      direction: parent.direction as 'row' | 'column',
      first: migrateMosaicNode(parent.first, migratePanelId)!,
      second: migrateMosaicNode(parent.second, migratePanelId)!,
      splitPercentage: parent.splitPercentage
    }
  }
  return null
}

function readWorkspaceConfig(rootPath: string): WorkspaceConfig | null {
  const configPath = join(rootPath, '.arnzen', 'workspace.json')
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, 'utf-8'))
  }
  return null
}

function writeWorkspaceConfig(project: Project): void {
  const dir = join(project.rootPath, '.arnzen')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const { rootPath: _, ...rest } = project
  const config: WorkspaceConfig = { project: rest }
  writeFileSync(join(dir, 'workspace.json'), JSON.stringify(config, null, 2), 'utf-8')
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    frame: false,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.arnzen')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC: Load all projects from global config
  ipcMain.handle('load-projects', async () => {
    const globalConfig = readGlobalConfig()
    const projects: Project[] = []

    for (const rootPath of globalConfig.projectPaths) {
      const wsConfig = readWorkspaceConfig(rootPath)
      if (wsConfig) {
        const project = wsConfig.project
        project.widgetState = migrateWidgetState(
          project.widgetState as unknown as Record<string, unknown>
        )
        project.layout = migrateLayout(
          project.layout as unknown as Record<string, unknown>,
          project.widgetState,
          rootPath
        )
        // Migrate: ensure settings exist
        if (!(project as Record<string, unknown>).settings) {
          ;(project as Record<string, unknown>).settings = { ...DEFAULT_PROJECT_SETTINGS }
        }
        projects.push({ ...project, rootPath })
      }
    }

    return { projects, lastActiveProjectId: globalConfig.lastActiveProjectId }
  })

  // IPC: Save a project to its workspace.json
  ipcMain.handle('save-project', async (_event, project: Project) => {
    writeWorkspaceConfig(project)
  })

  // IPC: Save global state (active project, project list)
  ipcMain.handle('save-global-config', async (_event, config: GlobalConfig) => {
    writeGlobalConfig(config)
  })

  // IPC: Remove project from global config
  ipcMain.handle('remove-project', async (_event, rootPath: string) => {
    const globalConfig = readGlobalConfig()
    globalConfig.projectPaths = globalConfig.projectPaths.filter((p) => p !== rootPath)
    writeGlobalConfig(globalConfig)
  })

  // IPC: Open folder dialog
  ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  // IPC: Window controls
  ipcMain.on('window-minimize', () => {
    BrowserWindow.getFocusedWindow()?.minimize()
  })
  ipcMain.on('window-maximize', () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  ipcMain.on('window-close', () => {
    BrowserWindow.getFocusedWindow()?.close()
  })

  // IPC: Spawn a PTY session for a project
  ipcMain.handle(
    'terminal:spawn',
    async (_event, id: string, cwd: string, cols: number, rows: number) => {
      // If session already exists, return with scrollback for reattach
      if (ptySessions.has(id)) {
        return { alreadyRunning: true, scrollback: ptyScrollbacks.get(id) || '' }
      }

      const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: process.env as Record<string, string>
      })

      ptySessions.set(id, ptyProcess)
      ptyBuffers.set(id, '')

      // Batch output data and flush every 10ms
      ptyProcess.onData((data) => {
        ptyBuffers.set(id, (ptyBuffers.get(id) || '') + data)

        // Accumulate scrollback for reattach
        let scrollback = (ptyScrollbacks.get(id) || '') + data
        if (scrollback.length > MAX_SCROLLBACK_BYTES) {
          scrollback = scrollback.slice(scrollback.length - MAX_SCROLLBACK_BYTES)
        }
        ptyScrollbacks.set(id, scrollback)
      })

      const flushInterval = setInterval(() => {
        const buffer = ptyBuffers.get(id)
        if (buffer && buffer.length > 0) {
          const win = BrowserWindow.getAllWindows()[0]
          if (win && !win.isDestroyed()) {
            win.webContents.send('terminal:output', id, buffer)
          }
          ptyBuffers.set(id, '')
        }
      }, 10)

      ptyProcess.onExit(() => {
        clearInterval(flushInterval)
        ptySessions.delete(id)
        ptyBuffers.delete(id)
        ptyScrollbacks.delete(id)
        const win = BrowserWindow.getAllWindows()[0]
        if (win && !win.isDestroyed()) {
          win.webContents.send('terminal:exit', id)
        }
      })

      return { alreadyRunning: false }
    }
  )

  // IPC: Write input to a PTY
  ipcMain.on('terminal:input', (_event, id: string, data: string) => {
    ptySessions.get(id)?.write(data)
  })

  // IPC: Resize a PTY
  ipcMain.on('terminal:resize', (_event, id: string, cols: number, rows: number) => {
    ptySessions.get(id)?.resize(cols, rows)
  })

  // IPC: Kill a PTY session
  ipcMain.on('terminal:kill', (_event, id: string) => {
    const session = ptySessions.get(id)
    if (session) {
      session.kill()
      ptySessions.delete(id)
      ptyBuffers.delete(id)
      ptyScrollbacks.delete(id)
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  killAllPtySessions()
})

app.on('window-all-closed', () => {
  killAllPtySessions()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
