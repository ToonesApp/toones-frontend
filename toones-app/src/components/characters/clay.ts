/* Clay character species, renderer and motion. Framework-free so any canvas
   (Auth scene, globe, rail, arrival overlay) can draw the same characters. */

export type SpeciesId = 'moss' | 'ima' | 'sol' | 'tomo' | 'ned' | 'pip'
export type Category = 'Nature' | 'Language' | 'Culture' | 'Music' | 'City'

export type Species = {
  id: SpeciesId
  name: string
  category: Category | null
  fill: string
  lip: string
  w: number
  h: number
  /** Top corner radius at k = 1. */
  rt: number
  lightMouth?: boolean
  outlinedEyes?: boolean
}

export const SPECIES: Record<SpeciesId, Species> = {
  moss: { id: 'moss', name: 'Moss', category: 'Nature', fill: '#2F6A4A', lip: '#214C35', w: 170, h: 104, rt: 85 },
  ima: { id: 'ima', name: 'Ima', category: 'Language', fill: '#2A5F7A', lip: '#1D4458', w: 92, h: 124, rt: 46 },
  sol: { id: 'sol', name: 'Sol', category: 'Culture', fill: '#7A5424', lip: '#553917', w: 104, h: 140, rt: 52 },
  tomo: { id: 'tomo', name: 'Tomo', category: 'Music', fill: '#C45C3E', lip: '#9A3F28', w: 150, h: 230, rt: 75 },
  ned: { id: 'ned', name: 'Ned', category: 'City', fill: '#3D4A58', lip: '#2A3440', w: 84, h: 84, rt: 42, lightMouth: true },
  pip: { id: 'pip', name: 'Pip', category: null, fill: '#D4A030', lip: '#A87A1F', w: 92, h: 124, rt: 46, outlinedEyes: true },
}

export const CATEGORIES: readonly Category[] = ['Nature', 'Language', 'Culture', 'Music', 'City']

export const CATEGORY_SPECIES: Record<Category, SpeciesId> = {
  Nature: 'moss',
  Language: 'ima',
  Culture: 'sol',
  Music: 'tomo',
  City: 'ned',
}

const INK = '#1B2430'
const TAU = Math.PI * 2

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (t: number) => t * t * (3 - 2 * t)

/** Scale that fits a species into a w × h box, leaving room for hands and lip. */
export function fitScale(sp: Species, w: number, h: number, pad = 0.8) {
  return Math.min((w * pad) / (sp.w * 1.3), (h * pad) / (sp.h + 12))
}

/** Scale and base point that center a species in a w × h box (what `ClayCharacter` draws). */
export function fitPlacement(sp: Species, w: number, h: number, fill = 0.8) {
  const k = fitScale(sp, w, h, fill)
  return { k, x: w / 2, base: h - (h - (sp.h + 12) * k) / 2 - 6 * k }
}

export type Point = { x: number; y: number }

export type Pose = {
  /** Point the pupils follow, in the same coordinates as x / by. */
  look?: Point | null
  /** 0 open → 1 closed. */
  blink?: number
  sleep?: number
  /** 0 → 1: hands move over the eyes. */
  cover?: number
  happy?: boolean
  oh?: boolean
  /** Mouth openness 0..1 while talking; omit when not talking. */
  talk?: number
  /** > 0 while the right hand waves. */
  wave?: number
  /** Audio / typing energy 0..1: hands and body bob. */
  dance?: number
  /** Positive stretches, negative squashes. */
  squash?: number
  rot?: number
  /** Appear / pop scale. */
  scale?: number
  /** Day 0 → night 1, darkens the body gradient. */
  night?: number
  shadow?: boolean
  /** Seconds, drives waving and talking phases. */
  t?: number
}

