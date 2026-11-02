/* Dress-up options for a user's character: pick one per category, like a Snapchat Bitmoji.
   Everything draws in the character's local space (origin = base center, y up is negative),
   so it follows each species' size and eye positions. */

import type { SpeciesId } from './clay'

export type HairId = 'none' | 'tuft' | 'bun' | 'pigtails' | 'curls' | 'mohawk' | 'bob' | 'long'
export type HatId = 'none' | 'beanie' | 'cap' | 'bucket' | 'party' | 'catears' | 'headphones' | 'crown' | 'halo'
export type GlassesId = 'none' | 'round' | 'square' | 'shades' | 'star' | 'heart' | 'monocle' | 'goggles'
export type EyesId = 'round' | 'sleepy' | 'lashes' | 'wink' | 'star'
export type MouthId = 'smile' | 'grin' | 'smirk' | 'meh' | 'tongue'
export type OutfitId = 'none' | 'stripes' | 'polka' | 'scarf' | 'bowtie' | 'hoodie' | 'overalls' | 'cape'
export type FacialId = 'none' | 'mustache' | 'handlebar' | 'goatee' | 'chinstrap' | 'stubble' | 'beard'
export type BackgroundId = 'none' | 'sky' | 'mint' | 'cream' | 'sunset' | 'dusk'

export type Dress = {
  hair: HairId
  hairColor: number
  hat: HatId
  glasses: GlassesId
  eyes: EyesId
  mouth: MouthId
  outfit: OutfitId
  facial: FacialId
  /** Tint for hats and outfits. */
  color: number
}
export type Look = Dress & { species: SpeciesId; bg: BackgroundId }

/** What a user must reach to wear an item: a level, or a badge by name. */
export type Lock = { level: number } | { badge: string }

export type Option<T extends string> = { id: T; label: string; lock?: Lock }

/** What the user has earned so far. */
export type Progress = { level: number; badges: readonly string[] }

export const isUnlocked = (o: { lock?: Lock }, p: Progress) => !o.lock || ('level' in o.lock ? p.level >= o.lock.level : p.badges.includes(o.lock.badge))
export const lockHint = (lock: Lock) => ('level' in lock ? `Level ${lock.level}` : `${lock.badge} badge`)

export const SPECIES_OPTIONS: readonly Option<SpeciesId>[] = [
  { id: 'pip', label: 'Pip' },
  { id: 'moss', label: 'Moss' },
  { id: 'ima', label: 'Ima' },
  { id: 'sol', label: 'Sol' },
  { id: 'tomo', label: 'Tomo' },
  { id: 'ned', label: 'Ned' },
]

export const HAIR: readonly Option<HairId>[] = [
  { id: 'none', label: 'None' },
  { id: 'tuft', label: 'Tuft' },
  { id: 'bun', label: 'Bun' },
  { id: 'pigtails', label: 'Pigtails' },
  { id: 'curls', label: 'Curls' },
  { id: 'bob', label: 'Bob' },
  { id: 'long', label: 'Long', lock: { level: 2 } },
  { id: 'mohawk', label: 'Mohawk', lock: { level: 3 } },
]

export const HATS: readonly Option<HatId>[] = [
  { id: 'none', label: 'None' },
  { id: 'beanie', label: 'Beanie' },
  { id: 'cap', label: 'Cap' },
  { id: 'bucket', label: 'Bucket' },
  { id: 'party', label: 'Party' },
  { id: 'catears', label: 'Cat ears', lock: { level: 2 } },
  { id: 'headphones', label: 'Headphones', lock: { badge: 'Listener' } },
  { id: 'crown', label: 'Crown', lock: { badge: 'Explorer' } },
  { id: 'halo', label: 'Halo', lock: { level: 5 } },
]

export const GLASSES: readonly Option<GlassesId>[] = [
  { id: 'none', label: 'None' },
  { id: 'round', label: 'Round' },
  { id: 'square', label: 'Square' },
  { id: 'shades', label: 'Shades' },
  { id: 'star', label: 'Stars' },
  { id: 'heart', label: 'Hearts', lock: { level: 2 } },
  { id: 'goggles', label: 'Goggles', lock: { badge: 'First Drop' } },
  { id: 'monocle', label: 'Monocle', lock: { level: 4 } },
]

export const EYES: readonly Option<EyesId>[] = [
  { id: 'round', label: 'Round' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'lashes', label: 'Lashes' },
  { id: 'wink', label: 'Wink' },
  { id: 'star', label: 'Starry', lock: { badge: 'First Drop' } },
]

export const MOUTHS: readonly Option<MouthId>[] = [
  { id: 'smile', label: 'Smile' },
  { id: 'grin', label: 'Grin' },
  { id: 'smirk', label: 'Smirk' },
  { id: 'meh', label: 'Meh' },
  { id: 'tongue', label: 'Tongue', lock: { level: 2 } },
]

