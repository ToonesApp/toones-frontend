import { useCallback, useSyncExternalStore } from 'react'

export const KEYS = {
  user: 'toones-user',
  token: 'toones-token',
  night: 'toones-night',
  arrive: 'toones-arrive',
  drops: 'toones-home-drops',
  xp: 'toones-home-xp',
  listens: 'toones-home-listens',
  layers: 'toones-layers',
} as const

export type StorageKey = (typeof KEYS)[keyof typeof KEYS]

export function read(key: StorageKey): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function write(key: StorageKey, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage unavailable (private mode, quota) */
  }
}

export function readJSON<T>(key: StorageKey, fallback: T): T {
  const raw = read(key)
  if (raw == null) return fallback
  try {
    return (JSON.parse(raw) as T) ?? fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key: StorageKey, value: unknown) {
  write(key, JSON.stringify(value))
}

/* Night mode: shared by Auth and Home, mirrored onto <html data-night>. */

const nightListeners = new Set<() => void>()

function getNight() {
  return read(KEYS.night) === '1'
}

export function setNight(on: boolean) {
  write(KEYS.night, on ? '1' : '0')
  document.documentElement.toggleAttribute('data-night', on)
  nightListeners.forEach((fn) => fn())
}

function subscribeNight(fn: () => void) {
  nightListeners.add(fn)
  return () => nightListeners.delete(fn)
}

export function useNight() {
  const night = useSyncExternalStore(subscribeNight, getNight, () => false)
  const toggle = useCallback(() => setNight(!getNight()), [])
  return [night, toggle] as const
}
