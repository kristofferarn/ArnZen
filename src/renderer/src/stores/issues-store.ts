import { create } from 'zustand'
import { GitHubIssue, GitHubIssueComment, GitHubLabel } from '../../../shared/types'

export type IssueStateFilter = 'open' | 'closed' | 'all'

interface IssuesFilter {
  search: string
  state: IssueStateFilter
}

interface IssueDetail extends GitHubIssue {
  milestone: string | null
  comments: GitHubIssueComment[]
}

interface IssuesInfo {
  issues: GitHubIssue[]
  repoOwner: string
  repoName: string
  loading: boolean
  creating: boolean
  error: string | null
  filter: IssuesFilter
  // Labels
  repoLabels: GitHubLabel[]
  loadingLabels: boolean
  // Detail view
  selectedIssue: number | null
  issueDetail: IssueDetail | null
  loadingDetail: boolean
  addingComment: boolean
}

const DEFAULT_ISSUES: IssuesInfo = {
  issues: [],
  repoOwner: '',
  repoName: '',
  loading: false,
  creating: false,
  error: null,
  filter: { search: '', state: 'open' },
  repoLabels: [],
  loadingLabels: false,
  selectedIssue: null,
  issueDetail: null,
  loadingDetail: false,
  addingComment: false
}

interface IssuesState {
  projects: Record<string, IssuesInfo>

  detectRepo: (projectId: string, rootPath: string) => Promise<void>
  refresh: (projectId: string, rootPath: string) => Promise<void>
  createIssue: (projectId: string, rootPath: string, title: string, body: string, labels?: string[]) => Promise<void>
  setFilter: (projectId: string, filter: Partial<IssuesFilter>) => void
  selectIssue: (projectId: string, rootPath: string, issueNumber: number) => Promise<void>
  deselectIssue: (projectId: string) => void
  addComment: (projectId: string, rootPath: string, issueNumber: number, body: string) => Promise<void>
  fetchLabels: (projectId: string, rootPath: string) => Promise<void>
  editIssueLabels: (projectId: string, rootPath: string, issueNumber: number, add: string[], remove: string[]) => Promise<void>
  clear: (projectId: string) => void
}

function getInfo(state: IssuesState, projectId: string): IssuesInfo {
  return state.projects[projectId] || DEFAULT_ISSUES
}

export const useIssuesStore = create<IssuesState>((set, get) => ({
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
      const issues = await window.api.ghListIssues(rootPath, current.filter.state, 50)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            issues,
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

  createIssue: async (projectId, rootPath, title, body, labels) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...getInfo(s, projectId), creating: true, error: null }
      }
    }))

    try {
      await window.api.ghCreateIssue(rootPath, title, body, labels)
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

  selectIssue: async (projectId, rootPath, issueNumber) => {
    // Build a placeholder detail from list data so the dialog opens instantly
    const current = getInfo(get(), projectId)
    const listItem = current.issues.find((i) => i.number === issueNumber)
    const placeholder: IssueDetail | null = listItem
      ? { ...listItem, milestone: null, comments: [] }
      : current.issueDetail // keep existing detail if refreshing

    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: {
          ...getInfo(s, projectId),
          selectedIssue: issueNumber,
          issueDetail: placeholder,
          loadingDetail: true,
          error: null
        }
      }
    }))

    try {
      const result = await window.api.ghGetIssue(rootPath, issueNumber)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: {
            ...getInfo(s, projectId),
            issueDetail: result,
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

  deselectIssue: (projectId) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: {
          ...getInfo(s, projectId),
          selectedIssue: null,
          issueDetail: null
        }
      }
    }))
  },

  addComment: async (projectId, rootPath, issueNumber, body) => {
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...getInfo(s, projectId), addingComment: true, error: null }
      }
    }))

    try {
      await window.api.ghAddComment(rootPath, issueNumber, body)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: { ...getInfo(s, projectId), addingComment: false }
        }
      }))
      // Re-fetch the issue to get updated comments
      await get().selectIssue(projectId, rootPath, issueNumber)
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

  fetchLabels: async (projectId, rootPath) => {
    const current = getInfo(get(), projectId)
    if (current.repoLabels.length > 0 || current.loadingLabels) return
    set((s) => ({
      projects: {
        ...s.projects,
        [projectId]: { ...getInfo(s, projectId), loadingLabels: true }
      }
    }))
    try {
      const labels = await window.api.ghListLabels(rootPath)
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: { ...getInfo(s, projectId), repoLabels: labels, loadingLabels: false }
        }
      }))
    } catch {
      set((s) => ({
        projects: {
          ...s.projects,
          [projectId]: { ...getInfo(s, projectId), loadingLabels: false }
        }
      }))
    }
  },

  editIssueLabels: async (projectId, rootPath, issueNumber, add, remove) => {
    try {
      await window.api.ghEditIssueLabels(rootPath, issueNumber, add, remove)
      await get().selectIssue(projectId, rootPath, issueNumber)
      await get().refresh(projectId, rootPath)
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

  clear: (projectId) => {
    set((s) => {
      const { [projectId]: _, ...rest } = s.projects
      return { projects: rest }
    })
  }
}))

export function useIssues(projectId: string | undefined): IssuesInfo {
  return useIssuesStore(
    (s) => (projectId ? s.projects[projectId] : undefined) ?? DEFAULT_ISSUES
  )
}