export const OUTFITS: readonly Option<OutfitId>[] = [
  { id: 'none', label: 'None' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'polka', label: 'Polka' },
  { id: 'scarf', label: 'Scarf' },
  { id: 'bowtie', label: 'Bow tie' },
  { id: 'hoodie', label: 'Hoodie' },
  { id: 'overalls', label: 'Overalls', lock: { level: 2 } },
  { id: 'cape', label: 'Cape', lock: { level: 5 } },
]

export const FACIAL: readonly Option<FacialId>[] = [
  { id: 'none', label: 'None' },
  { id: 'stubble', label: 'Stubble' },
  { id: 'mustache', label: 'Mustache' },
  { id: 'goatee', label: 'Goatee' },
  { id: 'chinstrap', label: 'Chin strap' },
  { id: 'beard', label: 'Beard', lock: { level: 2 } },
  { id: 'handlebar', label: 'Handlebar', lock: { level: 3 } },
]

type BackgroundOption = Option<BackgroundId> & { stops: [top: string, bottom: string] | null }

export const BACKGROUNDS: readonly BackgroundOption[] = [
  { id: 'none', label: 'Plain', stops: null },
  { id: 'sky', label: 'Sky', stops: ['#CDE3F5', '#9BC3E6'] },
  { id: 'mint', label: 'Mint', stops: ['#D5EBDD', '#9CC9B4'] },
  { id: 'cream', label: 'Cream', stops: ['#F7F2E8', '#E4DCCB'] },
  { id: 'sunset', label: 'Sunset', stops: ['#F6C79A', '#E58AA8'], lock: { level: 3 } },
  { id: 'dusk', label: 'Dusk', stops: ['#4A5C8A', '#16223F'], lock: { level: 4 } },
]

/** Backdrop colors for a portrait, or null for none. */
export const backgroundStops = (id: BackgroundId) => BACKGROUNDS.find((b) => b.id === id)?.stops ?? null

/** CSS for a portrait backdrop; empty when the look has no background. */
export const backgroundCss = (id: BackgroundId) => {
  const s = backgroundStops(id)
  return s ? `linear-gradient(170deg, ${s[0]}, ${s[1]})` : ''
}

/** Tints for hats and outfits. */
export const COLORS: readonly { name: string; hex: string }[] = [
  { name: 'Terracotta', hex: '#C45C3E' },
  { name: 'Gold', hex: '#E0B040' },
  { name: 'Teal', hex: '#2A9D8F' },
  { name: 'Sky', hex: '#4F8FD0' },
  { name: 'Rose', hex: '#E58AA8' },
  { name: 'Cream', hex: '#F4EFE6' },
]

/** Hair and facial hair share one palette. */
export const HAIR_COLORS: readonly { name: string; hex: string }[] = [
  { name: 'Brown', hex: '#3A2A20' },
  { name: 'Black', hex: '#1C1C24' },
  { name: 'Blonde', hex: '#D8B25A' },
  { name: 'Ginger', hex: '#B5532E' },
  { name: 'Grey', hex: '#A8AEB8' },
  { name: 'Pink', hex: '#E58AA8' },
  { name: 'Blue', hex: '#4F8FD0' },
]

export const DEFAULT_LOOK: Look = {
  species: 'pip',
  bg: 'none',
  hair: 'none',
  hairColor: 0,
  hat: 'none',
  glasses: 'none',
  eyes: 'round',
  mouth: 'smile',
  outfit: 'none',
  facial: 'none',
  color: 0,
}

const INK = '#1B2430'
const TAU = Math.PI * 2

/** Coerces stored JSON into a valid look, so a removed option never breaks rendering. */
export function sanitizeLook(raw: unknown): Look {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Look, unknown>>
  const pick = <T extends string>(opts: readonly Option<T>[], v: unknown, fallback: T) => (opts.some((o) => o.id === v) ? (v as T) : fallback)
  const idx = (v: unknown, n: number) => (typeof v === 'number' && v >= 0 && v < n ? Math.floor(v) : 0)
  return {
    species: pick(SPECIES_OPTIONS, r.species, DEFAULT_LOOK.species),
    bg: pick(BACKGROUNDS, r.bg, 'none'),
    hair: pick(HAIR, r.hair, 'none'),
    hairColor: idx(r.hairColor, HAIR_COLORS.length),
    hat: pick(HATS, r.hat, 'none'),
    glasses: pick(GLASSES, r.glasses, 'none'),
    eyes: pick(EYES, r.eyes, 'round'),
    mouth: pick(MOUTHS, r.mouth, 'smile'),
    outfit: pick(OUTFITS, r.outfit, 'none'),
    facial: pick(FACIAL, r.facial, 'none'),
    color: idx(r.color, COLORS.length),
  }
}

