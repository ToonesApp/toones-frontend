export const XP_PER_DROP = 40
export const XP_PER_LISTEN = 12
export const XP_PER_LEVEL = 100

export function levelFromXp(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

/** XP earned inside the current level, 0..99. */
export function progressFromXp(xp: number) {
  return xp % XP_PER_LEVEL
}
