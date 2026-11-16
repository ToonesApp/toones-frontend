import { useEffect, useRef } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { KEYS, read, readJSON, useNight } from '../../lib/storage'
import { NightToggle, PaperChip } from '../../ui'
import { FeedSky } from '../feed/skyEngine'
import { useHome, type User } from '../home/homeStore'
import { AccountMenu } from '../home/hud/AccountMenu'
import { stopPlayback } from '../home/player'
import { Hub } from './Hub'
import { useScores } from './scores'
import '../home/home.css'
import './games.css'

function Sky() {
  const ref = useRef<HTMLCanvasElement>(null)
  const sky = useRef<FeedSky | null>(null)
  const [night] = useNight()
  const nightRef = useRef(night)

  useEffect(() => {
    if (!ref.current) return
    const s = new FeedSky(ref.current, nightRef.current)
    sky.current = s
    return () => s.destroy()
  }, [])

  useEffect(() => {
    nightRef.current = night
    sky.current?.setNight(night)
  }, [night])

  return <canvas ref={ref} className="games-sky" aria-hidden="true" />
}

export default function GamesPage() {
  useEffect(() => {
    stopPlayback()
    useHome.setState({ user: readJSON<User>(KEYS.user, { name: '', email: '' }), xp: Number(read(KEYS.xp) ?? 0) || 0 })
    void useScores.getState().load()
  }, [])

  return (
    <div className="games">
      <Sky />
      <header className="hud-top">
        <PaperChip as={Link} to="/home" className="hud-wordmark ui-press games-wordmark" aria-label="TOONES, back to the globe">
          TOONES
        </PaperChip>
        <div className="games-top__right">
          <NightToggle className="games-night" />
          <AccountMenu />
        </div>
      </header>
      <Routes>
        <Route index element={<Hub />} />
      </Routes>
    </div>
  )
}