/** Whether every locked piece of the look has been earned. */
export const lookUnlocked = (look: Look, p: Progress) =>
  (
    [
      [SPECIES_OPTIONS, look.species],
      [BACKGROUNDS, look.bg],
      [HAIR, look.hair],
      [HATS, look.hat],
      [GLASSES, look.glasses],
      [EYES, look.eyes],
      [MOUTHS, look.mouth],
      [OUTFITS, look.outfit],
      [FACIAL, look.facial],
    ] as [readonly Option<string>[], string][]
  ).every(([opts, id]) => {
    const o = opts.find((x) => x.id === id)
    return !o || isUnlocked(o, p)
  })

/** The parts of a look that can have a level lock, with their editor names. */
const LOCKABLE = [
  ['hair', 'Hair', HAIR],
  ['hat', 'Hat', HATS],
  ['glasses', 'Glasses', GLASSES],
  ['eyes', 'Eyes', EYES],
  ['mouth', 'Mouth', MOUTHS],
  ['outfit', 'Outfit', OUTFITS],
  ['facial', 'Facial hair', FACIAL],
  ['bg', 'Backdrop', BACKGROUNDS],
] as const

export type LevelUnlock = { part: (typeof LOCKABLE)[number][0]; partLabel: string; id: string; label: string }

/** The items that unlock at exactly this level, in editor order. */
export function unlocksAtLevel(level: number): LevelUnlock[] {
  return LOCKABLE.flatMap(([part, partLabel, opts]) =>
    (opts as readonly Option<string>[]).filter((o) => o.lock && 'level' in o.lock && o.lock.level === level).map((o) => ({ part, partLabel, id: o.id, label: o.label })),
  )
}

/** A random look using only what the user has earned. */
export function randomLook(p: Progress): Look {
  const any = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
  const open = <T extends string>(opts: readonly Option<T>[]) => any(opts.filter((o) => isUnlocked(o, p))).id
  return {
    species: open(SPECIES_OPTIONS),
    bg: open(BACKGROUNDS),
    hair: open(HAIR),
    hairColor: Math.floor(Math.random() * HAIR_COLORS.length),
    hat: open(HATS),
    glasses: open(GLASSES),
    eyes: open(EYES),
    mouth: open(MOUTHS),
    outfit: open(OUTFITS),
    facial: open(FACIAL),
    color: Math.floor(Math.random() * COLORS.length),
  }
}

/** Where things sit on one character, shared by every accessory. */
export type Face = {
  cw: number
  chh: number
  k: number
  rt: number
  ey: number
  gap: number
  er: number
  my: number
  night: number
  /** Body color, for lids. */
  fill: string
  /** False while blinking, asleep or beaming. */
  open: boolean
}

const shade = (hex: string, amt: number) => {
  const n = Number.parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.round(Math.max(0, Math.min(255, v + 255 * amt)))
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}

/** Body-surface height at x: where the rounded top of the body actually is. */
const surfaceY = (f: Face, x: number) => {
  const dx = Math.max(0, Math.abs(x) - (f.cw / 2 - f.rt))
  return -f.chh + f.rt - Math.sqrt(Math.max(0, f.rt * f.rt - dx * dx))
}

const colors = (d: Dress) => ({ col: COLORS[d.color]?.hex ?? COLORS[0].hex, hair: HAIR_COLORS[d.hairColor]?.hex ?? HAIR_COLORS[0].hex })

/** Thin shell of hair following the top of the head between x = ±half. */
function hairCap(g: CanvasRenderingContext2D, f: Face, half: number, thick: number) {
  const steps = 14
  g.beginPath()
  for (let i = 0; i <= steps; i++) {
    const x = -half + (2 * half * i) / steps
    const lift = thick * (0.55 + 0.45 * Math.cos((x / half) * (Math.PI / 2)))
    g[i ? 'lineTo' : 'moveTo'](x, surfaceY(f, x) - lift)
  }
  for (let i = steps; i >= 0; i--) {
    const x = -half + (2 * half * i) / steps
    g.lineTo(x, surfaceY(f, x) + 2 * f.k)
  }
  g.closePath()
  g.fill()
}

const headHalf = (f: Face) => Math.min(f.cw * 0.5, 44 * f.k)

