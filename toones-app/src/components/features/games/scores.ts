import { create } from 'zustand'
import { getGameBests, getToken, type GameBest } from '../../lib/api'
import type { GameId } from './types'

type ScoreState = {
  /** Null for guests and until the server answers. */
  bests: Partial<Record<GameId, GameBest>> | null
  load: () => Promise<void>
}

export const useScores = create<ScoreState>()((set) => ({
  bests: null,
  load: async () => {
    if (!getToken()) return set({ bests: null })
    try {
      set({ bests: await getGameBests() })
    } catch {
      // Cards show a dash until the server is reachable
    }
  },
}))
