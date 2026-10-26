import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ClayCharacter } from '../../characters/ClayCharacter'
import { CATEGORIES, type Category } from '../../characters/clay'
import { getToken, uploadSound, type SoundCategory } from '../../lib/api'
import { saveClip } from '../../lib/audioStore'
import { loadCountries, placeName, searchPlaces, type LngLat } from '../../lib/geo'
import { Take } from '../../lib/take'
import { CloseIcon, PhotoIcon } from '../../ui'
import { displayName, useHome } from '../home/homeStore'
import { stopFeed } from './feedPlayer'
import { useFeed } from './feedStore'
import { fmtDur } from './format'
import { usePresence } from './usePresence'

const BARS = 36
const MAX_SECONDS = 60
const OPEN_MS = 500

type Phase = 'idle' | 'rec' | 'done'

export function RecordSheet() {
  const { mounted, open } = usePresence(useFeed((s) => s.sheet), OPEN_MS)
  return mounted ? <SheetBody open={open} /> : null
}

function locate(): Promise<LngLat | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.longitude, p.coords.latitude]),
      () => resolve(null),
      { timeout: 8000, maximumAge: 600000 },
    )
  })
}

function SheetBody({ open }: { open: boolean }) {
  const close = useCallback(() => useFeed.getState().setSheet(false), [])
  const [phase, setPhase] = useState<Phase>('idle')
  const [meter, setMeter] = useState<number[]>([])
  const [seconds, setSeconds] = useState(0)
  const [cat, setCat] = useState<Category>('Music')
  const [title, setTitle] = useState('')
  const [place, setPlace] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo])
  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
  }, [photoUrl])
  const take = useRef<Take | null>(null)
  const result = useRef<{ blob: Blob | null; dur: number } | null>(null)
  const tick = useRef(0)
  const photoInput = useRef<HTMLInputElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    stopFeed()
    void loadCountries()
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearInterval(tick.current)
      take.current?.cancel()
    }
  }, [close])

  const finish = async () => {
    const t = take.current
    if (!t) return
    window.clearInterval(tick.current)
    const dur = Math.max(1, Math.min(MAX_SECONDS, Math.round(t.seconds())))
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
    if (!ok) useFeed.getState().flash('Microphone is blocked, recording a stand-in')
    result.current = null
    setMeter([])
    setSeconds(0)
    setPhase('rec')
    tick.current = window.setInterval(() => {
      setMeter((m) => [...m, t.level()].slice(-BARS))
      const s = t.seconds()
      setSeconds(s)
      if (s >= MAX_SECONDS) void finishRef.current()
    }, 90)
  }

  const drop = async () => {
    const r = result.current
    if (!r || busy) return
    setBusy(true)
    const feed = useFeed.getState()
    const typed = place.trim()
    await loadCountries()
    const coords = (typed && searchPlaces(typed, 1)[0]?.center) || (await locate())
    if (!coords) {
      setBusy(false)
      feed.flash(typed ? 'Couldn’t find that place, try a city name' : 'Add where you are to drop it')
      return
    }
    const [lon, lat] = coords
    const name = title.trim() || 'Untitled Toone'
    const where = typed || placeName(lon, lat)

    let id = `local-${crypto.randomUUID()}`
    let audioUrl = r.blob ? URL.createObjectURL(r.blob) : null
    let uploaded = false
    if (r.blob && getToken()) {
      try {
        const res = await uploadSound({ audio: r.blob, title: name, category: cat.toLowerCase() as SoundCategory, lon, lat, durationSec: r.dur, placeName: where })
        id = res.sound.id
        audioUrl = res.sound.audioUrl
        uploaded = true
      } catch {
        /* kept on this device below */
      }
    }

    const home = useHome.getState()
    if (r.blob) await saveClip(id, r.blob).catch(() => undefined)
    home.addDrop({ id, title: name, cat, dur: r.dur, lon, lat, standIn: !r.blob })
    const me = displayName(home.user)
    feed.prepend({ id, cat, name: me, handle: '', when: Date.now(), title: name, place: where, caption: '', dur: r.dur, listens: 0, lon, lat, audioUrl, mine: true })
    if (photo) feed.addPhoto(id, photo)
    feed.setSheet(false)
    feed.flash(uploaded || !r.blob ? 'Dropped. It will appear on the globe.' : 'Saved on this device. Sign in to share it.')
  }

  const bars = Array.from({ length: BARS }, (_, i) => meter[i - (BARS - meter.length)])
  const status = phase === 'rec' ? `Recording ${fmtDur(seconds)}` : phase === 'done' ? `Recorded ${fmtDur(seconds)}` : 'Tap to record'

  return (
    <>
      <div className={open ? 'sheet-scrim is-open' : 'sheet-scrim'} onClick={close} />
      <section className={open ? 'sheet is-open' : 'sheet'} role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet__head">
          <h2 id="sheet-title">Record a Toone</h2>
          <button ref={closeRef} type="button" className="round-btn ui-press" aria-label="Close" onClick={close}>
            <CloseIcon />
          </button>
        </div>

        <div className="sheet__stage">
          <span className="sheet__char">
            <ClayCharacter species="tomo" size={96} mood={phase === 'rec' ? 'talk' : 'idle'} fill={0.7} />
          </span>
          <div className="sheet__meter" aria-hidden="true">
            {bars.map((v, i) => (
              <span key={i} style={{ height: v == null ? 4 : Math.max(4, Math.round(v * 40)) }} />
            ))}
          </div>
          <div className="sheet__status num" aria-live="polite">
            {status}
          </div>
          <button
            type="button"
            className={phase === 'rec' ? 'rec-btn is-rec ui-press' : 'rec-btn ui-press'}
            aria-label={phase === 'rec' ? 'Stop recording' : phase === 'done' ? 'Record again' : 'Start recording'}
            onClick={phase === 'rec' ? finish : start}
          >
            <span />
          </button>
        </div>

        <button type="button" className={photoUrl ? 'sheet__photo has-photo' : 'sheet__photo'} aria-label={photoUrl ? 'Change photo' : undefined} onClick={() => photoInput.current?.click()} style={photoUrl ? { backgroundImage: `url(${photoUrl})` } : undefined}>
          {!photo && (
            <>
              <PhotoIcon />
              <span>Add a photo of where you are</span>
            </>
          )}
        </button>
        <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />

        <div className="chips" role="group" aria-label="Category">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className="chip ui-press" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <input className="pill-input" type="text" placeholder="Name this sound" aria-label="Name this sound" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="pill-input" type="text" placeholder="Where are you?" aria-label="Where are you?" maxLength={80} value={place} onChange={(e) => setPlace(e.target.value)} />
        <button type="button" className="drop-btn ui-press" disabled={phase !== 'done' || busy} onClick={drop}>
          {busy ? 'Dropping…' : 'Drop it'}
        </button>
      </section>
    </>
  )
}