/** Things that sit behind the body: long hair panels, capes. Call before the body is drawn. */
export function drawBack(g: CanvasRenderingContext2D, f: Face, d: Dress) {
  const { cw, chh, k, rt } = f
  const { col, hair } = colors(d)

  if (d.outfit === 'cape') {
    g.fillStyle = col
    g.beginPath()
    g.moveTo(-cw / 2 + 4 * k, -chh * 0.42)
    g.lineTo(cw / 2 - 4 * k, -chh * 0.42)
    g.lineTo(cw / 2 + 14 * k, 2 * k)
    g.lineTo(-cw / 2 - 14 * k, 2 * k)
    g.closePath()
    g.fill()
    g.fillStyle = 'rgba(27,36,48,.18)'
    g.fillRect(-cw / 2 - 12 * k, -4 * k, cw + 24 * k, 4 * k)
  }

  if (d.hair === 'bob' || d.hair === 'long') {
    const bottom = d.hair === 'bob' ? -chh * 0.5 : -chh * 0.14
    const top = -chh + rt * 0.55
    g.fillStyle = hair
    g.beginPath()
    g.roundRect(-cw / 2 - 7 * k, top, cw + 14 * k, Math.max(10 * k, bottom - top), [rt * 0.6, rt * 0.6, 12 * k, 12 * k])
    g.fill()
  }
}

/** Outfit and facial hair live on the body, so the caller clips them to the body shape first. */
export function drawBodyDress(g: CanvasRenderingContext2D, f: Face, d: Dress) {
  const { cw, chh, k, er, my } = f
  const { col, hair } = colors(d)
  const left = -cw / 2 - 2
  const top = -chh * 0.3

  if (d.outfit === 'stripes') {
    g.fillStyle = col
    g.fillRect(left, top, cw + 4, chh)
    g.fillStyle = shade(col, -0.16)
    const band = Math.max(4, 7 * k)
    for (let y = top + band; y < 0; y += band * 2) g.fillRect(left, y, cw + 4, band)
  } else if (d.outfit === 'polka') {
    g.fillStyle = col
    g.fillRect(left, top, cw + 4, chh)
    g.fillStyle = shade(col, 0.28)
    const step = Math.max(10, 15 * k)
    for (let y = top + step * 0.6, row = 0; y < 0; y += step * 0.8, row++) {
      for (let x = left + (row % 2 ? step : step * 0.5); x < cw / 2; x += step) {
        g.beginPath()
        g.arc(x, y, Math.max(1.8, 3 * k), 0, TAU)
        g.fill()
      }
    }
  } else if (d.outfit === 'hoodie') {
    const y0 = -chh * 0.34
    g.fillStyle = col
    g.fillRect(left, y0, cw + 4, chh)
    g.fillStyle = shade(col, -0.14)
    g.beginPath()
    g.roundRect(-cw * 0.26, -chh * 0.12, cw * 0.52, chh * 0.1, [0, 0, 8 * k, 8 * k])
    g.fill()
    g.strokeStyle = '#F4EFE6'
    g.lineWidth = Math.max(1.5, 2 * k)
    g.lineCap = 'round'
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(s * cw * 0.09, y0 + 2 * k)
      g.lineTo(s * cw * 0.1, y0 + chh * 0.1)
      g.stroke()
    }
  } else if (d.outfit === 'scarf') {
    const h = Math.max(10, chh * 0.12)
    const y = -chh * 0.22 - h / 2
    g.fillStyle = col
    g.fillRect(left, y, cw + 4, h)
    g.fillStyle = shade(col, -0.16)
    for (let x = left + h * 0.5; x < cw / 2; x += h * 0.9) g.fillRect(x, y, h * 0.25, h)
    const tx = cw * 0.18
    g.fillStyle = col
    g.beginPath()
    g.roundRect(tx, y + h * 0.6, h * 0.8, h * 2.1, h * 0.25)
    g.fill()
    g.fillStyle = shade(col, -0.16)
    g.fillRect(tx, y + h * 2.1, h * 0.8, h * 0.25)
  } else if (d.outfit === 'overalls') {
    const denim = '#3D5A8A'
    g.fillStyle = denim
    g.fillRect(left, -chh * 0.2, cw + 4, chh)
    g.fillStyle = shade(denim, 0.1)
    g.beginPath()
    g.roundRect(-cw * 0.2, -chh * 0.2 - 2, cw * 0.4, chh * 0.2 + 2, [6 * k, 6 * k, 0, 0])
    g.fill()
    g.fillStyle = '#E8D9A8'
    for (const s of [-1, 1]) {
      g.beginPath()
      g.arc(s * cw * 0.24, -chh * 0.2 + 2, Math.max(2, 3 * k), 0, TAU)
      g.fill()
    }
  } else if (d.outfit === 'bowtie') {
    const bw = Math.max(10, cw * 0.17)
    const bh = bw * 0.62
    const y = -chh * 0.2
    g.fillStyle = col
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(s * bw, y - bh)
      g.lineTo(s * bw, y + bh)
      g.closePath()
      g.fill()
    }
    g.fillStyle = shade(col, -0.2)
    g.beginPath()
    g.roundRect(-bw * 0.22, y - bh * 0.4, bw * 0.44, bh * 0.8, bw * 0.12)
    g.fill()
  }

  // Facial hair sits in the gap between the eyes and the chin; the mouth is drawn over it
  const mw = f.gap * 1.25
  g.fillStyle = hair
  g.strokeStyle = hair
  g.lineCap = 'round'
  if (d.facial === 'mustache') {
    const y = my - er * 0.85
    g.beginPath()
    g.moveTo(0, y - er * 0.2)
    g.bezierCurveTo(mw * 0.45, y - er * 0.7, mw, y - er * 0.2, mw * 0.95, y + er * 0.35)
    g.bezierCurveTo(mw * 0.5, y + er * 0.05, mw * 0.2, y + er * 0.1, 0, y + er * 0.25)
    g.bezierCurveTo(-mw * 0.2, y + er * 0.1, -mw * 0.5, y + er * 0.05, -mw * 0.95, y + er * 0.35)
    g.bezierCurveTo(-mw, y - er * 0.2, -mw * 0.45, y - er * 0.7, 0, y - er * 0.2)
    g.fill()
  } else if (d.facial === 'handlebar') {
    const y = my - er * 0.85
    g.lineWidth = Math.max(2.5, er * 0.5)
    g.beginPath()
    g.moveTo(0, y)
    g.bezierCurveTo(mw * 0.35, y + er * 0.3, mw * 0.8, y + er * 0.35, mw * 1.05, y - er * 0.55)
    g.moveTo(0, y)
    g.bezierCurveTo(-mw * 0.35, y + er * 0.3, -mw * 0.8, y + er * 0.35, -mw * 1.05, y - er * 0.55)
    g.stroke()
  } else if (d.facial === 'goatee') {
    g.beginPath()
    g.roundRect(-er * 0.95, my + er * 0.95, er * 1.9, Math.max(er * 1.1, -(my + er * 0.95)), er * 0.7)
    g.fill()
  } else if (d.facial === 'chinstrap') {
    g.lineWidth = Math.max(2.5, er * 0.5)
    g.beginPath()
    g.moveTo(-f.gap * 1.6, my - er * 1.5)
    g.quadraticCurveTo(-f.gap * 1.5, my + er * 1.2, 0, my + er * 1.25)
    g.quadraticCurveTo(f.gap * 1.5, my + er * 1.2, f.gap * 1.6, my - er * 1.5)
    g.stroke()
  } else if (d.facial === 'stubble') {
    g.globalAlpha = 0.55
    const step = Math.max(4, er * 0.55)
    for (let y = my + er * 0.8, row = 0; y < my + er * 3.2; y += step, row++) {
      for (let x = -f.gap * 1.3 + (row % 2) * step * 0.5; x <= f.gap * 1.3; x += step) {
        g.beginPath()
        g.arc(x, y, Math.max(0.8, er * 0.09), 0, TAU)
        g.fill()
      }
    }
    g.globalAlpha = 1
  } else if (d.facial === 'beard') {
    const y = my + er * 0.95
    g.beginPath()
    g.moveTo(-cw / 2, my - er * 1.2)
    g.lineTo(-f.gap * 1.35, my - er * 0.4)
    g.quadraticCurveTo(-f.gap * 1.25, y, 0, y)
    g.quadraticCurveTo(f.gap * 1.25, y, f.gap * 1.35, my - er * 0.4)
    g.lineTo(cw / 2, my - er * 1.2)
    g.lineTo(cw / 2, 0)
    g.lineTo(-cw / 2, 0)
    g.closePath()
    g.fill()
    g.fillStyle = 'rgba(255,255,255,.1)'
    g.fillRect(-cw / 2, y + er * 0.3, cw, Math.max(1, er * 0.25))
  }
}

