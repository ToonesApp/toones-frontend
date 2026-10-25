import { clamp, fitCanvas, prefersReducedMotion } from '../../characters/clay'
import { ShootingStars, drawCloud } from '../../sky/sky'

type RGB = [number, number, number]
const TAU = Math.PI * 2
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const rgb = (c: RGB, a = 1) => `rgba(${c.map(Math.round).join(',')},${a})`
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2)

const NIGHT_FADE_S = 1.2
const ARC_S = 2.6
const SUN_R = 28
const MOON_R = 22

/** Feed backdrop: sky gradient, stars, sun and moon on one arc, drifting clouds, shooting stars. Sits behind the feed. */
export class FeedSky {
  private raf = 0
  private last = 0
  private night = false
  /** Sky fade, 0 day → 1 night. */
  private n = 0
  /** Arc phase: 0 day rest, 1 night rest; night → day runs 1 → 2 and wraps to 0. */
  private th = 0
  private mouseX = -1e4
  private reduce = prefersReducedMotion()
  private stars = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random() * 0.6, r: 0.5 + Math.random() * 0.8, tw: Math.random() * 6 }))
  private clouds = [
    { x: 0.12, y: 0.17, w: 230, sp: 6, par: 14 },
    { x: 0.6, y: 0.3, w: 310, sp: 3.5, par: 24 },
    { x: 0.88, y: 0.09, w: 150, sp: 9, par: 8 },
    { x: 0.32, y: 0.55, w: 260, sp: 5, par: 18 },
  ]
  private shooting = new ShootingStars()
  private canvas: HTMLCanvasElement
  private onMove = (e: PointerEvent) => {
    this.mouseX = e.clientX
  }

  constructor(canvas: HTMLCanvasElement, night: boolean) {
    this.canvas = canvas
    this.night = night
    this.n = night ? 1 : 0
    this.th = night ? 1 : 0
    window.addEventListener('pointermove', this.onMove)
    this.raf = requestAnimationFrame(this.frame)
  }

  setNight(on: boolean) {
    this.night = on
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('pointermove', this.onMove)
  }

  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame)
    const dt = Math.min(0.1, this.last ? (now - this.last) / 1000 : 0)
    this.last = now
    const { g, w: W, h: H } = fitCanvas(this.canvas)
    if (!g || !W || !H) return

    const target = this.night ? 1 : 0
    this.n = this.reduce ? target : clamp(this.n + Math.sign(target - this.n) * (dt / NIGHT_FADE_S))
    this.stepArc(dt)
    const n = this.n

    const top = mix([168, 200, 226], [12, 18, 38], n)
    const bottom = mix([214, 228, 240], [30, 42, 76], n)
    const sky = g.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, rgb(top))
    sky.addColorStop(1, rgb(bottom))
    g.fillStyle = sky
    g.fillRect(0, 0, W, H)

    if (n > 0.01) {
      const t = now / 1000
      for (const s of this.stars) {
        g.fillStyle = `rgba(255,250,235,${n * (0.55 + 0.45 * Math.sin(t * 1.6 + s.tw))})`
        g.beginPath()
        g.arc(s.x * W, s.y * H, s.r, 0, TAU)
        g.fill()
      }
    }
    this.shooting.step(g, dt, W, H, n > 0.99 && !this.reduce)

    this.drawSunMoon(g, W, H)

    const alpha = 0.7 + (0.5 - 0.7) * n
    const cc = rgb(mix([255, 255, 255], [84, 100, 146], n), alpha)
    const cs = rgb(mix([211, 226, 240], [58, 71, 114], n), alpha)
    const par = this.mouseX > -9000 ? this.mouseX / W - 0.5 : 0
    this.clouds.forEach((c, i) => {
      if (!this.reduce) {
        c.x += (c.sp * dt) / W
        if (c.x > 1.25) c.x = -0.25
      }
      drawCloud(g, i, c.x * W - c.w / 2 - par * c.par, H * c.y, c.w, cc, cs)
    })
  }

  private stepArc(dt: number) {
    const stop = this.night ? 1 : 0
    if (this.reduce) {
      this.th = stop
      return
    }
    if (this.th === stop) return
    const prev = this.th
    this.th += dt / ARC_S
    if (this.night && prev < 1 && this.th >= 1) this.th = 1
    else if (this.th >= 2) this.th = 0
  }

  private drawSunMoon(g: CanvasRenderingContext2D, W: number, H: number) {
    const th = this.th
    const hz = H * 0.96
    const A = H * 0.9
    // Rest point in the margin beside the feed column
    const ru = clamp(((84 + Math.max(84, (W - Math.min(620, W - 320)) / 2)) / 2 / W - 0.04) / 0.92, 0, 0.3)
    const ax = (u: number) => W * (0.04 + 0.92 * u)
    const ay = (u: number) => hz - A * Math.max(0, Math.sin(Math.PI * clamp(u))) ** 0.4

    const ee = easeInOut(th <= 1 ? th : th - 1)
    let su: number, mw: number, sa: number, ma: number
    if (th <= 1) {
      su = ru + (1 - ru) * clamp(ee / 0.62)
      mw = clamp((ee - 0.38) / 0.62) * (1 - ru)
      sa = clamp((0.8 - ee) / 0.12)
      ma = clamp((ee - 0.38) / 0.12)
    } else {
      mw = 1 - ru + ru * clamp(ee / 0.62)
      su = ru * clamp((ee - 0.38) / 0.62)
      ma = clamp((0.8 - ee) / 0.12)
      sa = clamp((ee - 0.38) / 0.12)
    }
    // Sun turns orange as it sets
    const k0 = th <= 1 ? clamp(ee / 0.55) : 1 - clamp((ee - 0.3) / 0.55)

    if (sa > 0) {
      const x = ax(su)
      const y = ay(su)
      const inner = mix([255, 247, 224], [255, 160, 92], k0)
      const outer = mix([255, 214, 140], [255, 100, 62], k0)
      g.save()
      g.globalAlpha = sa
      const glow = g.createRadialGradient(x, y, SUN_R * 0.6, x, y, SUN_R + 60)
      glow.addColorStop(0, rgb(outer, 0.4))
      glow.addColorStop(1, rgb(outer, 0))
      g.fillStyle = glow
      g.beginPath()
      g.arc(x, y, SUN_R + 60, 0, TAU)
      g.fill()
      const disc = g.createRadialGradient(x - SUN_R * 0.3, y - SUN_R * 0.3, SUN_R * 0.1, x, y, SUN_R)
      disc.addColorStop(0, rgb(inner))
      disc.addColorStop(1, rgb(outer))
      g.fillStyle = disc
      g.beginPath()
      g.arc(x, y, SUN_R, 0, TAU)
      g.fill()
      g.restore()
    }

    if (ma > 0) {
      const x = ax(mw)
      const y = ay(mw)
      g.save()
      g.globalAlpha = ma
      const glow = g.createRadialGradient(x, y, MOON_R * 0.8, x, y, MOON_R * 3.5)
      glow.addColorStop(0, 'rgba(232,236,245,.22)')
      glow.addColorStop(1, 'rgba(232,236,245,0)')
      g.fillStyle = glow
      g.beginPath()
      g.arc(x, y, MOON_R * 3.5, 0, TAU)
      g.fill()
      g.fillStyle = '#E8ECF5'
      g.beginPath()
      g.arc(x, y, MOON_R, 0, TAU)
      g.fill()
      g.clip()
      // Inset shadow on the lower right
      const shade = g.createRadialGradient(x - MOON_R * 0.45, y - MOON_R * 0.45, MOON_R * 0.6, x, y, MOON_R * 1.15)
      shade.addColorStop(0, 'rgba(150,162,190,0)')
      shade.addColorStop(1, 'rgba(150,162,190,.55)')
      g.fillStyle = shade
      g.fillRect(x - MOON_R, y - MOON_R, MOON_R * 2, MOON_R * 2)
      g.fillStyle = 'rgba(170,180,204,.45)'
      for (const [cx, cy, cr] of [[0.25, -0.2, 0.18], [-0.3, 0.25, 0.12], [0.1, 0.4, 0.09]]) {
        g.beginPath()
        g.arc(x + cx * MOON_R, y + cy * MOON_R, cr * MOON_R, 0, TAU)
        g.fill()
      }
      g.restore()
    }
  }
}
