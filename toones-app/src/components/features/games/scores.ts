import { create } from 'zustand'
import { getGameBests, getToken, submitGameScore, type GameBest } from '../../lib/api'
import type { GameId, Mode } from './types'

/** guest: not signed in. kept: an earlier daily score for today stands. */
export type SaveState = 'saving' | 'saved' | 'kept' | 'failed' | 'guest'

type ScoreState = {
  /** Null for guests and until the server answers. */
  bests: Partial<Record<GameId, GameBest>> | null
  load: () => Promise<void>
  submit: (game: GameId, run: { score: number; daily: boolean; mode: Mode }) => Promise<SaveState>
}

export const useScores = create<ScoreState>()((set, get) => ({
  bests: null,
  load: async () => {
    if (!getToken()) return set({ bests: null })
    try {
      set({ bests: await getGameBests() })
    } catch {
      // Cards show a dash until the server is reachable
    }
  },
  submit: async (game, run) => {
    if (!getToken()) return 'guest'
    try {
      const res = await submitGameScore(game, run)
      set({ bests: { ...get().bests, [game]: res.best } })
      return res.saved ? 'saved' : 'kept'
    } catch {
      return 'failed'
    }
  },
}))