/** Draws a non-default mouth; returns false when the default smile should be used. */
export function drawMouth(g: CanvasRenderingContext2D, f: Face, mouth: MouthId, color: string) {
  if (mouth === 'smile') return false
  const { er, my, k } = f
  g.strokeStyle = color
  g.fillStyle = color
  g.lineWidth = Math.max(1.2, 3 * k)
  g.lineCap = 'round'
  g.beginPath()
  if (mouth === 'grin') {
    g.arc(0, my - er * 0.5, er * 1.15, 0, Math.PI)
    g.closePath()
    g.fill()
    g.fillStyle = '#E58AA8'
    g.beginPath()
    g.ellipse(0, my + er * 0.35, er * 0.5, er * 0.3, 0, 0, TAU)
    g.fill()
  } else if (mouth === 'smirk') {
    g.moveTo(-er * 0.8, my - er * 0.1)
    g.quadraticCurveTo(0, my + er * 0.45, er * 0.95, my - er * 0.45)
    g.stroke()
  } else if (mouth === 'meh') {
    g.moveTo(-er * 0.7, my)
    g.lineTo(er * 0.7, my)
    g.stroke()
  } else {
    g.arc(0, my - er * 0.5, er * 0.8, Math.PI * 0.2, Math.PI * 0.8)
    g.stroke()
    g.fillStyle = '#E58AA8'
    g.beginPath()
    g.ellipse(er * 0.25, my + er * 0.45, er * 0.42, er * 0.6, 0, 0, TAU)
    g.fill()
  }
  return true
}

