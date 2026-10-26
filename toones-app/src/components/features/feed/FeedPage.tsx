import { useEffect, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { KEYS, read, readJSON, useNight } from '../../lib/storage'
import { Fab, MicIcon, NightToggle, PaperChip } from '../../ui'
import { FriendsView } from '../friends/FriendsView'
import { useHome, type User } from '../home/homeStore'
import { AccountMenu } from '../home/hud/AccountMenu'
import { stopPlayback } from '../home/player'
import type { MenuId } from '../menu/menu'
import { DetailDrawer } from './DetailDrawer'
import { FeedRail } from './FeedRail'
import { stopFeed } from './feedPlayer'
import { useFeed } from './feedStore'
import { NotesLayer } from './NotesLayer'
import { NowPlaying } from './NowPlaying'
import { RecordSheet } from './RecordSheet'
import { FeedSky } from './skyEngine'
import { FeedView, InboxView, SettingsView } from './views'
import '../home/home.css'
import './feed.css'

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

  return <canvas ref={ref} className="feed-sky" aria-hidden="true" />
}

function FeedToast() {
  const toast = useFeed((s) => s.toast)
  return (
    <div className="feed-toast-wrap" aria-live="polite">
      <div className={toast?.on ? 'feed-toast is-on' : 'feed-toast'}>
        {toast?.text}
      </div>
    </div>
  )
}

export default function FeedPage() {
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const view: MenuId = pathname.endsWith('/inbox') ? 'inbox' : pathname.endsWith('/settings') ? 'settings' : pathname.endsWith('/friends') ? 'friends' : 'feed'
  const status = useFeed((s) => s.status)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    stopPlayback()
    useHome.setState({ user: readJSON<User>(KEYS.user, { name: '', email: '' }), xp: Number(read(KEYS.xp) ?? 0) || 0 })
    if (useFeed.getState().status !== 'ready') void useFeed.getState().load()
    return () => stopFeed()
  }, [])

  // Shared links: /feed?toone=<id> opens that Toone once the feed has loaded
  useEffect(() => {
    const id = params.get('toone')
    if (!id || status !== 'ready') return
    if (useFeed.getState().toones.some((t) => t.id === id)) useFeed.getState().openDetail(id)
    setParams({}, { replace: true })
  }, [params, setParams, status])

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [view])

  return (
    <div ref={scroller} className="feed">
      <Sky />
      <header className="feed-top">
        <PaperChip as="button" type="button" className="hud-wordmark ui-press" aria-label="TOONES, back to top" onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
          TOONES
        </PaperChip>
        <AccountMenu />
      </header>
      <FeedRail active={view} />

      <main key={view} className="feed-col">{view === 'inbox' ? <InboxView /> : view === 'settings' ? <SettingsView /> : view === 'friends' ? <FriendsView /> : <FeedView />}</main>

      <div className="feed-corner">
        <NightToggle className="feed-night" />
        <Fab aria-label="Record a Toone" onClick={() => useFeed.getState().setSheet(true)}>
          <MicIcon />
        </Fab>
      </div>

      <NowPlaying />
      <DetailDrawer />
      <RecordSheet />
      <FeedToast />
      <NotesLayer />
    </div>
  )
}
