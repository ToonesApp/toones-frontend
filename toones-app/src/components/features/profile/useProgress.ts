import { useMemo } from 'react'
import type { Progress } from '../../characters/avatar'
import { levelFromXp } from '../../lib/xp'
import { badges } from '../home/format'
import { useHome } from '../home/homeStore'

/** The signed-in user's level and unlocked badge names, which gate dress-up items. */
export function useProgress(): Progress {
  const xp = useHome((s) => s.xp)
  const drops = useHome((s) => s.drops)
  const listens = useHome((s) => s.listens)
  return useMemo(() => ({ level: levelFromXp(xp), badges: badges(drops, listens).filter((b) => b.unlocked).map((b) => b.name) }), [xp, drops, listens])
}