/** Eye styling, glasses, hair and hats sit on top of the face, drawn after the eyes and mouth. */
export function drawFaceDress(g: CanvasRenderingContext2D, f: Face, d: Dress) {
  drawEyeStyle(g, f, d.eyes)
  drawGlasses(g, f, d.glasses)
  drawHair(g, f, d)
  drawHat(g, f, d)
}

function drawEyeStyle(g: CanvasRenderingContext2D, f: Face, id: EyesId) {
  if (!f.open || id === 'round' || id === 'wink') return
  const { gap, ey, er, k } = f
  g.lineCap = 'round'
  for (const s of [-1, 1]) {
    const x = s * gap
    if (id === 'sleepy') {
      g.fillStyle = f.fill
      g.beginPath()
      g.arc(x, ey, er * 1.12, Math.PI, TAU)
      g.closePath()
      g.fill()
      g.strokeStyle = INK
      g.lineWidth = Math.max(1.2, 2.6 * k)
      g.beginPath()
      g.moveTo(x - er * 1.1, ey)
      g.lineTo(x + er * 1.1, ey)
      g.stroke()
    } else if (id === 'lashes') {
      g.strokeStyle = INK
      g.lineWidth = Math.max(1.2, 2.4 * k)
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + s * (0.5 + i * 0.5)
        g.beginPath()
        g.moveTo(x + Math.cos(a) * er * 1.05, ey + Math.sin(a) * er * 1.05)
        g.lineTo(x + Math.cos(a) * er * 1.7, ey + Math.sin(a) * er * 1.7)
        g.stroke()
      }
    } else {
      g.fillStyle = '#F5C842'
      g.strokeStyle = INK
      g.lineWidth = Math.max(1, 1.6 * k)
      g.lineJoin = 'round'
      g.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const r = i % 2 ? er * 0.3 : er * 0.78
        g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, ey + Math.sin(a) * r)
      }
      g.closePath()
      g.fill()
      g.stroke()
    }
  }
}

const heart = (g: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  g.moveTo(x, y + r * 0.9)
  g.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.9, y - r * 1.1, x, y - r * 0.4)
  g.bezierCurveTo(x + r * 0.9, y - r * 1.1, x + r * 1.5, y - r * 0.1, x, y + r * 0.9)
}

function drawGlasses(g: CanvasRenderingContext2D, f: Face, id: GlassesId) {
  if (id === 'none') return
  const { gap, ey, er, k } = f
  const r = er * (id === 'goggles' ? 1.75 : 1.55)
  const lw = Math.max(2, 2.6 * k)
  g.lineWidth = lw
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.strokeStyle = INK

  if (id === 'monocle') {
    const x = gap
    g.strokeStyle = '#C9A13A'
    g.fillStyle = 'rgba(255,255,255,.18)'
    g.beginPath()
    g.arc(x, ey, r, 0, TAU)
    g.fill()
    g.stroke()
    g.lineWidth = Math.max(1, 1.5 * k)
    g.beginPath()
    g.moveTo(x + r * 0.7, ey + r * 0.7)
    g.quadraticCurveTo(x + r * 1.2, ey + r * 2.2, x + r * 0.2, ey + r * 3)
    g.stroke()
    return
  }

  if (id === 'goggles') {
    // Strap runs behind the lenses to the sides of the body
    g.strokeStyle = '#2B3340'
    g.lineWidth = Math.max(3, 4.5 * k)
    g.beginPath()
    g.moveTo(-f.cw / 2, ey)
    g.lineTo(f.cw / 2, ey)
    g.stroke()
    g.lineWidth = lw
    g.strokeStyle = INK
  }

  for (const s of [-1, 1]) {
    const x = s * gap
    g.beginPath()
    if (id === 'round' || id === 'goggles') g.arc(x, ey, r, 0, TAU)
    else if (id === 'square') g.roundRect(x - r, ey - r * 0.85, r * 2, r * 1.7, r * 0.3)
    else if (id === 'shades') g.roundRect(x - r * 1.05, ey - r * 0.8, r * 2.1, r * 1.5, [r * 0.2, r * 0.2, r * 0.9, r * 0.9])
    else if (id === 'heart') heart(g, x, ey, r * 0.95)
    else {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const rr = i % 2 ? r * 0.55 : r * 1.25
        g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, ey + Math.sin(a) * rr)
      }
      g.closePath()
    }
    g.fillStyle = id === 'shades' ? INK : id === 'star' || id === 'heart' ? 'rgba(229,138,168,.6)' : id === 'goggles' ? 'rgba(120,200,220,.4)' : 'rgba(255,255,255,.14)'
    g.fill()
    g.stroke()
    if (id === 'shades') {
      g.strokeStyle = 'rgba(255,255,255,.4)'
      g.lineWidth = Math.max(1, 1.8 * k)
      g.beginPath()
      g.moveTo(x - r * 0.6, ey - r * 0.4)
      g.lineTo(x - r * 0.15, ey - r * 0.4)
      g.stroke()
      g.strokeStyle = INK
      g.lineWidth = lw
    }
  }

  if (id !== 'goggles') {
    g.beginPath()
    g.moveTo(-gap + r * 0.9, ey - r * 0.1)
    g.quadraticCurveTo(0, ey - r * 0.55, gap - r * 0.9, ey - r * 0.1)
    g.stroke()
  }
}

