import { create } from 'zustand'
import { sanitizeLook, type Look } from '../../characters/avatar'
import { deleteComment, getComments, getSounds, getToken, likeSound, postComment, unlikeSound, uploadPhoto, type ApiComment, type ApiSound } from '../../lib/api'
import { canonicalAudioSetLabel } from '../../lib/audioSetLabels'
import { angularDistance, type LngLat } from '../../lib/geo'
import { KEYS, readJSON, writeJSON } from '../../lib/storage'

export type Toone = {
  id: string
  /** AudioSet class display name. */
  cat: string
  name: string
  handle: string
  when: number
  title: string
  place: string
  caption: string
  /** Seconds. */
  dur: number
  listens: number
  likes: number
  /** The signed-in user liked it. */
  liked: boolean
  comments: number
  lon: number
  lat: number
  audioUrl: string | null
  mine: boolean
  /** The author's character, when they've saved one. */
  look?: Look | null
}

export type Comment = { id: string; name: string; handle: string; look: Look | null; text: string; when: number; canDelete: boolean }
export type Thread = { status: 'loading' | 'ready' | 'error'; items: Comment[]; nextBefore: string | null }
export type Tab = 'nearby' | 'new' | 'saved'
export type Settings = { autoplay: boolean; react: boolean; notify: boolean }
export type InboxMessage = { id: string; initial: string; cat: string; text: string; when: number }

const DEFAULT_SETTINGS: Settings = { autoplay: true, react: true, notify: true }
const FIRST_SKELETON_MS = 1100
const SETTLE_MS = 500
const TOAST_MS = 2000

