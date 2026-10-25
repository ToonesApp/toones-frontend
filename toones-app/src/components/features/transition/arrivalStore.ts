import { create } from 'zustand'
import type { Category } from '../../characters/clay'

type ArrivalState = {
  /** True from Home's first paint until every character has landed in the rail. */
  active: boolean
  /** The map is up (or gave up waiting), so the cast flies and the HUD slides in. */
  mapReady: boolean
  landed: Category[]
  /** Landed characters still wearing their happy face. */
  happy: Category[]
  begin: () => void
  ready: () => void
  land: (c: Category) => void
  end: () => void
}

export const useArrival = create<ArrivalState>()((set) => ({
  active: false,
  mapReady: false,
  landed: [],
  happy: [],
  begin: () => set({ active: true, mapReady: false, landed: [], happy: [] }),
  ready: () => set({ mapReady: true }),
  land: (c) => {
    set((s) => ({ landed: [...s.landed, c], happy: [...s.happy, c] }))
    setTimeout(() => set((s) => ({ happy: s.happy.filter((h) => h !== c) })), 700)
  },
  end: () => set({ active: false, landed: [] }),
}))