/** Draws a character standing with its base centered at (x, by). Returns its drawn size. */
export function drawCharacter(g: CanvasRenderingContext2D, x: number, by: number, k: number, sp: Species, pose: Pose = {}) {
  const { look = null, blink = 0, sleep = 0, cover = 0, happy = false, oh = false, talk, wave = 0, dance = 0, squash = 0, rot = 0, scale = 1, night = 0, shadow = true, t = 0 } = pose
  const cw = sp.w * k
  const chh = sp.h * k
  if (scale < 0.002) return { cw, chh }

  if (shadow) {
    g.fillStyle = 'rgba(27,36,48,.16)'
    g.beginPath()
    g.ellipse(x, by + 3 * k, cw * 0.5 * scale, Math.max(2, 7 * k), 0, 0, TAU)
    g.fill()
  }

  g.save()
  g.translate(x, by)
  if (rot) g.rotate(rot)
  g.scale(scale * (1 - squash * 0.6), scale * (1 + squash))

  // Body: lip, fill, light-to-navy overlay, highlight bar
  const rt = Math.min(sp.rt * k, cw / 2)
  const rb = Math.min(26 * k, chh / 3)
  g.fillStyle = sp.lip
  g.beginPath()
  g.roundRect(-cw / 2, -chh + 9 * k, cw, chh, [rt, rt, rb, rb])
  g.fill()
  g.fillStyle = sp.fill
  g.beginPath()
  g.roundRect(-cw / 2, -chh, cw, chh, [rt, rt, rb, rb])
  g.fill()
  g.save()
  g.clip()
  const grad = g.createLinearGradient(0, -chh, 0, 0)
  grad.addColorStop(0, `rgba(255,255,255,${0.16 * (1 - night)})`)
  grad.addColorStop(1, `rgba(10,16,40,${0.14 + 0.28 * night})`)
  g.fillStyle = grad
  g.fillRect(-cw / 2, -chh, cw, chh)
  g.restore()
  g.fillStyle = 'rgba(255,255,255,.22)'
  g.beginPath()
  g.roundRect(-cw * 0.3, -chh + 10 * k, Math.min(cw * 0.22, 30 * k), 8 * k, 4 * k)
  g.fill()

  // Eyes
  const ey = -chh + chh * (sp.h < 120 ? 0.45 : 0.31)
  const gap = Math.max(20 * k, cw * 0.24) / 2
  const er = Math.max(8 * k, cw * 0.085)
  const open = 1 - Math.max(blink, cover, sleep)
  const isHappy = happy && sleep < 0.5
  g.lineCap = 'round'
  g.lineWidth = Math.max(1.2, 3 * k)
  g.strokeStyle = INK

  for (const s of [-1, 1]) {
    const ex = s * gap
    if (isHappy) {
      g.beginPath()
      g.arc(ex, ey + er * 0.5, er * 0.9, Math.PI * 1.12, Math.PI * 1.88)
      g.stroke()
    } else if (open > 0.25) {
      let px = 0
      let py = 0
      if (look) {
        const dx = look.x - (x + ex)
        const dy = look.y - (by + ey)
        const d = Math.hypot(dx, dy) || 1
        const off = er * 0.45 * clamp(d / 160)
        px = (dx / d) * off
        py = (dy / d) * off * open
      }
      g.fillStyle = '#fff'
      g.beginPath()
      g.ellipse(ex, ey, er, er * open, 0, 0, TAU)
      g.fill()
      if (sp.outlinedEyes) {
        g.save()
        g.lineWidth = Math.max(1, 2 * k)
        g.stroke()
        g.restore()
      }
      g.fillStyle = INK
      g.beginPath()
      g.ellipse(ex + px, ey + py, er * 0.55, er * 0.55 * open, 0, 0, TAU)
      g.fill()
    } else {
      g.beginPath()
      g.arc(ex, ey - er * 0.3, er * 0.9, Math.PI * 0.15, Math.PI * 0.85)
      g.stroke()
    }
    // Cheek
    g.fillStyle = 'rgba(255,255,255,.2)'
    g.beginPath()
    g.arc(s * (gap + er * 1.5), ey + er * 1.9, er * 0.6, 0, TAU)
    g.fill()
  }

  // Mouth
  const my = ey + er * 2.5
  const mc = sp.lightMouth ? '#FFF8F4' : INK
  g.strokeStyle = mc
  g.fillStyle = mc
  g.beginPath()
  if (isHappy) {
    g.arc(0, my - er * 0.4, er * 1.05, 0, Math.PI)
    g.fill()
  } else if (sleep > 0.5) {
    g.ellipse(0, my, er * 0.28, er * (0.2 + 0.12 * Math.sin(t * 1.6)), 0, 0, TAU)
    g.fill()
  } else if (talk != null) {
    g.ellipse(0, my, er * 0.55, er * (0.3 + 0.45 * talk), 0, 0, TAU)
    g.fill()
  } else if (oh) {
    g.ellipse(0, my, er * 0.5, er * 0.65, 0, 0, TAU)
    g.fill()
  } else {
    g.arc(0, my - er * 0.5, er * 0.8, Math.PI * 0.2, Math.PI * 0.8)
    g.stroke()
  }

  // Hands
  const hr = Math.max(9 * k, cw * 0.075)
  const hide = smoothstep(clamp(cover))
  for (const s of [-1, 1]) {
    let hx = s * (cw / 2 + hr * 0.1)
    let hy = -chh * 0.26 - Math.abs(Math.sin(t * 9 + s)) * 16 * k * dance
    if (isHappy) {
      hx = s * (cw / 2 + hr * 0.6)
      hy = -chh * 0.6 + Math.sin(t * 12 + s) * 4 * k
    } else if (s === 1 && wave > 0) {
      hx = cw / 2 + hr * 0.9 + Math.sin(t * 14) * 6 * k
      hy = -chh * 0.52 + Math.cos(t * 14) * 3 * k
    }
    hx = lerp(hx, s * gap * 0.85, hide)
    hy = lerp(hy, ey + er * 0.5, hide)
    g.fillStyle = sp.lip
    g.beginPath()
    g.arc(hx, hy + 3 * k, hr, 0, TAU)
    g.fill()
    g.fillStyle = sp.fill
    g.beginPath()
    g.arc(hx, hy, hr, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,.2)'
    g.beginPath()
    g.arc(hx - hr * 0.3, hy - hr * 0.35, hr * 0.3, 0, TAU)
    g.fill()
  }

  g.restore()
  return { cw, chh }
}

