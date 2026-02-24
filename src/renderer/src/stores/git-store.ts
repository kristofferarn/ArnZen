import { create } from 'zustand'

interface GitInfo {
  isRepo: boolean
  branch: string
  detached: boolean
  dirty: boolean
  branches: string[]
  loading: boolean
  error: string | null
}

const DEFAULT_GIT_INFO: GitInfo = {
  isRepo: false,
  branch: '',
  detached: false,
  dirty: false,
  branches: [],
  loading: false,
  error: null
}

interface GitState {
  projects: Record<string, GitInfo>
  refresh: (projectId: string, rootPath: string) => Promise<void>
  clear: (projectId: string) => void
  setError: (projectId: string, error: string | null) => void
}

export const useGitStore = create<GitState>((set) => ({
  projects: {},

  refresh: async (projectId, rootPath) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...(s.projects[projectId] || DEFAULT_GIT_INFO), loading: true, error: null }
      }
    }))

    try {
      const isRepo = await window.api.gitIsRepo(rootPath)
      if (!isRepo) {
        set((s) => ({
          projects: {
            ...s.projects,
            [projectId]: { ...DEFAULT_GIT_INFO, isRepo: false }
          }
        }))
        return
      }

      const [status, branches] = await Promise.all([
        window.api.gitStatus(rootPath),
        window.api.gitBranches(rootPath)
      ])

      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            isRepo: true,
            branch: status.branch,
            detached: status.detached,
            dirty: status.dirty,
            branches,
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
            ...(s.projects[projectId] || DEFAULT_GIT_INFO),
            loading: false,
            error: err instanceof Error ? err.message : String(err)
          }
        }
      }))
    }
  },

  clear: (projectId) => {
    set((s) => {
      const { [projectId]: _, ...rest } = s.projects
      return { projects: rest }
    })
  },

  setError: (projectId, error) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...(s.projects[projectId] || DEFAULT_GIT_INFO), error }
      }
    }))
  }
}))

export function useGitInfo(projectId: string | undefined): GitInfo {
  return useGitStore((s) => (projectId ? s.projects[projectId] : undefined) ?? DEFAULT_GIT_INFO)
}
