import { useEffect, useLayoutEffect, useState } from 'react'
import { prefersReducedMotion } from '../../components/characters/clay'
import { Fab, MicIcon, NightToggle, PaperChip } from '../../components/ui'
import { KEYS, read, readJSON, write } from '../../lib/storage'
import { ArrivalOverlay } from '../transition/ArrivalOverlay'
import { useArrival } from '../transition/arrivalStore'
import { CategoryRail } from './CategoryRail'
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

function Corner() {
  const count = useHome((s) => s.drops.length)
  const setPanel = useHome((s) => s.setPanel)
  const openRecord = useHome((s) => s.openRecord)
  return (
    <div className="hud-corner" data-arrive>
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

  useEffect(() => () => stopPlayback(), [])

  useLayoutEffect(() => {
    write(KEYS.arrive, null)
    useHome.setState({ user: readJSON<User>(KEYS.user, { name: '', email: '' }) })
    if (!arriving) return
    useArrival.getState().begin()
    const huds = document.querySelectorAll('.home [data-arrive], .home [data-arrive-panel]')
    const fades = [...huds].map((el, i) =>
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 900 + i * 60, easing: 'ease-out', fill: 'backwards' }),
    )
    return () => {
      fades.forEach((a) => a.cancel())
      useArrival.getState().end()
    }
  }, [arriving])

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
      <CategoryRail />
      <DropsPanel />
      <ZoomControls />
      <BottomBar />
      <Corner />
      <RecordDialog />
      {overlay && <ArrivalOverlay />}
    </div>
  )
}
