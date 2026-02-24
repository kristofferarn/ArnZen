import { create } from 'zustand'
import { GitFileStatus } from '../../../shared/types'

interface CategorizedFiles {
  staged: GitFileStatus[]
  unstaged: GitFileStatus[]
  untracked: GitFileStatus[]
}

interface SourceControlInfo {
  files: CategorizedFiles
  branch: string
  detached: boolean
  ahead: number
  behind: number
  commitMessage: string
  loading: boolean
  committing: boolean
  pushing: boolean
  error: string | null
}

const DEFAULT_SOURCE_CONTROL: SourceControlInfo = {
  files: { staged: [], unstaged: [], untracked: [] },
  branch: '',
  detached: false,
  ahead: 0,
  behind: 0,
  commitMessage: '',
  loading: false,
  committing: false,
  pushing: false,
  error: null
}

function categorizeFiles(files: GitFileStatus[]): CategorizedFiles {
  const staged: GitFileStatus[] = []
  const unstaged: GitFileStatus[] = []
  const untracked: GitFileStatus[] = []

  for (const file of files) {
    const { indexStatus, workTreeStatus } = file
    if (indexStatus === '?' && workTreeStatus === '?') {
      untracked.push(file)
      continue
    }
    if (indexStatus !== ' ' && indexStatus !== '?') {
      staged.push(file)
    }
    if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
      unstaged.push(file)
    }
  }
  return { staged, unstaged, untracked }
}

interface SourceControlState {
  projects: Record<string, SourceControlInfo>

  refresh: (projectId: string, rootPath: string) => Promise<void>
  stage: (projectId: string, rootPath: string, paths: string[]) => Promise<void>
  stageAll: (projectId: string, rootPath: string) => Promise<void>
  unstage: (projectId: string, rootPath: string, paths: string[]) => Promise<void>
  unstageAll: (projectId: string, rootPath: string) => Promise<void>
  discard: (projectId: string, rootPath: string, paths: string[]) => Promise<void>
  commit: (projectId: string, rootPath: string) => Promise<void>
  push: (projectId: string, rootPath: string) => Promise<void>
  setCommitMessage: (projectId: string, message: string) => void
  clear: (projectId: string) => void
}

function getInfo(state: SourceControlState, projectId: string): SourceControlInfo {
  return state.projects[projectId] || DEFAULT_SOURCE_CONTROL
}

export const useSourceControlStore = create<SourceControlState>((set, get) => ({
  projects: {},

  refresh: async (projectId, rootPath) => {
    const current = getInfo(get(), projectId)
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...current, loading: true, error: null }
      }
    }))

    try {
      const result = await window.api.gitStatusDetail(rootPath)
      const files = categorizeFiles(result.files)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            files,
            branch: result.branch,
            detached: result.detached,
            ahead: result.ahead,
            behind: result.behind,
            loading: false,
            error: null
          }
        }
      }))
    } catch (err) {
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            loading: false,
            error: err instanceof Error ? err.message : String(err)
          }
        }
      }))
    }
  },

  stage: async (projectId, rootPath, paths) => {
    await window.api.gitStage(rootPath, paths)
    await get().refresh(projectId, rootPath)
  },

  stageAll: async (projectId, rootPath) => {
    await window.api.gitStageAll(rootPath)
    await get().refresh(projectId, rootPath)
  },

  unstage: async (projectId, rootPath, paths) => {
    await window.api.gitUnstage(rootPath, paths)
    await get().refresh(projectId, rootPath)
  },

  unstageAll: async (projectId, rootPath) => {
    await window.api.gitUnstageAll(rootPath)
    await get().refresh(projectId, rootPath)
  },

  discard: async (projectId, rootPath, paths) => {
    await window.api.gitDiscard(rootPath, paths)
    await get().refresh(projectId, rootPath)
  },

  commit: async (projectId, rootPath) => {
    const info = getInfo(get(), projectId)
    if (!info.commitMessage.trim() || info.files.staged.length === 0) return

    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...getInfo(s, projectId), committing: true, error: null }
      }
    }))

    try {
      await window.api.gitCommit(rootPath, info.commitMessage.trim())
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: { ...getInfo(s, projectId), commitMessage: '', committing: false }
        }
      }))
      await get().refresh(projectId, rootPath)
    } catch (err) {
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            committing: false,
            error: err instanceof Error ? err.message : String(err)
          }
        }
      }))
    }
  },

  push: async (projectId, rootPath) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...getInfo(s, projectId), pushing: true, error: null }
      }
    }))

    try {
      await window.api.gitPush(rootPath)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: { ...getInfo(s, projectId), pushing: false }
        }
      }))
      await get().refresh(projectId, rootPath)
    } catch (err) {
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            pushing: false,
            error: err instanceof Error ? err.message : String(err)
          }
        }
      }))
    }
  },

  setCommitMessage: (projectId, message) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...getInfo(s, projectId), commitMessage: message }
      }
    }))
  },

  clear: (projectId) => {
    set((s) => {
      const { [projectId]: _, ...rest } = s.projects
      return { projects: rest }
    })
  }
}))

export function useSourceControl(projectId: string | undefined): SourceControlInfo {
  return useSourceControlStore(
    (s) => (projectId ? s.projects[projectId] : undefined) ?? DEFAULT_SOURCE_CONTROL
  )
}
