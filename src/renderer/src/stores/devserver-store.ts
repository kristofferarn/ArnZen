import { create } from 'zustand'

interface DevServerState {
  running: Set<string>
  peekOpen: Set<string>
  setRunning: (projectId: string, isRunning: boolean) => void
  togglePeek: (projectId: string) => void
  closePeek: (projectId: string) => void
}

export const useDevServerStore = create<DevServerState>((set) => ({
  running: new Set(),
  peekOpen: new Set(),

  setRunning: (projectId, isRunning) =>
    set((s) => {
      const next = new Set(s.running)
      if (isRunning) next.add(projectId)
      else next.delete(projectId)
      return { running: next }
    }),

  togglePeek: (projectId) =>
    set((s) => {
      const next = new Set(s.peekOpen)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return { peekOpen: next }
    }),

  closePeek: (projectId) =>
    set((s) => {
      if (!s.peekOpen.has(projectId)) return s
      const next = new Set(s.peekOpen)
      next.delete(projectId)
      return { peekOpen: next }
    })
}))
