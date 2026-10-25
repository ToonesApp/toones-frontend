import type { Category } from '../../characters/clay'

export { fmtDur } from '../home/format'

/** "now", "12m", "16h", "3d", "5w". */
export function shortAgo(when: number, now = Date.now()) {
  const m = Math.max(0, (now - when) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${Math.floor(m)}m`
  if (m < 1440) return `${Math.floor(m / 60)}h`
  if (m < 10080) return `${Math.floor(m / 1440)}d`
  return `${Math.floor(m / 10080)}w`
}

export const TINT: Record<Category, [day: string, night: string]> = {
  Nature: ['#DCE9E1', '#243A33'],
  Language: ['#D8E6EE', '#243A4C'],
  Culture: ['#EDE2D2', '#3E3629'],
  Music: ['#F4DDD5', '#472F33'],
  City: ['#DDE2E8', '#2D3748'],
}

export const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || '?'
