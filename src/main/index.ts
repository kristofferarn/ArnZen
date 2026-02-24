import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/logo_transparent.png?asset'
import {
  DEFAULT_PROJECT_SETTINGS,
  DirEntry,
  GitFileStatus,
  GitStatusDetailResult,
  GitStatusResult,
  GlobalConfig,
  Project,
  WidgetLayout,
  WidgetState,
  WorkspaceConfig,
  panelsToMosaicTree
} from '../shared/types'
import { v4 as uuid } from 'uuid'
import * as pty from 'node-pty'

const execFileAsync = promisify(execFile)

async function runGit(cwd: string, args: string[], timeout = 10000): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, encoding: 'utf-8', timeout })
  return stdout.trim()
}

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
  return migrateGlobalConfig()
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

function getProjectConfigDir(projectId: string): string {
  return join(app.getPath('userData'), 'projects', projectId)
}

function readWorkspaceConfig(projectId: string): WorkspaceConfig | null {
  const configPath = join(getProjectConfigDir(projectId), 'workspace.json')
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, 'utf-8'))
  }
  return null
}

function readLegacyWorkspaceConfig(rootPath: string): WorkspaceConfig | null {
  const configPath = join(rootPath, '.arnzen', 'workspace.json')
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, 'utf-8'))
  }
  return null
}

function writeWorkspaceConfig(project: Project): void {
  const dir = getProjectConfigDir(project.id)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const { rootPath: _, ...rest } = project
  const config: WorkspaceConfig = { project: rest }
  writeFileSync(join(dir, 'workspace.json'), JSON.stringify(config, null, 2), 'utf-8')
}

