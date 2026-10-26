/* Dress-up options for a user's character: pick one per category, like a Snapchat Bitmoji.
   Everything draws in the character's local space (origin = base center, y up is negative),
   so it follows each species' size and eye positions. */

import type { SpeciesId } from './clay'

export type HatId = 'none' | 'beanie' | 'cap' | 'crown' | 'party'
export type GlassesId = 'none' | 'round' | 'square' | 'shades' | 'star'
export type OutfitId = 'none' | 'stripes' | 'scarf' | 'bowtie' | 'overalls'
export type FacialId = 'none' | 'mustache' | 'handlebar' | 'goatee' | 'beard'

export type Dress = { hat: HatId; glasses: GlassesId; outfit: OutfitId; facial: FacialId; color: number }
export type Look = Dress & { species: SpeciesId }

export type CategoryKey = keyof Look

type Option<T extends string> = { id: T; label: string }

export const SPECIES_OPTIONS: readonly Option<SpeciesId>[] = [
  { id: 'pip', label: 'Pip' },
  { id: 'moss', label: 'Moss' },
  { id: 'ima', label: 'Ima' },
  { id: 'sol', label: 'Sol' },
  { id: 'tomo', label: 'Tomo' },
  { id: 'ned', label: 'Ned' },
]

export const HATS: readonly Option<HatId>[] = [
  { id: 'none', label: 'None' },
  { id: 'beanie', label: 'Beanie' },
  { id: 'cap', label: 'Cap' },
  { id: 'crown', label: 'Crown' },
  { id: 'party', label: 'Party' },
]

export const GLASSES: readonly Option<GlassesId>[] = [
  { id: 'none', label: 'None' },
  { id: 'round', label: 'Round' },
  { id: 'square', label: 'Square' },
  { id: 'shades', label: 'Shades' },
  { id: 'star', label: 'Stars' },
]

export const OUTFITS: readonly Option<OutfitId>[] = [
  { id: 'none', label: 'None' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'scarf', label: 'Scarf' },
  { id: 'bowtie', label: 'Bow tie' },
  { id: 'overalls', label: 'Overalls' },
]

export const FACIAL: readonly Option<FacialId>[] = [
  { id: 'none', label: 'None' },
  { id: 'mustache', label: 'Mustache' },
  { id: 'handlebar', label: 'Handlebar' },
  { id: 'goatee', label: 'Goatee' },
  { id: 'beard', label: 'Beard' },
]

/** Tints for hats and outfits. */
export const COLORS: readonly { name: string; hex: string }[] = [
  { name: 'Terracotta', hex: '#C45C3E' },
  { name: 'Gold', hex: '#E0B040' },
  { name: 'Teal', hex: '#2A9D8F' },
  { name: 'Sky', hex: '#4F8FD0' },
  { name: 'Rose', hex: '#E58AA8' },
  { name: 'Cream', hex: '#F4EFE6' },
]

export const DEFAULT_LOOK: Look = { species: 'pip', hat: 'none', glasses: 'none', outfit: 'none', facial: 'none', color: 0 }

const INK = '#1B2430'
const HAIR = '#3A2A20'
const TAU = Math.PI * 2

/** Coerces stored JSON into a valid look, so a removed option never breaks rendering. */
export function sanitizeLook(raw: unknown): Look {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Look, unknown>>
  const pick = <T extends string>(opts: readonly Option<T>[], v: unknown, fallback: T) => (opts.some((o) => o.id === v) ? (v as T) : fallback)
  return {
    species: pick(SPECIES_OPTIONS, r.species, DEFAULT_LOOK.species),
    hat: pick(HATS, r.hat, 'none'),
    glasses: pick(GLASSES, r.glasses, 'none'),
    outfit: pick(OUTFITS, r.outfit, 'none'),
    facial: pick(FACIAL, r.facial, 'none'),
    color: typeof r.color === 'number' && r.color >= 0 && r.color < COLORS.length ? Math.floor(r.color) : 0,
  }
}

export function randomLook(): Look {
  const any = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
  return {
    species: any(SPECIES_OPTIONS).id,
    hat: any(HATS).id,
    glasses: any(GLASSES).id,
    outfit: any(OUTFITS).id,
    facial: any(FACIAL).id,
    color: Math.floor(Math.random() * COLORS.length),
  }
}