/** Per-character physics: squash spring, hop, blink and wave timers. */
export class CharacterMotion {
  /** Squash amount and its velocity. */
  s = 0
  v = 0
  /** Hop height (unscaled px) and its velocity. */
  hop = 0
  hv = 0
  blink = 0
  happy = 0
  wave = 0
  private nextBlink = 1.5 + Math.random() * 3
  private nextWave = 3 + Math.random() * 6

  bump(a: number) {
    this.v += a
  }

  jump(velocity = 560) {
    this.hv = velocity
  }

  step(dt: number, opts: { idleWaves?: boolean; reduce?: boolean } = {}) {
    if (this.hv || this.hop > 0) {
      this.hop += this.hv * dt
      this.hv -= 1900 * dt
      if (this.hop <= 0) {
        this.hop = 0
        if (this.hv < 0) {
          this.hv = 0
          if (!opts.reduce) this.bump(-5)
        }
      }
    }
    this.v += (-260 * this.s - 14 * this.v) * dt
    this.s += this.v * dt

    this.nextBlink -= dt
    if (this.nextBlink < 0) {
      this.blink = 1
      this.nextBlink = 2.5 + Math.random() * 3.5
    }
    this.blink = Math.max(0, this.blink - dt * 7)

    this.happy = Math.max(0, this.happy - dt)
    this.wave = Math.max(0, this.wave - dt)
    if (opts.idleWaves && !opts.reduce) {
      this.nextWave -= dt
      if (this.nextWave < 0) {
        this.wave = 1.5
        this.nextWave = 7 + Math.random() * 8
      }
    }
  }
}

/* Floating music notes and sleep z's. */

export type Note = { x: number; y: number; vx: number; vy: number; age: number; life: number; ph: number; glyph: string; color: string; size: number; z: boolean }

const DAY_NOTE_COLORS = ['#C45C3E', '#2A5F7A', '#2F6A4A', '#7A5424']
const NIGHT_NOTE_COLORS = ['#F0A58A', '#9CC4E0', '#8FD1A8', '#E7C58A']
const GLYPHS = ['♪', '♫', '♩', '♬']
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]

export function spawnNote(x: number, y: number, opts: { night?: boolean; z?: boolean; spread?: number } = {}): Note {
  const z = !!opts.z
  return {
    x: x + (Math.random() - 0.5) * (opts.spread ?? 14),
    y,
    vx: (Math.random() - 0.5) * 34,
    vy: z ? -24 : -(60 + Math.random() * 40),
    age: 0,
    life: z ? 2.8 : 1.8 + Math.random() * 0.6,
    ph: Math.random() * 6,
    glyph: z ? 'z' : pick(GLYPHS),
    color: z ? '#D8E6FA' : pick(opts.night ? NIGHT_NOTE_COLORS : DAY_NOTE_COLORS),
    size: z ? 15 : 22 + Math.random() * 8,
    z,
  }
}

/** Advances and draws notes; returns the ones still alive. */
export function stepNotes(g: CanvasRenderingContext2D, notes: Note[], dt: number, scale = 1) {
  const alive = notes.filter((n) => (n.age += dt) < n.life)
  g.save()
  g.textAlign = 'center'
  for (const n of alive) {
    const p = n.age / n.life
    n.x += n.vx * dt
    n.y += n.vy * dt
    g.globalAlpha = Math.min(1, p * 8) * (1 - p * p)
    g.fillStyle = n.color
    g.font = `600 ${n.size * scale * (n.z ? 0.8 + p * 0.6 : 1)}px "DM Sans","Segoe UI Symbol",sans-serif`
    g.fillText(n.glyph, n.x + Math.sin(n.age * 4 + n.ph) * 10 * scale, n.y)
  }
  g.restore()
  return alive
}

/** Sizes a canvas backing store to its CSS box; returns the 2D context set to CSS pixels. */
export function fitCanvas(c: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = c.clientWidth
  const h = c.clientHeight
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr)
    c.height = Math.round(h * dpr)
  }
  const g = c.getContext('2d')
  g?.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { g, w, h }
}

const faceCache = new Map<SpeciesId, string>()

/** Static still of a species for list avatars, cached as a data URL. */
export function faceDataUrl(id: SpeciesId) {
  let url = faceCache.get(id)
  if (!url) {
    const sp = SPECIES[id]
    const c = document.createElement('canvas')
    c.width = c.height = 120
    const g = c.getContext('2d')
    if (!g) return ''
    drawCharacter(g, 60, 108, Math.min(96 / sp.w, 100 / sp.h), sp, { look: { x: 60, y: 200 }, shadow: false })
    url = c.toDataURL()
    faceCache.set(id, url)
  }
  return url
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