/** Migrate from old format: projectPaths[] → projects[], .arnzen/ → userData/projects/ */
function migrateGlobalConfig(): GlobalConfig {
  const configPath = getGlobalConfigPath()
  if (!existsSync(configPath)) {
    return { projects: [], lastActiveProjectId: null }
  }
  const raw = JSON.parse(readFileSync(configPath, 'utf-8'))

  // Already new format
  if (Array.isArray(raw.projects)) {
    return raw as GlobalConfig
  }

  // Old format: { projectPaths: string[], lastActiveProjectId }
  const oldPaths: string[] = raw.projectPaths || []
  const newProjects: { id: string; rootPath: string }[] = []

  for (const rootPath of oldPaths) {
    const legacyConfig = readLegacyWorkspaceConfig(rootPath)
    if (legacyConfig) {
      const projectId = legacyConfig.project.id
      newProjects.push({ id: projectId, rootPath })

      // Copy workspace data to centralized location
      const destDir = getProjectConfigDir(projectId)
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true })
      }
      writeFileSync(
        join(destDir, 'workspace.json'),
        JSON.stringify(legacyConfig, null, 2),
        'utf-8'
      )
    }
  }

  const newConfig: GlobalConfig = {
    projects: newProjects,
    lastActiveProjectId: raw.lastActiveProjectId ?? null
  }
  writeGlobalConfig(newConfig)
  return newConfig
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

    for (const { id, rootPath } of globalConfig.projects) {
      const wsConfig = readWorkspaceConfig(id)
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
  ipcMain.handle('remove-project', async (_event, projectId: string) => {
    const globalConfig = readGlobalConfig()
    globalConfig.projects = globalConfig.projects.filter((p) => p.id !== projectId)
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

  ipcMain.handle('open-in-vscode', async (_event, folderPath: string) => {
    await execFileAsync('code', [folderPath], { shell: true, timeout: 10000 })
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

  // IPC: Git operations
  ipcMain.handle('git:is-repo', async (_event, cwd: string): Promise<boolean> => {
    try {
      const result = await runGit(cwd, ['rev-parse', '--is-inside-work-tree'])
      return result === 'true'
    } catch {
      return false
    }
  })

  ipcMain.handle('git:status', async (_event, cwd: string): Promise<GitStatusResult> => {
    let branch = ''
    let detached = false
    try {
      branch = await runGit(cwd, ['symbolic-ref', '--short', 'HEAD'])
    } catch {
      // Detached HEAD — get short SHA
      detached = true
      try {
        branch = await runGit(cwd, ['rev-parse', '--short', 'HEAD'])
      } catch {
        branch = 'unknown'
      }
    }
    let dirty = false
    try {
      const porcelain = await runGit(cwd, ['status', '--porcelain'])
      dirty = porcelain.length > 0
    } catch {
      // If status fails, assume not dirty
    }
    return { branch, detached, dirty }
  })

  ipcMain.handle('git:branches', async (_event, cwd: string): Promise<string[]> => {
    const output = await runGit(cwd, ['branch', '--format=%(refname:short)'])
    if (!output) return []
    return output.split('\n').filter(Boolean)
  })

  ipcMain.handle('git:checkout', async (_event, cwd: string, branch: string): Promise<void> => {
    await runGit(cwd, ['checkout', branch])
  })

  ipcMain.handle('git:create-branch', async (_event, cwd: string, branch: string): Promise<void> => {
    await runGit(cwd, ['checkout', '-b', branch])
  })

  ipcMain.handle('git:delete-branch', async (_event, cwd: string, branch: string): Promise<void> => {
    await runGit(cwd, ['branch', '-d', branch])
  })

  ipcMain.handle('git:fetch', async (_event, cwd: string): Promise<void> => {
    await runGit(cwd, ['fetch', '--prune'])
  })

  ipcMain.handle('git:pull', async (_event, cwd: string): Promise<void> => {
    await runGit(cwd, ['pull'])
  })

  ipcMain.handle('git:status-detail', async (_event, cwd: string): Promise<GitStatusDetailResult> => {
    const raw = await runGit(cwd, ['status', '--porcelain=v1', '-uall', '--branch'])
    const lines = raw.split('\n')
    let branch = ''
    let detached = false
    let ahead = 0
    let behind = 0
    const files: GitFileStatus[] = []

    for (const line of lines) {
      if (line.startsWith('## ')) {
        const header = line.substring(3)
        // Detached HEAD
        if (header.startsWith('HEAD (no branch)') || header.startsWith('No commits yet')) {
          detached = true
          branch = 'HEAD'
          continue
        }
        // Parse "branch...remote [ahead N, behind M]"
        const dotIdx = header.indexOf('...')
        if (dotIdx !== -1) {
          branch = header.substring(0, dotIdx)
          const bracketMatch = header.match(/\[(.+)\]/)
          if (bracketMatch) {
            const info = bracketMatch[1]
            const aheadMatch = info.match(/ahead (\d+)/)
            const behindMatch = info.match(/behind (\d+)/)
            if (aheadMatch) ahead = parseInt(aheadMatch[1], 10)
            if (behindMatch) behind = parseInt(behindMatch[1], 10)
          }
        } else {
          // No remote tracking
          branch = header.split(' ')[0]
        }
        continue
      }
      if (line.length < 4) continue
      const indexStatus = line[0]
      const workTreeStatus = line[1]
      const rest = line.substring(3)
      // Handle renames: "R  old -> new"
      const arrowIdx = rest.indexOf(' -> ')
      if (arrowIdx !== -1) {
        files.push({
          path: rest.substring(arrowIdx + 4),
          indexStatus,
          workTreeStatus,
          origPath: rest.substring(0, arrowIdx)
        })
      } else {
        files.push({ path: rest, indexStatus, workTreeStatus })
      }
    }
    return { branch, detached, ahead, behind, files }
  })

  ipcMain.handle('git:stage', async (_event, cwd: string, paths: string[]): Promise<void> => {
    await runGit(cwd, ['add', '--', ...paths])
  })

  ipcMain.handle('git:stage-all', async (_event, cwd: string): Promise<void> => {
    await runGit(cwd, ['add', '-A'])
  })

  ipcMain.handle('git:unstage', async (_event, cwd: string, paths: string[]): Promise<void> => {
    await runGit(cwd, ['reset', 'HEAD', '--', ...paths])
  })

  ipcMain.handle('git:unstage-all', async (_event, cwd: string): Promise<void> => {
    await runGit(cwd, ['reset', 'HEAD'])
  })

  ipcMain.handle('git:discard', async (_event, cwd: string, paths: string[]): Promise<void> => {
    // Separate tracked (checkout) from untracked (clean)
    const statusRaw = await runGit(cwd, ['status', '--porcelain=v1', '-uall'])
    const untrackedSet = new Set<string>()
    for (const line of statusRaw.split('\n')) {
      if (line.startsWith('??')) {
        untrackedSet.add(line.substring(3))
      }
    }
    const tracked = paths.filter((p) => !untrackedSet.has(p))
    const untracked = paths.filter((p) => untrackedSet.has(p))
    if (tracked.length > 0) {
      await runGit(cwd, ['checkout', '--', ...tracked])
    }
    if (untracked.length > 0) {
      await runGit(cwd, ['clean', '-f', '--', ...untracked])
    }
  })

  ipcMain.handle('git:commit', async (_event, cwd: string, message: string): Promise<void> => {
    await runGit(cwd, ['commit', '-m', message])
  })

  ipcMain.handle('git:push', async (_event, cwd: string): Promise<void> => {
    await runGit(cwd, ['push'], 30000)
  })

  // IPC: Read directory listing (for editor file tree)
  const FILTERED_NAMES = new Set(['.git', 'node_modules', '.DS_Store', 'Thumbs.db', '.arnzen'])

  ipcMain.handle('fs:read-dir', async (_event, dirPath: string): Promise<DirEntry[]> => {
    try {
      const entries = readdirSync(dirPath)
      const result: DirEntry[] = []
      for (const name of entries) {
        if (FILTERED_NAMES.has(name)) continue
        try {
          const fullPath = join(dirPath, name)
          const stat = statSync(fullPath)
          result.push({ name, isDirectory: stat.isDirectory() })
        } catch {
          // Skip entries we can't stat
        }
      }
      // Sort: directories first, then alphabetical (case-insensitive)
      result.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })
      return result
    } catch {
      return []
    }
  })

  // IPC: Read file contents (for editor viewer)
  const MAX_FILE_SIZE = 1024 * 1024 // 1MB

  ipcMain.handle('fs:read-file', async (_event, filePath: string): Promise<{ content: string } | { error: string }> => {
    try {
      const stat = statSync(filePath)
      if (stat.size > MAX_FILE_SIZE) {
        return { error: `File too large (${(stat.size / 1024 / 1024).toFixed(1)}MB). Max 1MB.` }
      }
      const buffer = readFileSync(filePath)
      // Simple binary detection: check for null bytes in the first 8KB
      const sample = buffer.subarray(0, 8192)
      if (sample.includes(0)) {
        return { error: 'Binary file — cannot display.' }
      }
      return { content: buffer.toString('utf-8') }
    } catch (err) {
      return { error: `Failed to read file: ${(err as Error).message}` }
    }
  })

  createWindow()

  // Auto-update: check for updates, let user trigger download/install
  if (!is.dev) {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false

    autoUpdater.on('update-available', (info) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:update-available', info.version)
      }
    })

    autoUpdater.on('update-downloaded', () => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win && !win.isDestroyed()) {
        win.webContents.send('updater:update-downloaded')
      }
    })

    ipcMain.on('updater:download', () => {
      autoUpdater.downloadUpdate()
    })

    ipcMain.on('updater:install', () => {
      autoUpdater.quitAndInstall()
    })

    autoUpdater.checkForUpdates()
  }

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
