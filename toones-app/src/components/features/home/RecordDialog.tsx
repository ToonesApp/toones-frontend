import { useCallback, useEffect, useRef, useState } from 'react'
import { CATEGORIES, type Category } from '../../characters/clay'
import { ClayButton, PaperChip } from '../../ui'
import { saveClip } from '../../lib/audioStore'
import { Take } from '../../lib/take'
import { fmtDur } from './format'
import { live, spotLabel, useHome } from './homeStore'
import { stopPlayback } from './player'

const BARS = 28
const MAX_SECONDS = 60
const MIC_BLOCKED = 'Microphone is blocked here, so this take is a stand-in sound.'

type Phase = 'idle' | 'rec' | 'done'

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
