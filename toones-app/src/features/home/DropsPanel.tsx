import { useEffect, useState } from 'react'
import { CATEGORY_SPECIES, faceDataUrl } from '../../components/characters/clay'
import { IconButton, PauseIcon, PaperChip, PlayIcon, SegmentedTabs, type TabOption } from '../../components/ui'
import { localTime } from '../../lib/geo'
import { ago, fmtDur, placeCount, plural } from './format'
import { useHome, type Drop } from './homeStore'
import { isNarrow } from './layout'
import { togglePlayback } from './player'

const TABS: readonly TabOption<'drops' | 'places'>[] = [
  { value: 'drops', label: 'Drops', controls: 'drops-list' },
  { value: 'places', label: 'Places', controls: 'drops-list' },
]

function greeting(name: string, hour = new Date().getHours()) {
  const part = hour < 5 ? 'Up late' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return name ? `${part}, ${name}` : part
}

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

function Face({ drop, size }: { drop: Pick<Drop, 'cat'>; size: number }) {
  return <img className="panel-face" src={faceDataUrl(CATEGORY_SPECIES[drop.cat])} alt="" width={size} height={size} />
}

function Greeting() {
  const user = useHome((s) => s.user)
  const drops = useHome((s) => s.drops)
  const listens = useHome((s) => s.listens)
  const n = drops.length
  const places = placeCount(drops)
  const title = n === 0 ? 'Earth is quiet. Drop a Toone.' : n === 1 ? 'Your first Toone is on Earth.' : `${n} Toones carry your voice.`
  const lede = n ? 'Click a face on the globe to hear it, or pick a new spot.' : 'Spin the globe and click a spot, or record where the globe is facing.'

  return (
    <PaperChip as="section" radius="card" className="panel-greet">
      <div className="kicker">{greeting(user.name.trim())}</div>
      <h1>{title}</h1>
      <p>{lede}</p>
      <div className="panel-stats num">
        <Stat value={n} label={plural(n, 'drop')} />
        <Stat value={places} label={plural(places, 'place')} />
        <Stat value={listens} label={plural(listens, 'listen')} />
      </div>
    </PaperChip>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="panel-stat">
      <div className="panel-stat__value">{value}</div>
      <div className="panel-stat__label">{label}</div>
    </div>
  )
}

function DropRows({ list, now }: { list: Drop[]; now: number }) {
  const playingId = useHome((s) => s.playing?.id ?? null)
  const show = (d: Drop) => {
    const { globe, setPanel } = useHome.getState()
    if (globe) globe.flyTo([d.lon, d.lat], Math.max(globe.zoom(), globe.fitZoom() + 1))
    if (isNarrow()) setPanel(false)
  }
  return list.map((d) => {
    const on = playingId === d.id
    return (
      <div key={d.id} className={on ? 'panel-row is-on' : 'panel-row'}>
        <button type="button" className="panel-go" aria-label={`Show ${d.title} on the globe`} onClick={() => show(d)}>
          <Face drop={d} size={36} />
          <div className="panel-go__text">
            <div className="ell panel-go__title">{d.title}</div>
            <div className="ell num panel-go__sub">
              {d.place} · {fmtDur(d.dur)} · {ago(d.when, now)}
            </div>
          </div>
        </button>
        <IconButton aria-label={`${on ? 'Pause' : 'Play'} ${d.title}`} onClick={() => togglePlayback(d)}>
          {on ? <PauseIcon /> : <PlayIcon />}
        </IconButton>
      </div>
    )
  })
}

function PlaceRows({ list, now }: { list: Drop[]; now: number }) {
  const groups = new Map<string, Drop[]>()
  for (const d of list) groups.set(d.place, [...(groups.get(d.place) ?? []), d])
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
  const show = (ds: Drop[]) => {
    const lon = ds.reduce((a, d) => a + d.lon, 0) / ds.length
    const lat = ds.reduce((a, d) => a + d.lat, 0) / ds.length
    const { globe, setPanel } = useHome.getState()
    if (globe) globe.flyTo([lon, lat], Math.max(globe.zoom(), globe.fitZoom() + 0.6))
    if (isNarrow()) setPanel(false)
  }
  return sorted.map(([place, ds]) => {
    const lon = ds.reduce((a, d) => a + d.lon, 0) / ds.length
    return (
      <div key={place} className="panel-row">
        <button type="button" className="panel-go" onClick={() => show(ds)}>
          <div className="panel-stack">
            {ds.slice(0, 3).map((d) => (
              <Face key={d.id} drop={d} size={30} />
            ))}
          </div>
          <div className="panel-go__text">
            <div className="ell panel-go__title">{place}</div>
            <div className="num panel-go__sub">
              {ds.length} {plural(ds.length, 'drop')} · {localTime(lon, now)} there
            </div>
          </div>
        </button>
      </div>
    )
  })
}

export function DropsPanel() {
  const open = useHome((s) => s.panelOpen)
  const setPanel = useHome((s) => s.setPanel)
  const tab = useHome((s) => s.panelTab)
  const setTab = useHome((s) => s.setPanelTab)
  const drops = useHome((s) => s.drops)
  const visible = useHome((s) => s.visible)
  const now = useNow(60_000)
  const list = drops.filter((d) => visible.includes(d.cat))
  const hidden = drops.length - list.length

  const empty =
    tab === 'drops'
      ? drops.length
        ? 'No drops in these categories.'
        : 'Nothing yet. Your first drop earns 40 xp.'
      : drops.length
        ? 'No places for these categories.'
        : 'Places you drop in show up here.'

  return (
    <aside id="drops-panel" className={open ? 'panel' : 'panel is-closed'} aria-label="Your Toones" aria-hidden={!open} inert={!open} data-arrive-panel>
      <Greeting />
      <PaperChip as="section" radius="card" className="panel-list">
        <div className="panel-list__head">
          <SegmentedTabs options={TABS} value={tab} onChange={setTab} surface="well" aria-label="Panel view" />
          <button type="button" className="ui-quiet panel-close" onClick={() => setPanel(false)}>
            Close
          </button>
          {hidden > 0 && <span className="num panel-count">{hidden} hidden by filter</span>}
        </div>
        <div id="drops-list" role="tabpanel" className="panel-list__body">
          {list.length === 0 ? <div className="panel-empty">{empty}</div> : tab === 'drops' ? <DropRows list={list} now={now} /> : <PlaceRows list={list} now={now} />}
        </div>
      </PaperChip>
    </aside>
  )
}