function drawHair(g: CanvasRenderingContext2D, f: Face, d: Dress) {
  if (d.hair === 'none') return
  const { k } = f
  const { hair } = colors(d)
  const half = headHalf(f)
  const topY = (x: number) => surfaceY(f, x)
  g.fillStyle = hair
  g.strokeStyle = hair
  g.lineCap = 'round'

  if (d.hair === 'mohawk') {
    const xs = [-12, -4, 4, 12]
    xs.forEach((x, i) => {
      const bx = x * k
      const h = (i % 2 ? 22 : 17) * k
      g.beginPath()
      g.moveTo(bx - 5 * k, topY(bx) + 3 * k)
      g.lineTo(bx + (i - 1.5) * k, topY(bx) - h)
      g.lineTo(bx + 5 * k, topY(bx) + 3 * k)
      g.closePath()
      g.fill()
    })
    return
  }

  hairCap(g, f, half, 7 * k)

  if (d.hair === 'tuft') {
    g.lineWidth = Math.max(3, 5 * k)
    for (const a of [-0.45, 0, 0.45]) {
      const y0 = topY(0)
      g.beginPath()
      g.moveTo(0, y0 - 2 * k)
      g.quadraticCurveTo(Math.sin(a) * 6 * k, y0 - 12 * k, Math.sin(a) * 15 * k + 3 * k, y0 - Math.cos(a) * 20 * k)
      g.stroke()
    }
  } else if (d.hair === 'bun') {
    g.beginPath()
    g.arc(0, topY(0) - 9 * k, 11 * k, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,.14)'
    g.beginPath()
    g.arc(-3 * k, topY(0) - 12 * k, 4 * k, 0, TAU)
    g.fill()
  } else if (d.hair === 'pigtails') {
    for (const s of [-1, 1]) {
      const x = s * half * 0.95
      g.beginPath()
      g.arc(x + s * 5 * k, topY(x) - 3 * k, 9 * k, 0, TAU)
      g.fill()
    }
  } else if (d.hair === 'curls') {
    const n = Math.max(3, Math.round((half * 2) / (13 * k)))
    for (let i = 0; i < n; i++) {
      const x = -half + (2 * half * (i + 0.5)) / n
      g.beginPath()
      g.arc(x, topY(x) - 2 * k, 7.5 * k, 0, TAU)
      g.fill()
    }
  }
}