/** Where things sit on one character, shared by every accessory. */
export type Face = { cw: number; chh: number; k: number; rt: number; ey: number; gap: number; er: number; my: number; night: number }

const shade = (hex: string, amt: number) => {
  const n = Number.parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.round(Math.max(0, Math.min(255, v + 255 * amt)))
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`
}

/** Body-surface height at x: where the rounded top of the body actually is. */
const surfaceY = (f: Face, x: number) => -f.chh + f.rt - Math.sqrt(Math.max(0, f.rt * f.rt - x * x))

/** Outfit and facial hair live on the body, so the caller clips them to the body shape first. */
export function drawBodyDress(g: CanvasRenderingContext2D, f: Face, d: Dress) {
  const { cw, chh, k, er, my } = f
  const col = COLORS[d.color]?.hex ?? COLORS[0].hex
  const left = -cw / 2 - 2
  const top = -chh * 0.3

  if (d.outfit === 'stripes') {
    g.fillStyle = col
    g.fillRect(left, top, cw + 4, chh)
    g.fillStyle = shade(col, -0.16)
    const band = Math.max(4, 7 * k)
    for (let y = top + band; y < 0; y += band * 2) g.fillRect(left, y, cw + 4, band)
  } else if (d.outfit === 'scarf') {
    const h = Math.max(10, chh * 0.12)
    const y = -chh * 0.22 - h / 2
    g.fillStyle = col
    g.fillRect(left, y, cw + 4, h)
    g.fillStyle = shade(col, -0.16)
    for (let x = left + h * 0.5; x < cw / 2; x += h * 0.9) g.fillRect(x, y, h * 0.25, h)
    // Tail
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
  g.fillStyle = HAIR
  g.strokeStyle = HAIR
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
    // A touch of light so it reads as fuzz, not a flat block
    g.fillStyle = 'rgba(255,255,255,.1)'
    g.fillRect(-cw / 2, y + er * 0.3, cw, Math.max(1, er * 0.25))
  }
}

/** Glasses and hats sit on top of the face, drawn after the eyes and mouth. */
export function drawFaceDress(g: CanvasRenderingContext2D, f: Face, d: Dress) {
  drawGlasses(g, f, d.glasses)
  drawHat(g, f, d)
}

function drawGlasses(g: CanvasRenderingContext2D, f: Face, id: GlassesId) {
  if (id === 'none') return
  const { gap, ey, er, k } = f
  const r = er * 1.55
  const lw = Math.max(2, 2.6 * k)
  g.lineWidth = lw
  g.lineJoin = 'round'
  g.strokeStyle = INK

  const bridge = () => {
    g.beginPath()
    g.moveTo(-gap + r * 0.9, ey - r * 0.1)
    g.quadraticCurveTo(0, ey - r * 0.55, gap - r * 0.9, ey - r * 0.1)
    g.stroke()
  }

  for (const s of [-1, 1]) {
    const x = s * gap
    g.beginPath()
    if (id === 'round') g.arc(x, ey, r, 0, TAU)
    else if (id === 'square') g.roundRect(x - r, ey - r * 0.85, r * 2, r * 1.7, r * 0.3)
    else if (id === 'shades') g.roundRect(x - r * 1.05, ey - r * 0.8, r * 2.1, r * 1.5, [r * 0.2, r * 0.2, r * 0.9, r * 0.9])
    else {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const rr = i % 2 ? r * 0.55 : r * 1.25
        g[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, ey + Math.sin(a) * rr)
      }
      g.closePath()
    }
    if (id === 'shades') {
      g.fillStyle = INK
      g.fill()
    } else if (id === 'star') {
      g.fillStyle = 'rgba(229,138,168,.55)'
      g.fill()
    } else {
      g.fillStyle = 'rgba(255,255,255,.14)'
      g.fill()
    }
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
  bridge()
}

function drawHat(g: CanvasRenderingContext2D, f: Face, d: Dress) {
  if (d.hat === 'none') return
  const { cw, chh, k } = f
  const col = COLORS[d.color]?.hex ?? COLORS[0].hex
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
  } else {
    // Party hat
    const h = hw * 1.15
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
