import {
  CharacterMotion,
  SPECIES,
  clamp,
  drawCharacter,
  fitCanvas,
  lerp,
  prefersReducedMotion,
  smoothstep,
  spawnNote,
  stepNotes,
  type Note,
  type Species,
  type SpeciesId,
} from '../../components/characters/clay'
import { globeTarget, initialPanelOpen } from '../home/layout'
import { drawHandoffGlobe, loadHandoffGeo, type HandoffGeo } from '../transition/handoffGlobe'

export type FieldFocus = '' | 'field' | 'pw'
export type AuthMode = 'in' | 'up'

type RGB = [number, number, number]

type Actor = {
  sp: Species
  idx: number
  motion: CharacterMotion
  /** Offset from screen center at scale 1, for sign-in and sign-up. */
  xIn: number
  xUp: number
  sleeper: boolean
  sleep: number
  awake: number
  nextZ: number
  delay: number | null
  hovered: boolean
  /** Shuffle-aside offset when Pip gets close. */
  ox: number
  pushing: boolean
  crouched: boolean
  /** Last drawn center and half-size, canvas px. */
  hit: { x: number; y: number; hw: number; hh: number } | null
}

const PHASE: SpeciesId[] = ['moss', 'tomo', 'ima', 'sol', 'ned', 'pip']

const CAST: { id: SpeciesId; xIn: number; xUp: number }[] = [
  { id: 'moss', xIn: -520, xUp: -540 },
  { id: 'tomo', xIn: -360, xUp: -380 },
  { id: 'sol', xIn: 500, xUp: 500 },
  { id: 'ned', xIn: 610, xUp: 640 },
  { id: 'pip', xIn: 0, xUp: 0 },
]

const SLEEPERS: SpeciesId[] = ['moss', 'ned']

const mix = (a: RGB, b: RGB, u: number): RGB => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
const rgb = (a: RGB, alpha?: number) => {
  const c = a.map(Math.round).join(',')
  return alpha == null ? `rgb(${c})` : `rgba(${c},${alpha})`
}
/** Day → dusk → night across e = 0 → 0.5 → 1. */
const across = (day: RGB, dusk: RGB, night: RGB, e: number) => (e < 0.5 ? mix(day, dusk, e * 2) : mix(dusk, night, (e - 0.5) * 2))
const easeInOutCubic = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2)
const backOut = (p: number) => {
  const s = 1.70158
  p -= 1
  return p * p * ((s + 1) * p + s) + 1
}

export class AuthSceneEngine {
  private canvas: HTMLCanvasElement
  private getFormRect: () => DOMRect | null
  private reduce = prefersReducedMotion()
  private actors: Actor[]
  private pip: Actor
  private notes: Note[] = []
  private stars = Array.from({ length: 80 }, (_, i) => ({ i, x: Math.random(), y: Math.random() * 0.72, r: 0.6 + Math.random() * 1.4, tw: Math.random() * 6, sp: 1 + Math.random() * 2, cross: Math.random() < 0.15 }))
  private clouds = [
    { x: 0.1, y: 0.12, w: 120, sp: 6, par: 14 },
    { x: 0.55, y: 0.2, w: 90, sp: 9, par: 22 },
    { x: 0.85, y: 0.07, w: 140, sp: 5, par: 10 },
    { x: 0.32, y: 0.31, w: 70, sp: 11, par: 30 },
  ]

  private t = 0
  private last = performance.now()
  private raf = 0
  private mode = 0
  private modeTarget = 0
  private nightLevel = 0
  private nightTarget = 0
  private focus: FieldFocus = ''
  private showPw = false
  private hide = 0
  private lean = 0
  private typed = 0
  private energy = 0
  private oh = 0
  private shake = 0
  private pipX: number | null = null
  private mx = -1e4
  private my = -1e4
  private lastMove = -9

