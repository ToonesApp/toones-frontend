import { create } from 'zustand'
import { KEYS, readJSON, writeJSON } from '../lib/storage'
import { DEFAULT_LOOK, sanitizeLook, type Look } from './avatar'

type LookState = {
  /** Saved looks by account email ('' for a signed-out guest). */
  looks: Record<string, Look>
  save: (email: string, look: Look) => void
}

const stored = readJSON<Record<string, unknown>>(KEYS.looks, {})

export const useLooks = create<LookState>()((set, get) => ({
  looks: Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, sanitizeLook(v)])),
  save: (email, look) => {
    const looks = { ...get().looks, [email.toLowerCase()]: look }
    writeJSON(KEYS.looks, looks)
    set({ looks })
  },
}))

/** The signed-in user's saved character, or the default Pip. */
export function useLook(email: string): Look {
  return useLooks((s) => s.looks[email.toLowerCase()]) ?? DEFAULT_LOOK
}