function drawHat(g: CanvasRenderingContext2D, f: Face, d: Dress) {
  if (d.hat === 'none') return
  const { cw, chh, k, ey } = f
  const { col } = colors(d)
  const dark = shade(col, -0.18)
  const hw = Math.min(cw * 0.66, 78 * k)
  const half = hw / 2
  // The hat's brim line rests on the body where it curves away from the top
  const base = surfaceY(f, half) + 3 * k
  const top = -chh

  if (d.hat === 'beanie') {
    const h = Math.max(hw * 0.55, 14 * k)
    g.fillStyle = col
    g.beginPath()
    g.moveTo(-half, base)
    g.bezierCurveTo(-half, base - h * 1.25, half, base - h * 1.25, half, base)
    g.closePath()
    g.fill()
    g.fillStyle = dark
    g.beginPath()
    g.roundRect(-half * 1.06, base - 5 * k, hw * 1.06, 11 * k, 5 * k)
    g.fill()
    g.fillStyle = shade(col, 0.2)
    g.beginPath()
    g.arc(0, top - h * 0.3 + (base - top) * 0.3, Math.max(3, 5.5 * k), 0, TAU)
    g.fill()
  } else if (d.hat === 'cap') {
    const h = hw * 0.5
    g.fillStyle = col
    g.beginPath()
    g.moveTo(-half, base)
    g.bezierCurveTo(-half, base - h * 1.3, half, base - h * 1.3, half, base)
    g.closePath()
    g.fill()
    g.fillStyle = dark
    g.beginPath()
    g.moveTo(-half * 0.2, base - 1)
    g.quadraticCurveTo(half * 1.1, base - 5 * k, half * 1.55, base + 4 * k)
    g.quadraticCurveTo(half * 0.8, base + 9 * k, -half * 0.2, base + 7 * k)
    g.closePath()
    g.fill()
    g.beginPath()
    g.arc(0, base - h * 0.88, Math.max(2, 3 * k), 0, TAU)
    g.fill()
  } else if (d.hat === 'bucket') {
    const h = hw * 0.42
    g.fillStyle = col
    g.beginPath()
    g.moveTo(-half * 0.92, base - 2 * k)
    g.lineTo(-half * 0.75, base - h)
    g.quadraticCurveTo(0, base - h * 1.15, half * 0.75, base - h)
    g.lineTo(half * 0.92, base - 2 * k)
    g.closePath()
    g.fill()
    g.fillStyle = dark
    g.beginPath()
    g.ellipse(0, base, half * 1.35, 6.5 * k, 0, 0, TAU)
    g.fill()
    g.fillStyle = col
    g.beginPath()
    g.ellipse(0, base - 2.5 * k, half * 0.95, 4 * k, 0, 0, TAU)
    g.fill()
  } else if (d.hat === 'crown') {
    const h = Math.max(hw * 0.5, 14 * k)
    g.fillStyle = '#E0B040'
    g.beginPath()
    g.moveTo(-half, base)
    g.lineTo(-half, base - h * 0.75)
    g.lineTo(-half * 0.5, base - h * 0.35)
    g.lineTo(0, base - h)
    g.lineTo(half * 0.5, base - h * 0.35)
    g.lineTo(half, base - h * 0.75)
    g.lineTo(half, base)
    g.closePath()
    g.fill()
    g.fillStyle = shade('#E0B040', -0.18)
    g.fillRect(-half, base - 5 * k, hw, 5 * k)
    g.fillStyle = col
    for (const x of [-half * 0.5, 0, half * 0.5]) {
      g.beginPath()
      g.arc(x, base - 2.5 * k, Math.max(1.5, 2.2 * k), 0, TAU)
      g.fill()
    }
  } else if (d.hat === 'catears') {
    for (const s of [-1, 1]) {
      const x = s * half * 0.62
      const y = surfaceY(f, x) + 5 * k
      for (const [c, sc] of [[col, 1], ['#F4B9C6', 0.55]] as const) {
        g.fillStyle = c
        g.beginPath()
        g.moveTo(x - 11 * k * sc, y)
        g.lineTo(x + s * 4 * k, y - 25 * k * sc)
        g.lineTo(x + 11 * k * sc, y)
        g.closePath()
        g.fill()
      }
    }
  } else if (d.hat === 'headphones') {
    const cupY = Math.min(ey, surfaceY(f, cw / 2) + f.rt * 0.2)
    g.strokeStyle = dark
    g.lineWidth = Math.max(3, 5 * k)
    g.lineCap = 'round'
    g.beginPath()
    let started = false
    for (let i = 0; i <= 16; i++) {
      const x = -cw / 2 + (cw * i) / 16
      const y = surfaceY(f, x) - 5 * k
      if (y > cupY) continue
      g[started ? 'lineTo' : 'moveTo'](x, y)
      started = true
    }
    g.stroke()
    g.fillStyle = col
    for (const s of [-1, 1]) {
      g.beginPath()
      g.roundRect(s * (cw / 2 + 2 * k) - 6 * k, cupY - 5 * k, 12 * k, 24 * k, 6 * k)
      g.fill()
    }
  } else if (d.hat === 'halo') {
    g.strokeStyle = '#E8C547'
    g.lineWidth = Math.max(2.5, 4 * k)
    g.beginPath()
    g.ellipse(0, top - 14 * k, half * 0.62, 6 * k, 0, 0, TAU)
    g.stroke()
  } else {
    // Party hat
    const h = hw
    const w = hw * 0.8
    g.fillStyle = col
    g.beginPath()
    g.moveTo(-w / 2, base)
    g.lineTo(0, base - h)
    g.lineTo(w / 2, base)
    g.closePath()
    g.fill()
    g.save()
    g.clip()
    g.strokeStyle = shade(col, 0.28)
    g.lineWidth = Math.max(2, 3 * k)
    for (let i = 1; i < 4; i++) {
      const y = base - (h * i) / 4
      g.beginPath()
      g.moveTo(-w, y + 6 * k)
      g.lineTo(w, y - 6 * k)
      g.stroke()
    }
    g.restore()
    g.fillStyle = '#FFF8F4'
    g.beginPath()
    g.arc(0, base - h, Math.max(3, 5 * k), 0, TAU)
    g.fill()
  }
}
