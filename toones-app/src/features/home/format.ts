import type { Drop } from './homeStore'

export const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function ago(when: number, now = Date.now()) {
  const m = (now - when) / 60000
  if (m < 1) return 'just now'
  if (m < 60) return `${Math.floor(m)} min ago`
  if (m < 1440) return `${Math.floor(m / 60)} h ago`
  if (m < 2880) return 'yesterday'
  return `${Math.floor(m / 1440)} days ago`
}

export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)

export const placeCount = (drops: Drop[]) => new Set(drops.map((d) => d.place)).size

export function badges(drops: Drop[], listens: number) {
  const n = drops.length
  return [
    { name: 'First Drop', hint: 'Drop one Toone', unlocked: n >= 1 },
    { name: 'Explorer', hint: 'Drop in 3 different places', unlocked: placeCount(drops) >= 3 },
    { name: 'Listener', hint: 'Listen to 5 Toones', unlocked: listens >= 5 },
  ]
}
