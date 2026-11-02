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

const TINTS: [day: string, night: string][] = [
  ['#DCE9E1', '#243A33'],
  ['#D8E6EE', '#243A4C'],
  ['#EDE2D2', '#3E3629'],
  ['#F4DDD5', '#472F33'],
  ['#DDE2E8', '#2D3748'],
  ['#E8E0EE', '#352A42'],
  ['#E6ECD8', '#333A28'],
]

function hashLabel(label: string) {
  let h = 0
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0
  return h
}

/** Soft placeholder tint derived from an AudioSet label. */
export function tintForLabel(label: string): [day: string, night: string] {
  return TINTS[hashLabel(label) % TINTS.length]
}

/** Solid avatar accent derived from a label (inbox chips, etc.). */
export function accentForLabel(label: string): string {
  const accents = ['#2F6A4A', '#2A5F7A', '#7A5424', '#C45C3E', '#3D4A58', '#6B4C8A', '#5A6B2F']
  return accents[hashLabel(label) % accents.length]
}

export const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || '?'
