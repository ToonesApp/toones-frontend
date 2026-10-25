import { create } from 'zustand'
import { CATEGORIES, type Category } from '../../characters/clay'
import { getSounds, type ApiSound } from '../../lib/api'
import { angularDistance, type LngLat } from '../../lib/geo'
import { KEYS, readJSON, writeJSON } from '../../lib/storage'

export type Toone = {
  id: string
  cat: Category
  name: string
  handle: string
  when: number
  title: string
  place: string
  caption: string
  /** Seconds. */
  dur: number
  listens: number
  lon: number
  lat: number
  audioUrl: string | null
  mine: boolean
}

export type Comment = { id: string; name: string; text: string; when: number }
export type Tab = 'nearby' | 'new' | 'saved'
export type Settings = { autoplay: boolean; react: boolean; notify: boolean }
export type InboxMessage = { id: string; initial: string; cat: Category; text: string; when: number }

const DEFAULT_SETTINGS: Settings = { autoplay: true, react: true, notify: true }
const FIRST_SKELETON_MS = 1100
const SETTLE_MS = 500
const TOAST_MS = 2000

type FeedState = {
  toones: Toone[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  /** Brief skeleton after a tab or chip change. */
  settling: boolean
  tab: Tab
  cats: Category[]
  liked: string[]
  comments: Record<string, Comment[]>
  /** Session-only object URLs; the backend has no photo storage yet. */
  photos: Record<string, string[]>
  slide: Record<string, number>
  detail: string | null
  sheet: boolean
  playing: { id: string; elapsed: number } | null
  settings: Settings
  read: string[]
  /** Kept after it hides so the text stays while it fades. */
  toast: { text: string; on: boolean } | null
  origin: LngLat | null
  /** A card is under the pointer: rail characters look toward the feed. */
  hover: boolean

  load: () => Promise<void>
  setTab: (t: Tab) => void
  toggleCat: (c: Category) => void
  allCats: () => void
  toggleLike: (id: string) => void
  addComment: (id: string, name: string, text: string) => void
  addPhoto: (id: string, file: File) => void
  setSlide: (id: string, i: number) => void
  openDetail: (id: string) => void
  closeDetail: () => void
  setSheet: (open: boolean) => void
  setPlaying: (p: FeedState['playing']) => void
  setSetting: (k: keyof Settings, on: boolean) => void
  markRead: (id: string) => void
  setListens: (id: string, n: number) => void
  prepend: (t: Toone) => void
  flash: (text: string) => void
  setHover: (on: boolean) => void
}

const capital = (c: string) => (c.charAt(0).toUpperCase() + c.slice(1)) as Category

function fromApi(s: ApiSound): Toone {
  const name = s.author?.displayName || s.author?.username || 'Someone'
  return {
    id: s.id,
    cat: CATEGORIES.includes(capital(s.category)) ? capital(s.category) : 'Music',
    name,
    handle: s.author ? `@${s.author.username}` : '',
    when: Date.parse(s.createdAt) || Date.now(),
    title: s.title,
    place: s.placeName || 'Somewhere',
    caption: s.description,
    dur: s.durationSec,
    listens: s.playCount,
    lon: s.lon,
    lat: s.lat,
    audioUrl: s.audioUrl || null,
    mine: s.mine,
  }
}

let settleTimer = 0
let toastTimer = 0

export const useFeed = create<FeedState>()((set, get) => {
  const settle = () => {
    window.clearTimeout(settleTimer)
    set({ settling: true })
    settleTimer = window.setTimeout(() => set({ settling: false }), SETTLE_MS)
  }

  return {
    toones: [],
    status: 'idle',
    settling: false,
    tab: 'new',
    cats: [...CATEGORIES],
    liked: readJSON<string[]>(KEYS.liked, []),
    comments: readJSON<Record<string, Comment[]>>(KEYS.comments, {}),
    photos: {},
    slide: {},
    detail: null,
    sheet: false,
    playing: null,
    settings: { ...DEFAULT_SETTINGS, ...readJSON<Partial<Settings>>(KEYS.feedSettings, {}) },
    read: readJSON<string[]>(KEYS.inboxRead, []),
    toast: null,
    origin: null,
    hover: false,

    load: async () => {
      if (get().status === 'loading') return
      set({ status: 'loading' })
      const minimum = new Promise((r) => setTimeout(r, get().toones.length ? 0 : FIRST_SKELETON_MS))
      try {
        const [{ sounds }] = await Promise.all([getSounds({ limit: 50 }), minimum])
        const local = get().toones.filter((t) => t.id.startsWith('local-'))
        set({ toones: [...local, ...sounds.map(fromApi)], status: 'ready' })
      } catch {
        await minimum
        set({ status: 'error' })
      }
    },

    setTab: (tab) => {
      if (tab === get().tab) return
      set({ tab })
      settle()
      if (tab !== 'nearby' || get().origin) return
      if (!navigator.geolocation) {
        get().flash('Location is unavailable, showing newest first')
        return
      }
      navigator.geolocation.getCurrentPosition(
        (p) => set({ origin: [p.coords.longitude, p.coords.latitude] }),
        () => get().flash('Location is off, showing newest first'),
        { timeout: 8000, maximumAge: 600000 },
      )
    },

    toggleCat: (c) => {
      const { cats } = get()
      set({ cats: cats.includes(c) ? cats.filter((v) => v !== c) : CATEGORIES.filter((v) => v === c || cats.includes(v)) })
      settle()
    },

    allCats: () => {
      set({ cats: [...CATEGORIES], tab: get().tab === 'saved' ? 'new' : get().tab })
      settle()
    },

    toggleLike: (id) => {
      const { liked } = get()
      const next = liked.includes(id) ? liked.filter((v) => v !== id) : [...liked, id]
      writeJSON(KEYS.liked, next)
      set({ liked: next })
    },

    addComment: (id, name, text) => {
      const comments = { ...get().comments, [id]: [...(get().comments[id] ?? []), { id: crypto.randomUUID(), name, text, when: Date.now() }] }
      writeJSON(KEYS.comments, comments)
      set({ comments })
    },

    addPhoto: (id, file) => {
      const list = get().photos[id] ?? []
      if (list.length >= 3) return
      const photos = { ...get().photos, [id]: [...list, URL.createObjectURL(file)] }
      set({ photos, slide: { ...get().slide, [id]: list.length } })
    },

    setSlide: (id, i) => set({ slide: { ...get().slide, [id]: i } }),
    openDetail: (detail) => set({ detail }),
    closeDetail: () => set({ detail: null }),
    setSheet: (sheet) => set({ sheet }),
    setPlaying: (playing) => set({ playing }),

    setSetting: (k, on) => {
      const settings = { ...get().settings, [k]: on }
      writeJSON(KEYS.feedSettings, settings)
      set({ settings })
    },

    markRead: (id) => {
      if (get().read.includes(id)) return
      const read = [...get().read, id]
      writeJSON(KEYS.inboxRead, read)
      set({ read })
    },

    setListens: (id, n) => set({ toones: get().toones.map((t) => (t.id === id ? { ...t, listens: n } : t)) }),

    prepend: (t) => {
      set({ toones: [t, ...get().toones], tab: 'new', cats: [...CATEGORIES] })
      settle()
    },

    flash: (text) => {
      window.clearTimeout(toastTimer)
      set({ toast: { text, on: true } })
      toastTimer = window.setTimeout(() => set({ toast: { text, on: false } }), TOAST_MS)
    },

    setHover: (hover) => set({ hover }),
  }
})

export function shareToone(t: Toone) {
  const url = `${location.origin}/feed?toone=${encodeURIComponent(t.id)}`
  void navigator.clipboard?.writeText(url).catch(() => undefined)
  useFeed.getState().flash('Link copied')
}

export function visibleToones(s: Pick<FeedState, 'toones' | 'cats' | 'tab' | 'liked' | 'origin'>) {
  let list = s.toones.filter((t) => s.cats.includes(t.cat))
  if (s.tab === 'saved') list = list.filter((t) => s.liked.includes(t.id))
  const origin = s.origin
  if (s.tab === 'nearby' && origin) list = [...list].sort((a, b) => angularDistance(origin, [a.lon, a.lat]) - angularDistance(origin, [b.lon, b.lat]))
  return list
}

/** Built from the feed itself: the backend has no notifications endpoint yet. */
export function inboxMessages(toones: Toone[]): InboxMessage[] {
  const out: InboxMessage[] = []
  for (const t of toones) {
    if (t.mine && t.listens > 0) {
      const n = t.listens
      out.push({ id: `listens:${t.id}:${n}`, initial: 'T', cat: t.cat, text: `Your Toone “${t.title}” has ${n} ${n === 1 ? 'listen' : 'listens'}`, when: t.when })
    }
  }
  for (const t of toones.filter((x) => !x.mine).slice(0, 6)) {
    out.push({ id: `drop:${t.id}`, initial: t.name.charAt(0).toUpperCase(), cat: t.cat, text: `${t.name} dropped “${t.title}” in ${t.place}`, when: t.when })
  }
  return out.sort((a, b) => b.when - a.when)
}

export const unreadCount = (s: Pick<FeedState, 'toones' | 'read'>) => inboxMessages(s.toones).filter((m) => !s.read.includes(m.id)).length