  /** Seconds since `leave()`; null while the form is in use. */
  private crash: number | null = null
  private onLeft: (() => void) | null = null
  /** Canvas size when leaving: the cast keeps this layout while the canvas grows to the viewport. */
  private stage: { W: number; H: number } | null = null
  private geo: HandoffGeo | null = null
  private geoTimer = 0

  constructor(canvas: HTMLCanvasElement, getFormRect: () => DOMRect | null) {
    this.canvas = canvas
    this.getFormRect = getFormRect
    this.actors = CAST.map(({ id, xIn, xUp }) => ({
      sp: SPECIES[id],
      idx: PHASE.indexOf(id),
      motion: new CharacterMotion(),
      xIn,
      xUp,
      sleeper: SLEEPERS.includes(id),
      sleep: 0,
      awake: 0,
      nextZ: 0,
      delay: null,
      hovered: false,
      ox: 0,
      pushing: false,
      crouched: false,
      hit: null,
    }))
    this.pip = this.actors.find((a) => a.sp.id === 'pip')!
  }

  start() {
    window.addEventListener('pointermove', this.onMove)
    window.addEventListener('pointerdown', this.onDown)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
    this.geoTimer = window.setTimeout(() => void loadHandoffGeo().then((geo) => (this.geo = geo)), 1200)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.geoTimer)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('pointerdown', this.onDown)
  }

  /* ---- Inputs from the form ---- */

  setNight(on: boolean, immediate = false) {
    this.nightTarget = on ? 1 : 0
    if (immediate) this.nightLevel = this.nightTarget
  }

  setMode(mode: AuthMode, animate: boolean) {
    this.modeTarget = mode === 'up' ? 1 : 0
    if (!animate || this.reduce) {
      this.mode = this.modeTarget
      return
    }
    this.actors.forEach((a, i) => {
      a.delay = i * 0.07
      a.motion.wave = 1.4
    })
  }

  setFocus(focus: FieldFocus) {
    this.focus = focus
  }

  setShowPassword(show: boolean) {
    this.showPw = show
  }

  /** Characters in name + email; drives how far Pip has hopped in. */
  setTypedLength(n: number) {
    this.typed = n
  }

  keystroke() {
    this.actors.forEach((a, i) => {
      if (a.sleep > 0.5 || (a === this.pip && !((this.pipX ?? -1) > 0))) return
      if (!this.reduce) a.motion.bump(1.6 + (i % 3) * 0.5)
      if (Math.random() < 0.3) setTimeout(() => this.emitNote(a), i * 45 + Math.random() * 60)
    })
    this.energy = 1
  }

  error() {
    this.oh = 1
    if (!this.reduce) this.shake = 1
  }

  /** Plays the hill → globe pull-back and calls `done` when Home should take over (~2.15s). */
  leave(done: () => void) {
    if (this.reduce) return done()
    if (this.crash != null) return
    this.stage = { W: this.canvas.clientWidth, H: this.canvas.clientHeight }
    this.crash = 0
    this.onLeft = done
    this.focus = ''
    void loadHandoffGeo().then((geo) => (this.geo = geo))
    for (const a of this.actors) {
      a.motion.jump(300)
      a.motion.happy = 3
      a.awake = 9
    }
  }

  /* ---- Pointer ---- */

  private onMove = (e: PointerEvent) => {
    this.mx = e.clientX
    this.my = e.clientY
    this.lastMove = this.t
  }

  private onDown = (e: PointerEvent) => {
    if (this.crash != null) return
    if ((e.target as Element | null)?.closest('button, a, input, label, form')) return
    const r = this.canvas.getBoundingClientRect()
    const px = e.clientX - r.left
    const py = e.clientY - r.top
    const hit = [...this.actors].reverse().find((a) => a.hit && Math.abs(px - a.hit.x) < a.hit.hw && Math.abs(py - a.hit.y) < a.hit.hh)
    if (!hit) return
    if (!this.reduce) hit.motion.jump(560)
    hit.motion.happy = 1.2
    hit.motion.wave = 1.2
    hit.awake = 8
    for (let i = 0; i < 3; i++) setTimeout(() => this.emitNote(hit), i * 110)
  }

  private emitNote(a: Actor, z = false) {
    if (!a.hit) return
    this.notes.push(spawnNote(a.hit.x, a.hit.y - a.hit.hh - 4, { night: this.nightLevel > 0.5, z, spread: a.hit.hw * 0.8 }))
  }

  /* ---- Frame ---- */

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.t += dt
    const crash = this.crash
    if (crash != null) {
      this.crash = crash + dt
      if (this.crash > 2.15 && this.onLeft) {
        const done = this.onLeft
        this.onLeft = null
        done()
      }
    }
    const { g, w: W, h: H } = fitCanvas(this.canvas)
    if (!g || !W || !H) return
    g.clearRect(0, 0, W, H)
    const LW = this.stage?.W ?? W
    const LH = this.stage?.H ?? H

    const r = this.canvas.getBoundingClientRect()
    const reduce = this.reduce
    const t = this.t

    // Eased state
    this.mode += (this.modeTarget - this.mode) * Math.min(1, dt * (reduce ? 60 : 4.5))
    this.oh = Math.max(0, this.oh - dt)
    this.shake = Math.max(0, this.shake - dt * 1.4)
    this.energy = Math.max(0, this.energy - dt * 1.3)
    const fieldFocus = this.focus === 'field' || (this.focus === 'pw' && this.showPw)
    this.hide += ((this.focus === 'pw' && !this.showPw ? 1 : 0) - this.hide) * Math.min(1, dt * 10)
    this.lean += ((fieldFocus ? 1 : 0) - this.lean) * Math.min(1, dt * 6)
    const step = dt / 1.5
    this.nightLevel = reduce || Math.abs(this.nightTarget - this.nightLevel) < step ? this.nightTarget : clamp(this.nightLevel + Math.sign(this.nightTarget - this.nightLevel) * step)
    const e = smoothstep(this.nightLevel)
    const m = this.mode

    // Where the eyes go: the cursor, or the form after 1.2s idle on a field
    const fr = crash == null ? this.getFormRect() : null
    const formCx = fr ? fr.left + fr.width / 2 - r.left : LW / 2
    const formCy = fr ? clamp(fr.top + fr.height / 2 - r.top, 0, LH + 200) : LH * 0.5
    const lookForm = fieldFocus && t - this.lastMove > 1.2
    const tx = lookForm ? formCx : this.mx - r.left
    const ty = lookForm ? formCy : this.my - r.top
    let ptx = tx
    let pty = ty
    const ae = document.activeElement
    if (t - this.lastMove >= 1.2 && ae instanceof HTMLInputElement) {
      const ar = ae.getBoundingClientRect()
      ptx = ar.left - r.left + Math.min(ar.width - 24, 16 + ae.value.length * 7.2)
      pty = ar.top - r.top + ar.height / 2
    }

    // Layout
    const wide = LW >= 1100
    const s = Math.min(wide ? LH / 700 : (LH * 0.8) / 520, LW / 1520)
    const gy = LH * (wide ? 0.9 : 0.82)
    const sk = Math.max(s, 0.55)
    const pull = crash == null ? 0 : easeInOutCubic(clamp((crash - 0.1) / 1.3))

    this.drawSky(g, W, H, dt, e, s, sk, m, pull)

    // Hill, or the hill pulling back into the Earth at Home's globe position
    const hc = across([255, 255, 255], [255, 214, 196], [34, 48, 88], e)
    let morph: { ex: number; ey: number; rx: number; ry: number; rx0: number } | null = null
    if (crash == null) {
      g.fillStyle = 'rgba(27,36,48,.06)'
      g.beginPath()
      g.ellipse(W / 2, H * 0.985 + 8, W * 0.62, H * 0.2, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = rgb(hc, lerp(0.72, 0.86, e))
      g.beginPath()
      g.ellipse(W / 2, H * 0.985, W * 0.62, H * 0.2, 0, 0, Math.PI * 2)
      g.fill()
    } else {
      const T = globeTarget(W, H, initialPanelOpen(W))
      morph = { ex: lerp(LW / 2, T.cx, pull), ey: lerp(LH * 0.985, T.cy, pull), rx: lerp(LW * 0.62, T.R, pull), ry: lerp(LH * 0.2, T.R, pull), rx0: LW * 0.62 }
      drawHandoffGlobe(g, { cx: morph.ex, cy: morph.ey, rx: morph.rx, ry: morph.ry, night: e, reveal: pull, hill: { color: hc, alpha: lerp(0.72, 0.86, e) }, geo: this.geo })
    }

    // Physics, sleep, timers
    for (const a of this.actors) {
      if (a.delay != null) {
        a.delay -= dt
        if (a.delay <= 0) {
          a.delay = null
          a.motion.jump(560)
        }
      }
      a.motion.step(dt, { idleWaves: true, reduce })
      if (a.awake > 0) a.awake -= dt
      const want = e > 0.6 && a.sleeper && a.awake <= 0 ? 1 : 0
      a.sleep += (want - a.sleep) * Math.min(1, dt * (want ? 1.2 : 6))
      if (a.sleep > 0.6 && t > a.nextZ) {
        a.nextZ = t + 1.5 + Math.random()
        this.emitNote(a, true)
      }
    }

    // Pip hops in as name + email grow, stops left of the card
    const pip = this.pip
    const pipK = s * 0.95
    const pipW = pip.sp.w * pipK
    const startX = Math.max(60, 74 * s)
    const endX = Math.max(startX + 24, (fr ? fr.left - r.left : W / 2 - 210) - pipW / 2 - 10)
    if (this.pipX == null) this.pipX = -120
    const pipTarget = crash != null ? this.pipX : this.typed > 0 ? lerp(startX, endX, clamp((this.typed - 1) / 20)) : -120
    const dx = pipTarget - this.pipX
    if (reduce) this.pipX = pipTarget
    else if (Math.abs(dx) > 5) {
      if (pip.motion.hop <= 0 && !pip.motion.hv) pip.motion.jump(430)
      if (pip.motion.hop > 0) this.pipX += Math.sign(dx) * Math.min(Math.abs(dx), 430 * Math.max(s, 0.6) * dt)
    } else if (dx !== 0) {
      this.pipX = pipTarget
      pip.motion.bump(3)
    }
    // Others shuffle aside for Pip, and never end up behind the card: each side is
    // packed outward from the card edge, innermost character first.
    const pipIn = this.pipX > -60 && this.pipX < LW + 60
    const tallest = Math.max(...this.actors.map((a) => a.sp.h)) * s
    const cardOnHill = fr != null && fr.bottom - r.top > gy - tallest && fr.top - r.top < gy
    const cardL = cardOnHill ? fr.left - r.left - 8 : Infinity
    const cardR = cardOnHill ? fr.right - r.left + 8 : -Infinity
    const home = (a: Actor) => LW / 2 + lerp(a.xIn, a.xUp, m) * s
    for (const side of crash == null ? [-1, 1] : []) {
      const group = this.actors.filter((a) => a !== pip && Math.sign(home(a) - LW / 2) === side).sort((a, b) => side * (home(a) - home(b)))
      let edge = side < 0 ? cardL : cardR
      for (const a of group) {
        const x0 = home(a)
        const half = (a.sp.w * s) / 2
        const dist = x0 - this.pipX
        const need = pipW / 2 + half + 8
        const push = pipIn && Math.abs(dist) < need
        let x = push ? x0 + Math.sign(dist || side) * (need - Math.abs(dist) + 14) : x0
        if (push && side < 0 && this.pipX < cardL && this.pipX > x0) x = Math.min(x, this.pipX - need - 6)
        x = side < 0 ? Math.min(x, edge - half) : Math.max(x, edge + half)
        edge = side < 0 ? x - half - 8 : x + half + 8
        if (push !== a.pushing) {
          a.pushing = push
          if (a.motion.hop <= 0 && !a.motion.hv && !reduce) a.motion.jump(380)
        }
        a.ox += (x - x0 - a.ox) * Math.min(1, dt * 7)
      }
    }

    // Draw: bigger characters behind, Pip in front
    const order = [...this.actors].sort((a, b) => Number(a === pip) - Number(b === pip) || b.sp.w * b.sp.h - a.sp.w * a.sp.h)
    let pointer = false
    for (const a of order) {
      const isPip = a === pip
      const ent = reduce ? 1 : clamp((t - 0.15 - a.idx * 0.13) / 0.7)
      const appear = isPip ? 1 : ent <= 0 ? 0 : backOut(ent)
      if (appear < 0.002 || (isPip && crash != null && this.pipX < 0)) continue
      const k = isPip ? pipK : s
      const base = isPip ? gy + 8 * s : gy
      const cw = a.sp.w * k
      const chh = a.sp.h * k
      const x = (isPip ? this.pipX : home(a)) + a.ox + Math.sin(t * 42) * 7 * this.shake * k
      const dance = this.energy * (1 - a.sleep)
      const yb = base - a.motion.hop * k - Math.abs(Math.sin(t * 7.5 + a.idx * 0.9)) * 14 * k * dance
      const breathe = reduce ? 0 : Math.sin(t * 1.6 + a.idx) * 0.012 + a.sleep * (Math.sin(t * 1.1 + a.idx) * 0.025 - 0.03)

      g.save()
      if (morph && crash != null) {
        // Planted on the shrinking curve, rotated to its normal; then crouch and leap up-left, spinning
        const u = clamp((x - LW / 2) / morph.rx0, -0.92, 0.92)
        const cu = Math.sqrt(1 - u * u)
        const f = morph.rx / morph.rx0
        const lp = smoothstep(clamp((crash - 1.25 - a.idx * 0.07) / 0.75))
        if (!a.crouched && crash > 1.08 + a.idx * 0.07) {
          a.crouched = true
          a.motion.bump(-7)
        }
        const settle = (base - (LH * 0.985 - LH * 0.2 * cu)) * (1 - pull)
        g.translate(morph.ex + u * morph.rx - W * 0.3 * lp * lp, morph.ey - morph.ry * cu + settle - H * 1.25 * lp * (2 - lp))
        g.rotate(Math.atan2(u * morph.ry, cu * morph.rx) * (1 - lp) + lp * (a.idx % 2 ? 1.4 : -1.4))
        g.scale(f, f)
        g.translate(-x, -base)
      }

      // Ground shadow stays on the hill while hopping
      g.fillStyle = `rgba(27,36,48,${0.12 * appear})`
      g.beginPath()
      g.ellipse(x, base + 4, Math.max(0, cw * 0.52 * appear * (1 - a.motion.hop * 0.0012)), 8 * k, 0, 0, Math.PI * 2)
      g.fill()

      a.hit = { x, y: yb - chh / 2, hw: cw / 2, hh: chh / 2 }
      const lx = this.mx - r.left
      const ly = this.my - r.top
      const over = crash == null && Math.abs(lx - x) < cw / 2 && Math.abs(ly - a.hit.y) < chh / 2
      if (over && !a.hovered && !reduce) {
        a.motion.bump(3)
        a.motion.wave = 1.2
      }
      a.hovered = over
      if (over) pointer = true
      if (Math.hypot(lx - x, ly - a.hit.y) < Math.max(cw, chh) * 1.2) a.awake = Math.max(a.awake, 6)

      const side = x < W / 2 ? 1 : -1
      const tilt = lookForm ? 0 : clamp((tx - x) / (W * 0.6), -1, 1)
      const rot = this.lean * 0.035 * (isPip ? 2.6 : 1) * side + tilt * 0.045 * (1 - a.sleep) + side * a.sleep * 0.09 + Math.sin(t * 9 + a.idx * 1.3) * 0.07 * dance

      drawCharacter(g, x, yb, k, a.sp, {
        look: isPip ? { x: ptx, y: pty } : { x: tx, y: ty },
        blink: a.motion.blink,
        sleep: a.sleep,
        cover: this.hide,
        happy: a.motion.happy > 0 && a.sleep < 0.5,
        oh: this.oh > 0,
        talk: dance > 0.15 ? Math.abs(Math.sin(t * 11 + a.idx)) : undefined,
        wave: a.motion.wave,
        dance,
        squash: a.motion.s + breathe,
        rot,
        scale: appear,
        night: e,
        shadow: false,
        t,
      })
      g.restore()
    }
    this.canvas.style.cursor = pointer ? 'pointer' : ''

    this.notes = stepNotes(g, this.notes, dt, Math.max(s, 0.7))
  }

  private drawSky(g: CanvasRenderingContext2D, W: number, H: number, dt: number, e: number, s: number, sk: number, m: number, pull: number) {
    const TAU = Math.PI * 2
    const t = this.t
    const skyT = mix(across([191, 209, 229], [130, 96, 140], [12, 18, 38], e), mix([168, 200, 226], [12, 18, 38], e), pull)
    const skyB = mix(across([205, 222, 238], [244, 160, 112], [30, 42, 76], e), mix([214, 228, 240], [30, 42, 76], e), pull)
    const sg = g.createLinearGradient(0, 0, 0, H)
    sg.addColorStop(0, rgb(skyT))
    sg.addColorStop(1, rgb(skyB))
    g.fillStyle = sg
    g.fillRect(0, 0, W, H)
    if (pull >= 1) return
    g.save()
    g.globalAlpha = 1 - pull

    // Stars past 55% night
    if (e > 0.55) {
      for (const st of this.stars) {
        const a = clamp((e - 0.55 - st.i * 0.0035) / 0.15) * (0.55 + 0.45 * Math.sin(t * st.sp + st.tw))
        if (a <= 0) continue
        const x = st.x * W
        const y = st.y * H
        const rr = st.r * (0.7 + 0.3 * a) * Math.max(0.8, sk)
        g.fillStyle = `rgba(255,248,230,${a})`
        g.beginPath()
        g.arc(x, y, rr, 0, TAU)
        g.fill()
        if (st.cross) {
          g.strokeStyle = `rgba(255,248,230,${a * 0.8})`
          g.lineWidth = 1
          g.beginPath()
          g.moveTo(x - rr * 3.5, y)
          g.lineTo(x + rr * 3.5, y)
          g.moveTo(x, y - rr * 3.5)
          g.lineTo(x, y + rr * 3.5)
          g.stroke()
        }
      }
    }

    // Sun and moon ride an arc; direction depends on which way the toggle went
    const arcA = H * 0.9
    const hz = H * 0.96
    const toDay = this.nightTarget === 0
    const su = toDay ? 0.25 * (1 - clamp(e / 0.62)) : 0.25 + 0.75 * clamp(e / 0.62)
    const sunX = lerp(W * 0.04, W * 0.96, su)
    const sunY = hz - arcA * 4 * su * (1 - su)
    const sunR = 40 * sk
    if (e < (toDay ? 0.66 : 0.8) && sunY < H + sunR) {
      const k0 = clamp(e / 0.55)
      const cs = rgb(mix([255, 247, 224], [255, 160, 92], k0))
      const ce = mix([255, 214, 140], [255, 100, 62], k0)
      const gl = g.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, sunR * 5)
      gl.addColorStop(0, rgb(ce, 0.38))
      gl.addColorStop(0.35, rgb(ce, 0.14))
      gl.addColorStop(1, rgb(ce, 0))
      g.fillStyle = gl
      g.beginPath()
      g.arc(sunX, sunY, sunR * 5, 0, TAU)
      g.fill()
      const dg = g.createRadialGradient(sunX - sunR * 0.3, sunY - sunR * 0.3, sunR * 0.1, sunX, sunY, sunR)
      dg.addColorStop(0, cs)
      dg.addColorStop(1, rgb(ce))
      g.fillStyle = dg
      g.beginPath()
      g.arc(sunX, sunY, sunR, 0, TAU)
      g.fill()
    }
    const mw = toDay ? 0.78 + 0.22 * (1 - clamp((e - 0.38) / 0.62)) : clamp((e - 0.38) / 0.62) * 0.78
    const moonX = lerp(W * 0.07, W * 0.93, mw)
    const moonY = hz - arcA * 4 * mw * (1 - mw)
    const moonR = 32 * sk
    const ma = clamp((e - 0.38) / 0.25)
    if (ma > 0 && moonY < H + moonR) {
      const mg = g.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, moonR * 4.5)
      mg.addColorStop(0, `rgba(214,228,255,${0.3 * ma})`)
      mg.addColorStop(1, 'rgba(214,228,255,0)')
      g.fillStyle = mg
      g.beginPath()
      g.arc(moonX, moonY, moonR * 4.5, 0, TAU)
      g.fill()
      const md = g.createRadialGradient(moonX - moonR * 0.35, moonY - moonR * 0.35, moonR * 0.1, moonX, moonY, moonR)
      md.addColorStop(0, `rgba(255,251,234,${ma})`)
      md.addColorStop(1, `rgba(226,220,196,${ma})`)
      g.fillStyle = md
      g.beginPath()
      g.arc(moonX, moonY, moonR, 0, TAU)
      g.fill()
      g.fillStyle = `rgba(160,150,120,${0.2 * ma})`
      for (const [cx, cy, cr] of [[-0.3, -0.25, 0.22], [0.28, 0.08, 0.17], [-0.08, 0.4, 0.12], [0.35, -0.38, 0.1]]) {
        g.beginPath()
        g.arc(moonX + cx * moonR, moonY + cy * moonR, cr * moonR, 0, TAU)
        g.fill()
      }
    }

    // Soft glow behind the card, warmer on sign-up; it leaves with the card
    const glow = (1 - e) * (this.crash == null ? 1 : 1 - clamp(this.crash / 0.6))
    g.fillStyle = `rgba(255,255,255,${0.55 * glow})`
    g.beginPath()
    g.arc(W * (0.5 - 0.05 * m), H * 0.42, 175 * s, 0, TAU)
    g.fill()
    g.fillStyle = `rgba(196,92,62,${0.13 * m * glow})`
    g.beginPath()
    g.arc(W * (0.5 - 0.05 * m), H * 0.42, 175 * s * (0.7 + 0.3 * m), 0, TAU)
    g.fill()

    // Clouds drift and parallax with the cursor
    const cc = across([255, 255, 255], [255, 208, 192], [84, 100, 146], e)
    g.fillStyle = rgb(cc, lerp(0.7, 0.5, e))
    for (const cl of this.clouds) {
      if (!this.reduce) cl.x += (cl.sp * dt) / W
      if (cl.x > 1.25) cl.x = -0.25
      const cx = cl.x * W - (this.mx > -9000 ? (this.mx / window.innerWidth - 0.5) * cl.par * s : 0) - m * 30 * s
      const cy = H * cl.y
      const w2 = cl.w * s
      g.beginPath()
      g.roundRect(cx - w2 / 2, cy, w2, 26 * s, 13 * s)
      g.fill()
      g.beginPath()
      g.roundRect(cx - w2 * 0.2, cy - 12 * s, w2 * 0.45, 22 * s, 11 * s)
      g.fill()
    }
    g.restore()
  }
}
