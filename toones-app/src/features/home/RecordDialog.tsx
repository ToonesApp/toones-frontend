import { useCallback, useEffect, useRef, useState } from 'react'
import { CATEGORIES, CATEGORY_SPECIES, faceDataUrl, type Category } from '../../components/characters/clay'
import { ClayButton, PaperChip } from '../../components/ui'
import { saveClip } from '../../lib/audioStore'
import { fmtDur } from './format'
import { live, spotLabel, useHome } from './homeStore'
import { stopPlayback } from './player'

const BARS = 28
const MAX_SECONDS = 60
const MIC_BLOCKED = 'Microphone is blocked here, so this take is a stand-in sound.'

type Phase = 'idle' | 'rec' | 'done'

/** Mic capture with a level meter. Falls back to a synthetic level when the mic is unavailable. */
class Take {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []
  private ctx: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private buf = new Uint8Array(512)
  started = 0

  async start() {
    this.chunks = []
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.recorder = new MediaRecorder(this.stream)
      this.recorder.ondataavailable = (e) => this.chunks.push(e.data)
      this.recorder.start()
      this.ctx = new AudioContext()
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 512
      this.ctx.createMediaStreamSource(this.stream).connect(this.analyser)
    } catch {
      this.release()
      this.recorder = null
    }
    this.started = performance.now()
    return this.recorder !== null
  }

  level() {
    if (!this.analyser) return Math.max(0, 0.35 + Math.sin(performance.now() / 260) * 0.25 + (Math.random() - 0.5) * 0.4)
    this.analyser.getByteTimeDomainData(this.buf)
    let sum = 0
    for (const b of this.buf) sum += ((b - 128) / 128) ** 2
    return Math.min(1, Math.sqrt(sum / this.buf.length) * 5)
  }

  seconds() {
    return (performance.now() - this.started) / 1000
  }

  /** Resolves with the recorded audio, or null for a stand-in take. */
  stop(): Promise<Blob | null> {
    const rec = this.recorder
    if (!rec || rec.state === 'inactive') {
      this.release()
      return Promise.resolve(null)
    }
    return new Promise((resolve) => {
      rec.onstop = () => {
        resolve(new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' }))
        this.release()
      }
      rec.stop()
    })
  }

  cancel() {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.onstop = null
      this.recorder.stop()
    }
    this.recorder = null
    this.release()
  }

  private release() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.ctx?.close().catch(() => undefined)
    this.ctx = null
    this.analyser = null
  }
}

export function RecordDialog() {
  const open = useHome((s) => s.recordOpen)
  return open ? <RecordDialogBody /> : null
}

