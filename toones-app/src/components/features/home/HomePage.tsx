import { useEffect, useLayoutEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { prefersReducedMotion } from '../../characters/clay'
import { Fab, MicIcon, NightToggle, PaperChip } from '../../ui'
import { KEYS, read, readJSON, write } from '../../lib/storage'
import { ArrivalOverlay } from '../transition/ArrivalOverlay'
import { useArrival } from '../transition/arrivalStore'
import { HomeRail } from './HomeRail'
import { DropsPanel } from './DropsPanel'
import { Globe } from './globe/Globe'
import { useHome, type User } from './homeStore'
import { initialPanelOpen, isNarrow } from './layout'
import { BottomBar } from './hud/BottomBar'
import { Header } from './hud/Header'
import { Toast } from './hud/Toast'
import { ZoomControls } from './hud/ZoomControls'
import { stopPlayback } from './player'
import { RecordDialog } from './RecordDialog'
import './home.css'

type Side = 'left' | 'right' | 'top' | 'bottom'

/** Keyframes that bring a HUD piece in from just past its screen edge. `translate` leaves the element's own `transform` alone. */
function slideIn(el: HTMLElement): Keyframe[] {
  const side = ((isNarrow() && el.dataset.arriveNarrow) || el.dataset.arrive) as Side
  const r = el.getBoundingClientRect()
  const gap = 24
  const from = {
    left: `${-(r.right + gap)}px 0`,
    right: `${window.innerWidth - r.left + gap}px 0`,
    top: `0 ${-(r.bottom + gap)}px`,
    bottom: `0 ${window.innerHeight - r.top + gap}px`,
  }[side]
  return [{ translate: from, opacity: 0 }, { opacity: 1, offset: 0.35 }, { translate: '0 0', opacity: 1 }]
}

function Corner() {
  const count = useHome((s) => s.drops.length)
  const setPanel = useHome((s) => s.setPanel)
  const openRecord = useHome((s) => s.openRecord)
  return (
    <div className="hud-corner" data-arrive="right">
      <PaperChip as="button" type="button" className="hud-drops-btn ui-press" aria-controls="drops-panel" onClick={() => setPanel(true)}>
        {count ? `Drops · ${count}` : 'Drops'}
      </PaperChip>
      <NightToggle className="hud-night" />
      <Fab aria-label="Record a Toone" onClick={openRecord}>
        <MicIcon />
      </Fab>
    </div>
  )
}

export default function HomePage() {
  const [arriving] = useState(() => read(KEYS.arrive) === '1' && !prefersReducedMotion())
  const overlay = useArrival((s) => s.active)
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    void useHome.getState().loadWorld()
    return () => stopPlayback()
  }, [])

  useLayoutEffect(() => {
    write(KEYS.arrive, null)
    useHome.setState({
      user: readJSON<User>(KEYS.user, { name: '', email: '' }),
      xp: Number(read(KEYS.xp) ?? 0) || 0,
    })
    if (!arriving) return
    useArrival.getState().begin()
    const slides = [...document.querySelectorAll<HTMLElement>('.home [data-arrive]')]
      .filter((el) => !el.classList.contains('is-closed'))
      .map((el, i) => {
        const a = el.animate(slideIn(el), { duration: 650, delay: i * 50, easing: 'cubic-bezier(.22,1.15,.36,1)', fill: 'backwards' })
        a.pause()
        return a
      })
    const stop = useArrival.subscribe((s) => {
      if (!s.mapReady) return
      stop()
      slides.forEach((a) => a.play())
    })
    return () => {
      stop()
      slides.forEach((a) => a.cancel())
      useArrival.getState().end()
    }
  }, [arriving])

  // Links in from the Feed: ?panel=places opens Places, ?at=lon,lat flies there once the map is up
  useEffect(() => {
    if (params.get('panel') === 'places') {
      useHome.getState().setPanelTab('places')
      useHome.getState().setPanel(true)
    }
    const at = params.get('at')?.split(',').map(Number)
    if (params.has('panel') || params.has('at')) setParams({}, { replace: true })
    if (!at || at.length !== 2 || !at.every(Number.isFinite)) return
    const fly = () => {
      const g = useHome.getState().globe
      if (g) g.flyTo([at[0], at[1]], Math.max(5, g.fitZoom() + 2))
      return !!g
    }
    if (fly()) return
    return useHome.subscribe((s, prev) => {
      if (s.globe && !prev.globe) fly()
    })
    // Read once on arrival; clearing the params must not re-run it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let narrow = isNarrow()
    const onResize = () => {
      if (isNarrow() === narrow) return
      narrow = isNarrow()
      useHome.getState().setPanel(initialPanelOpen())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="home">
      <Globe />
      <Header />
      <Toast />
      <HomeRail />
      <DropsPanel />
      <ZoomControls />
      <BottomBar />
      <Corner />
      <RecordDialog />
      {overlay && <ArrivalOverlay />}
    </div>
  )
}