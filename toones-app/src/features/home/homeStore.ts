import { create } from 'zustand'
import { CATEGORIES, type Category } from '../../components/characters/clay'
import { countryAt, nearCity, type LngLat, type SearchResult } from '../../lib/geo'
import { KEYS, read, readJSON, write, writeJSON } from '../../lib/storage'
import { XP_PER_DROP, XP_PER_LISTEN, levelFromXp } from '../../lib/xp'
import { initialPanelOpen } from './layout'

export type Drop = {
  id: string
  title: string
  cat: Category
  /** Seconds. */
  dur: number
  when: number
  lon: number
  lat: number
  /** Country name, or "Open water". */
  place: string
  listened?: boolean
  /** True when the mic was blocked and playback synthesizes a stand-in. */
  standIn?: boolean
}

export type Spot = { lon: number; lat: number; place: string; city: string | null }
export type Layers = { labels: boolean; borders: boolean; sun: boolean; spin: boolean }
export type User = { name: string; email: string }

/** Imperative camera controls, registered by the Globe once the map exists. */
export type GlobeApi = {
  flyTo: (center: LngLat, zoom?: number) => void
  fitBounds: (bounds: [LngLat, LngLat]) => void
  zoomBy: (delta: number) => void
  wholeEarth: () => void
  center: () => LngLat
  zoom: () => number
  /** Zoom at which the whole Earth fits its HUD-free box. */
  fitZoom: () => number
}

type HomeState = {
  user: User
  drops: Drop[]
  xp: number
  listens: number
  visible: Category[]
  panelOpen: boolean
  panelTab: 'drops' | 'places'
  spot: Spot | null
  /** Place under the globe center, for the hint pill. */
  looking: { lon: number; lat: number; label: string } | null
  playing: { id: string; elapsed: number } | null
  recordOpen: boolean
  layers: Layers
  toast: { id: number; text: string } | null
  globe: GlobeApi | null

  setGlobe: (g: GlobeApi | null) => void
  toggleCategory: (c: Category) => void
  setPanel: (open: boolean) => void
  setPanelTab: (t: 'drops' | 'places') => void
  selectSpot: (lon: number, lat: number) => void
  clearSpot: () => void
  setLooking: (lon: number, lat: number, label: string) => void
  setLayer: (k: keyof Layers, on: boolean) => void
  openRecord: () => void
  closeRecord: () => void
  addDrop: (d: Omit<Drop, 'id' | 'when' | 'place'> & { id?: string }) => Drop
  markListened: (id: string) => void
  setPlaying: (p: HomeState['playing']) => void
  flash: (text: string) => void
  goTo: (r: SearchResult) => void
  signOut: () => void
}

const DEFAULT_LAYERS: Layers = { labels: true, borders: true, sun: true, spin: true }

function spotAt(lon: number, lat: number): Spot {
  return { lon, lat, place: countryAt(lon, lat) ?? 'Open water', city: nearCity(lon, lat) }
}

export const spotLabel = (s: Pick<Spot, 'place' | 'city'>) => (s.city && s.city !== s.place ? `${s.city}, ${s.place}` : s.place)

export const useHome = create<HomeState>()((set, get) => ({
  user: readJSON<User>(KEYS.user, { name: '', email: '' }),
  drops: readJSON<Drop[]>(KEYS.drops, []),
  xp: Number(read(KEYS.xp) ?? 0) || 0,
  listens: Number(read(KEYS.listens) ?? 0) || 0,
  visible: [...CATEGORIES],
  panelOpen: initialPanelOpen(),
  panelTab: 'drops',
  spot: null,
  looking: null,
  playing: null,
  recordOpen: false,
  layers: { ...DEFAULT_LAYERS, ...readJSON<Partial<Layers>>(KEYS.layers, {}) },
  toast: null,
  globe: null,

  setGlobe: (globe) => set({ globe }),

  toggleCategory: (c) =>
    set(({ visible }) => {
      if (visible.includes(c)) return { visible: visible.length === 1 ? [...CATEGORIES] : visible.filter((v) => v !== c) }
      return { visible: CATEGORIES.filter((v) => v === c || visible.includes(v)) }
    }),

  setPanel: (panelOpen) => set({ panelOpen }),
  setPanelTab: (panelTab) => set({ panelTab }),
  selectSpot: (lon, lat) => set({ spot: spotAt(lon, lat) }),
  clearSpot: () => set({ spot: null }),
  setLooking: (lon, lat, label) => set({ looking: { lon, lat, label } }),
  setLayer: (k, on) => {
    const layers = { ...get().layers, [k]: on }
    writeJSON(KEYS.layers, layers)
    set({ layers })
  },

  openRecord: () => {
    const { spot, globe } = get()
    if (!spot && globe) {
      const [lon, lat] = globe.center()
      set({ spot: spotAt(lon, lat) })
    }
    set({ recordOpen: true })
  },
  closeRecord: () => set({ recordOpen: false }),

  addDrop: (input) => {
    const { drops, xp, visible } = get()
    const drop: Drop = { ...input, id: input.id ?? crypto.randomUUID(), when: Date.now(), place: countryAt(input.lon, input.lat) ?? 'Open water' }
    const nextXp = xp + XP_PER_DROP
    const levelled = levelFromXp(nextXp) > levelFromXp(xp)
    const next = [drop, ...drops]
    writeJSON(KEYS.drops, next)
    write(KEYS.xp, String(nextXp))
    set({
      drops: next,
      xp: nextXp,
      spot: null,
      recordOpen: false,
      visible: visible.includes(drop.cat) ? visible : CATEGORIES.filter((v) => v === drop.cat || visible.includes(v)),
    })
    get().flash(levelled ? `Dropped in ${drop.place} · Lv ${levelFromXp(nextXp)}` : `Dropped in ${drop.place} · +${XP_PER_DROP} xp`)
    return drop
  },

  markListened: (id) => {
    const { drops, xp, listens } = get()
    const first = drops.find((d) => d.id === id && !d.listened)
    const nextDrops = first ? drops.map((d) => (d.id === id ? { ...d, listened: true } : d)) : drops
    const nextXp = first ? xp + XP_PER_LISTEN : xp
    writeJSON(KEYS.drops, nextDrops)
    write(KEYS.xp, String(nextXp))
    write(KEYS.listens, String(listens + 1))
    set({ drops: nextDrops, xp: nextXp, listens: listens + 1 })
  },

  setPlaying: (playing) => set({ playing }),

  flash: (text) => {
    const id = Date.now()
    set({ toast: { id, text } })
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 2600)
  },

  goTo: (r) => {
    const { globe } = get()
    if (!globe) return
    if (r.kind === 'city') {
      globe.flyTo(r.center, 7)
      set({ spot: spotAt(r.center[0], r.center[1]) })
    } else if (r.bounds) globe.fitBounds(r.bounds)
    else globe.flyTo(r.center, 4)
  },

  signOut: () => {
    write(KEYS.user, null)
    set({ user: { name: '', email: '' } })
  },
}))

/** Mutable per-frame signals the globe overlay reads without re-rendering React. */
export const live = {
  /** 0..1 audio level while recording or playing. */
  level: 0,
  recording: false,
  /** performance.now() until which every character wears a happy face. */
  happyUntil: 0,
  /** Drop id → performance.now() when it was added, for the pop-in. */
  popped: new Map<string, number>(),
  /** Drop id → requested hop (consumed by the overlay). */
  hops: new Set<string>(),
}

export const displayName = (u: User) => u.name.trim() || (u.email ? u.email.split('@')[0] : '') || 'Local explorer'
