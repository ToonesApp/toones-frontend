import { create } from 'zustand'
import type { Category } from '../../components/characters/clay'

type ArrivalState = {
  /** True from Home's first paint until every character has landed in the rail. */
  active: boolean
  landed: Category[]
  /** Landed characters still wearing their happy face. */
  happy: Category[]
  begin: () => void
  land: (c: Category) => void
  end: () => void
}

export const useArrival = create<ArrivalState>()((set) => ({
  active: false,
  landed: [],
  happy: [],
  begin: () => set({ active: true, landed: [], happy: [] }),
  land: (c) => {
    set((s) => ({ landed: [...s.landed, c], happy: [...s.happy, c] }))
    setTimeout(() => set((s) => ({ happy: s.happy.filter((h) => h !== c) })), 700)
  },
  end: () => set({ active: false, landed: [] }),
}))