function RecordDialogBody() {
  const spot = useHome((s) => s.spot)
  const close = useHome((s) => s.closeRecord)
  const [phase, setPhase] = useState<Phase>('idle')
  const [meter, setMeter] = useState<number[]>([])
  const [seconds, setSeconds] = useState(0)
  const [note, setNote] = useState('')
  const [title, setTitle] = useState('')
  const [cat, setCat] = useState<Category>('Music')
  const take = useRef<Take | null>(null)
  const result = useRef<{ blob: Blob | null; dur: number } | null>(null)
  const tick = useRef(0)
  const startRef = useRef<HTMLButtonElement>(null)
  const stopRef = useRef<HTMLButtonElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const endTick = () => {
    window.clearInterval(tick.current)
    live.recording = false
    live.level = 0
  }

  const cancel = useCallback(() => {
    endTick()
    take.current?.cancel()
    take.current = null
    close()
  }, [close])

  useEffect(() => {
    stopPlayback()
    const { spot: s, globe } = useHome.getState()
    if (s) globe?.flyTo([s.lon, s.lat])
    startRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      endTick()
      take.current?.cancel()
    }
  }, [cancel])

  useEffect(() => {
    if (phase === 'rec') stopRef.current?.focus()
    if (phase === 'done') titleRef.current?.focus()
    if (phase === 'idle') startRef.current?.focus()
  }, [phase])

  const finish = async () => {
    const t = take.current
    if (!t) return
    endTick()
    const dur = Math.max(1, Math.round(t.seconds()))
    const blob = await t.stop()
    take.current = null
    result.current = { blob, dur }
    setSeconds(dur)
    setPhase('done')
  }
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  })

  const start = async () => {
    const t = new Take()
    take.current = t
    const ok = await t.start()
    if (take.current !== t) return t.cancel()
    setNote(ok ? '' : MIC_BLOCKED)
    setMeter([])
    setSeconds(0)
    setPhase('rec')
    live.recording = true
    tick.current = window.setInterval(() => {
      const lv = t.level()
      live.level = lv
      setMeter((m) => [...m, lv].slice(-BARS))
      const s = t.seconds()
      setSeconds(s)
      if (s >= MAX_SECONDS) void finishRef.current()
    }, 70)
  }

  const redo = () => {
    result.current = null
    setMeter([])
    setSeconds(0)
    setPhase('idle')
  }

  const onTitle = (v: string) => {
    setTitle(v)
    for (const d of useHome.getState().drops) if (Math.random() < 0.3) live.hops.add(d.id)
  }

  const drop = async () => {
    const r = result.current
    const s = useHome.getState().spot
    if (!r || !s) return
    const id = crypto.randomUUID()
    if (r.blob) await saveClip(id, r.blob).catch(() => undefined)
    const home = useHome.getState()
    const d = home.addDrop({ id, title: title.trim() || 'Untitled Toone', cat, dur: r.dur, lon: s.lon, lat: s.lat, standIn: !r.blob })
    live.popped.set(d.id, performance.now())
    live.happyUntil = performance.now() + 2200
    const g = home.globe
    if (g) g.flyTo([d.lon, d.lat], Math.max(g.zoom(), g.fitZoom() + 0.6))
  }

  const bars = Array.from({ length: BARS }, (_, i) => meter[i - (BARS - meter.length)])

  return (
    <div className="rec-scrim" onPointerDown={(e) => e.target === e.currentTarget && cancel()}>
      <PaperChip radius="dialog" className="rec" role="dialog" aria-modal="true" aria-labelledby="rec-title">
        <div className="rec__head">
          <div className="rec__titles">
            <div className="kicker ell">{spot ? `Pinned at ${spotLabel(spot)}` : 'Pinned here'}</div>
            <h2 id="rec-title">Drop a Toone</h2>
          </div>
          <button type="button" className="ui-quiet" onClick={cancel}>
            Close
          </button>
        </div>

        <div className="rec__well">
          <div className="rec__timer num" aria-live="off">
            {fmtDur(seconds)}
          </div>
          <div className="rec__meter" aria-hidden="true">
            {bars.map((v, i) => (
              <span key={i} className={v == null ? 'rec__bar' : 'rec__bar is-on'} style={{ height: Math.max(4, Math.round((v ?? 0) * 40)) }} />
            ))}
          </div>
        </div>
        {note && <p className="rec__note">{note}</p>}

        {phase === 'idle' && (
          <ClayButton ref={startRef} block onClick={start}>
            Record
          </ClayButton>
        )}
        {phase === 'rec' && (
          <ClayButton ref={stopRef} variant="ink" block onClick={finish}>
            Stop
          </ClayButton>
        )}
        {phase === 'done' && (
          <div className="rec__done">
            <label className="ui-field">
              Title
              <input ref={titleRef} className="ui-input" type="text" maxLength={48} placeholder="What is this place saying?" value={title} onChange={(e) => onTitle(e.target.value)} />
            </label>
            <div className="rec__cats-wrap">
              <div className="rec__label">Category</div>
              <div className="rec__cats">
                {CATEGORIES.map((c) => (
                  <button key={c} type="button" className="rec-tag ui-press" aria-pressed={cat === c} onClick={() => setCat(c)}>
                    <img src={faceDataUrl(CATEGORY_SPECIES[c])} alt="" width={24} height={24} />
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="rec__actions">
              <ClayButton variant="ghost" onClick={redo}>
                Redo
              </ClayButton>
              <ClayButton onClick={drop}>Drop on globe</ClayButton>
            </div>
          </div>
        )}
      </PaperChip>
    </div>
  )
}