type FeedState = {
  toones: Toone[]
  status: 'idle' | 'loading' | 'ready' | 'error'
  /** Brief skeleton after a tab change. */
  settling: boolean
  tab: Tab
  /** Loaded when a Toone's drawer opens, newest first. */
  threads: Record<string, Thread>
  /** Server photo URLs, plus object URLs for uploads in flight and for Toones that only live on this device. */
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
  toggleLike: (id: string) => void
  loadComments: (id: string, more?: boolean) => Promise<void>
  /** Resolves true once the server accepted it. */
  addComment: (id: string, text: string) => Promise<boolean>
  removeComment: (id: string, commentId: string) => Promise<void>
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

function fromApi(s: ApiSound): Toone {
  const name = s.author?.displayName || s.author?.username || 'Someone'
  return {
    id: s.id,
    cat: canonicalAudioSetLabel(s.category) ?? s.category,
    name,
    handle: s.author ? `@${s.author.username}` : '',
    when: Date.parse(s.createdAt) || Date.now(),
    title: s.title,
    place: s.placeName || 'Somewhere',
    caption: s.description,
    dur: s.durationSec,
    listens: s.playCount,
    likes: s.likeCount ?? 0,
    liked: !!s.liked,
    comments: s.commentCount ?? 0,
    lon: s.lon,
    lat: s.lat,
    audioUrl: s.audioUrl || null,
    mine: s.mine,
    look: s.author?.look ? sanitizeLook(s.author.look) : null,
  }
}

function commentFromApi(c: ApiComment): Comment {
  return {
    id: c.id,
    name: c.author?.displayName || c.author?.username || 'Someone',
    handle: c.author ? `@${c.author.username}` : '',
    look: c.author?.look ? sanitizeLook(c.author.look) : null,
    text: c.text,
    when: Date.parse(c.createdAt) || Date.now(),
    canDelete: c.canDelete,
  }
}

const errorText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

let settleTimer = 0
let toastTimer = 0
/** Latest like request per Toone, so an older response can't overwrite a newer tap. */
const likeSeq: Record<string, number> = {}

export const useFeed = create<FeedState>()((set, get) => {
  const patch = (id: string, change: Partial<Toone>) => set({ toones: get().toones.map((t) => (t.id === id ? { ...t, ...change } : t)) })
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
    threads: {},
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
        const photos = { ...get().photos }
        for (const s of sounds) if (s.photos?.length) photos[s.id] = s.photos
        set({ toones: [...local, ...sounds.map(fromApi)], photos, status: 'ready' })
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

    toggleLike: (id) => {
      const toone = get().toones.find((t) => t.id === id)
      if (!toone) return
      if (id.startsWith('local-')) return get().flash('Sign in and share this Toone first')
      if (!getToken()) return get().flash('Sign in to like Toones')

      const liked = !toone.liked
      patch(id, { liked, likes: Math.max(0, toone.likes + (liked ? 1 : -1)) })
      const seq = (likeSeq[id] = (likeSeq[id] ?? 0) + 1)
      ;(liked ? likeSound : unlikeSound)(id)
        .then((r) => {
          if (likeSeq[id] === seq) patch(id, { liked: r.liked, likes: r.likeCount })
        })
        .catch((e: unknown) => {
          if (likeSeq[id] !== seq) return
          patch(id, { liked: toone.liked, likes: toone.likes })
          get().flash(errorText(e, 'Couldn’t save your like'))
        })
    },

    loadComments: async (id, more = false) => {
      if (id.startsWith('local-')) {
        set({ threads: { ...get().threads, [id]: { status: 'ready', items: [], nextBefore: null } } })
        return
      }
      const prev = get().threads[id]
      if (prev?.status === 'loading' || (more && !prev?.nextBefore)) return
      const before = more ? prev?.nextBefore ?? undefined : undefined
      const keep = more ? prev?.items ?? [] : []
      set({ threads: { ...get().threads, [id]: { status: 'loading', items: prev?.items ?? [], nextBefore: prev?.nextBefore ?? null } } })
      try {
        const r = await getComments(id, { before })
        const items = [...keep, ...r.comments.map(commentFromApi)]
        set({ threads: { ...get().threads, [id]: { status: 'ready', items, nextBefore: r.nextBefore } } })
        patch(id, { comments: r.commentCount })
      } catch {
        set({ threads: { ...get().threads, [id]: { status: 'error', items: prev?.items ?? [], nextBefore: prev?.nextBefore ?? null } } })
      }
    },

    addComment: async (id, text) => {
      if (id.startsWith('local-')) {
        get().flash('Sign in and share this Toone first')
        return false
      }
      if (!getToken()) {
        get().flash('Sign in to comment')
        return false
      }
      try {
        const r = await postComment(id, text)
        const thread = get().threads[id] ?? { status: 'ready', items: [], nextBefore: null }
        set({ threads: { ...get().threads, [id]: { ...thread, items: [commentFromApi(r.comment), ...thread.items] } } })
        patch(id, { comments: r.commentCount })
        return true
      } catch (e) {
        get().flash(errorText(e, 'Couldn’t post your comment'))
        return false
      }
    },

    removeComment: async (id, commentId) => {
      try {
        const r = await deleteComment(id, commentId)
        const thread = get().threads[id]
        if (thread) set({ threads: { ...get().threads, [id]: { ...thread, items: thread.items.filter((c) => c.id !== commentId) } } })
        patch(id, { comments: r.commentCount })
      } catch (e) {
        get().flash(errorText(e, 'Couldn’t delete the comment'))
      }
    },

    addPhoto: (id, file) => {
      const list = get().photos[id] ?? []
      if (list.length >= 3) return
      const preview = URL.createObjectURL(file)
      set({ photos: { ...get().photos, [id]: [...list, preview] }, slide: { ...get().slide, [id]: list.length } })
      if (id.startsWith('local-') || !getToken()) return

      const without = () => (get().photos[id] ?? []).filter((src) => src !== preview)
      uploadPhoto(id, file)
        .then(({ photos }) => {
          // Keep any other previews still uploading after the server's list.
          const pending = without().filter((src) => src.startsWith('blob:'))
          set({ photos: { ...get().photos, [id]: [...photos, ...pending] } })
        })
        .catch((e: unknown) => {
          set({ photos: { ...get().photos, [id]: without() } })
          get().flash(e instanceof Error ? e.message : 'Couldn’t upload the photo')
        })
        .finally(() => URL.revokeObjectURL(preview))
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

    setListens: (id, n) => patch(id, { listens: n }),

    prepend: (t) => {
      set({ toones: [t, ...get().toones], tab: 'new' })
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

export function visibleToones(s: Pick<FeedState, 'toones' | 'tab' | 'origin'>) {
  let list = s.toones
  if (s.tab === 'saved') list = list.filter((t) => t.liked)
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
