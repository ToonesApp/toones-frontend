/* Sky pieces shared by the Auth scene and the Feed: the four cloud shapes and shooting stars. */

/** Circle [cx, cy, r] or rounded bar [x, y, w, h], in the cloud's own viewBox units. */
type Part = [number, number, number] | [number, number, number, number]
type CloudShape = { w: number; h: number; parts: Part[] }

/** Tall cumulus, long flat cloud with a wisp, small three-lobe cloud, two-lobe cloud with a detached puff. */
export const CLOUD_SHAPES: readonly CloudShape[] = [
  { w: 300, h: 104, parts: [[10, 72, 280, 30], [80, 64, 38], [142, 44, 52], [207, 60, 40], [252, 74, 26]] },
  { w: 370, h: 84, parts: [[0, 44, 370, 24], [95, 42, 22], [175, 32, 28], [255, 40, 20], [318, 50, 14], [60, 76, 170, 8]] },
  { w: 160, h: 82, parts: [[8, 54, 144, 26], [52, 52, 26], [98, 38, 34], [135, 54, 20]] },
  { w: 330, h: 104, parts: [[20, 68, 220, 26], [72, 66, 30], [128, 46, 44], [188, 64, 30], [278, 88, 40, 12], [286, 84, 14]] },
]

/** The shadow layer sits this many viewBox units below the cloud. */
const SHADOW_DY = 6

/** Draws cloud `index` with its top-left at (x, y), `width` px wide. Colors are full CSS colors (alpha included). */
export function drawCloud(g: CanvasRenderingContext2D, index: number, x: number, y: number, width: number, color: string, shadow: string) {
  const shape = CLOUD_SHAPES[index % CLOUD_SHAPES.length]
  const k = width / shape.w
  for (const [fill, dy] of [[shadow, SHADOW_DY], [color, 0]] as const) {
    g.fillStyle = fill
    g.beginPath()
    for (const p of shape.parts) {
      if (p.length === 3) {
        const [cx, cy, r] = p
        g.moveTo(x + (cx + r) * k, y + (cy + dy) * k)
        g.arc(x + cx * k, y + (cy + dy) * k, r * k, 0, Math.PI * 2)
      } else {
        const [bx, by, bw, bh] = p
        g.roundRect(x + bx * k, y + (by + dy) * k, bw * k, bh * k, (bh * k) / 2)
      }
    }
    g.fill()
  }
  return shape.h * k
}

type Streak = { x: number; y: number; vx: number; vy: number; t: number; life: number; len: number }

/** Occasional streaks across the upper sky. Call `step` every frame; it only spawns while `active`. */
export class ShootingStars {
  private streaks: Streak[] = []
  private next: number | null = null
  private t = 0

  step(g: CanvasRenderingContext2D, dt: number, W: number, H: number, active: boolean, scale = 1) {
    this.t += dt
    if (active) {
      this.next ??= this.t + 1.5 + Math.random() * 3
      if (this.t > this.next) {
        const dir = Math.random() < 0.5 ? 1 : -1
        const speed = W * (0.7 + Math.random() * 0.4)
        this.streaks.push({
          x: W * (dir > 0 ? 0.05 + Math.random() * 0.5 : 0.45 + Math.random() * 0.5),
          y: H * (0.04 + Math.random() * 0.3),
          vx: dir * speed,
          vy: speed * (0.35 + Math.random() * 0.2),
          t: 0,
          life: 0.7 + Math.random() * 0.4,
          len: 0.09 + Math.random() * 0.06,
        })
        this.next = this.t + 3 + Math.random() * 6
      }
    } else this.next = null

    this.streaks = this.streaks.filter((q) => (q.t += dt) < q.life)
    for (const q of this.streaks) {
      const a = Math.sin((Math.PI * q.t) / q.life)
      const hx = q.x + q.vx * q.t
      const hy = q.y + q.vy * q.t
      const tx = hx - q.vx * q.len
      const ty = hy - q.vy * q.len
      const grad = g.createLinearGradient(tx, ty, hx, hy)
      grad.addColorStop(0, 'rgba(255,248,230,0)')
      grad.addColorStop(1, `rgba(255,248,230,${a})`)
      g.strokeStyle = grad
      g.lineWidth = Math.max(1.5, 2.2 * scale)
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(tx, ty)
      g.lineTo(hx, hy)
      g.stroke()
      g.fillStyle = `rgba(255,252,240,${a})`
      g.beginPath()
      g.arc(hx, hy, Math.max(1.6, 2.4 * scale), 0, Math.PI * 2)
      g.fill()
    }
  }
}
