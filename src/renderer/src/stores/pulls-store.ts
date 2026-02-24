import { create } from 'zustand'
import { GitHubPR, GitHubPRDetail, PRMergeMethod } from '../../../shared/types'

export type PRStateFilter = 'open' | 'closed' | 'merged' | 'all'

interface PullsFilter {
  search: string
  state: PRStateFilter
}

interface PullsInfo {
  prs: GitHubPR[]
  repoOwner: string
  repoName: string
  loading: boolean
  creating: boolean
  merging: boolean
  error: string | null
  filter: PullsFilter
  selectedPR: number | null
  prDetail: GitHubPRDetail | null
  loadingDetail: boolean
  addingComment: boolean
}

const DEFAULT_PULLS: PullsInfo = {
  prs: [],
  repoOwner: '',
  repoName: '',
  loading: false,
  creating: false,
  merging: false,
  error: null,
  filter: { search: '', state: 'open' },
  selectedPR: null,
  prDetail: null,
  loadingDetail: false,
  addingComment: false
}

interface PullsState {
  projects: Record<string, PullsInfo>

  detectRepo: (projectId: string, rootPath: string) => Promise<void>
  refresh: (projectId: string, rootPath: string) => Promise<void>
  createPR: (projectId: string, rootPath: string, title: string, body: string, head?: string, base?: string) => Promise<void>
  setFilter: (projectId: string, filter: Partial<PullsFilter>) => void
  selectPR: (projectId: string, rootPath: string, prNumber: number) => Promise<void>
  deselectPR: (projectId: string) => void
  addComment: (projectId: string, rootPath: string, prNumber: number, body: string) => Promise<void>
  mergePR: (projectId: string, rootPath: string, prNumber: number, method: PRMergeMethod, deleteBranch?: boolean) => Promise<void>
  closePR: (projectId: string, rootPath: string, prNumber: number) => Promise<void>
  clear: (projectId: string) => void
}

function getInfo(state: PullsState, projectId: string): PullsInfo {
  return state.projects[projectId] || DEFAULT_PULLS
}

export const usePullsStore = create<PullsState>((set, get) => ({
  projects: {},

  detectRepo: async (projectId, rootPath) => {
    try {
      const repo = await window.api.ghDetectRepo(rootPath)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: { ...getInfo(s, projectId), repoOwner: repo.owner, repoName: repo.name }
        }
      }))
    } catch (err) {
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            error: err instanceof Error ? err.message : String(err)
          }
        }
      }))
    }
  },

  refresh: async (projectId, rootPath) => {
    const current = getInfo(get(), projectId)
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...current, loading: true, error: null }
      }
    }))

    try {
      const prs = await window.api.ghListPrs(rootPath, current.filter.state, 50)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            prs,
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

  createPR: async (projectId, rootPath, title, body, head?, base?) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...getInfo(s, projectId), creating: true, error: null }
      }
    }))

    try {
      await window.api.ghCreatePr(rootPath, title, body, head, base)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: { ...getInfo(s, projectId), creating: false }
        }
      }))
      await get().refresh(projectId, rootPath)
    } catch (err) {
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            creating: false,
            error: err instanceof Error ? err.message : String(err)
          }
        }
      }))
    }
  },

  setFilter: (projectId, filter) => {
    const current = getInfo(get(), projectId)
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: {
          ...current,
          filter: { ...current.filter, ...filter }
        }
      }
    }))
  },

  selectPR: async (projectId, rootPath, prNumber) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: {
          ...getInfo(s, projectId),
          selectedPR: prNumber,
          loadingDetail: true,
          error: null
        }
      }
    }))

    try {
      const result = await window.api.ghGetPr(rootPath, prNumber)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            prDetail: result,
            loadingDetail: false
          }
        }
      }))
    } catch (err) {
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            loadingDetail: false,
            error: err instanceof Error ? err.message : String(err)
          }
        }
      }))
    }
  },

  deselectPR: (projectId) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: {
          ...getInfo(s, projectId),
          selectedPR: null,
          prDetail: null
        }
      }
    }))
  },

  addComment: async (projectId, rootPath, prNumber, body) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...getInfo(s, projectId), addingComment: true, error: null }
      }
    }))

    try {
      await window.api.ghCommentPr(rootPath, prNumber, body)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: { ...getInfo(s, projectId), addingComment: false }
        }
      }))
      await get().selectPR(projectId, rootPath, prNumber)
    } catch (err) {
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            addingComment: false,
            error: err instanceof Error ? err.message : String(err)
          }
        }
      }))
    }
  },

  mergePR: async (projectId, rootPath, prNumber, method, deleteBranch?) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...getInfo(s, projectId), merging: true, error: null }
      }
    }))

    try {
      await window.api.ghMergePr(rootPath, prNumber, method, deleteBranch)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: { ...getInfo(s, projectId), merging: false }
        }
      }))
      await get().selectPR(projectId, rootPath, prNumber)
      await get().refresh(projectId, rootPath)
    } catch (err) {
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            merging: false,
            error: err instanceof Error ? err.message : String(err)
          }
        }
      }))
    }
  },

  closePR: async (projectId, rootPath, prNumber) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...getInfo(s, projectId), merging: true, error: null }
      }
    }))

    try {
      await window.api.ghClosePr(rootPath, prNumber)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: { ...getInfo(s, projectId), merging: false }
        }
      }))
      await get().selectPR(projectId, rootPath, prNumber)
      await get().refresh(projectId, rootPath)
    } catch (err) {
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            merging: false,
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
  }
}))

export function usePulls(projectId: string | undefined): PullsInfo {
  return usePullsStore(
    (s) => (projectId ? s.projects[projectId] : undefined) ?? DEFAULT_PULLS
  )
}
