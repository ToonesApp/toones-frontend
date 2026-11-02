import { create } from 'zustand'
import type { MenuId } from '../menu/menu'

type ArrivalState = {
  /** True from Home's first paint until every character has landed in the rail. */
  active: boolean
  /** The map is up (or gave up waiting), so the cast flies and the HUD slides in. */
  mapReady: boolean
  landed: MenuId[]
  /** Landed characters still wearing their happy face. */
  happy: MenuId[]
  begin: () => void
  ready: () => void
  land: (id: MenuId) => void
  end: () => void
}

export const useArrival = create<ArrivalState>()((set) => ({
  active: false,
  mapReady: false,
  landed: [],
  happy: [],
  begin: () => set({ active: true, mapReady: false, landed: [], happy: [] }),
  ready: () => set({ mapReady: true }),
  land: (id) => {
    set((s) => ({ landed: [...s.landed, id], happy: [...s.happy, id] }))
    setTimeout(() => set((s) => ({ happy: s.happy.filter((h) => h !== id) })), 700)
  },
  end: () => set({ active: false, landed: [] }),
}))
