import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNight } from '../../lib/storage'
import { MENU_PATH, type MenuId } from '../menu/menu'
import { MenuRail } from '../menu/MenuRail'
import { unreadCount, useFeed } from './feedStore'

const WAKE_MS = 2500
const WAKE_RADIUS = 120

/** Rail on the Feed: looks toward a hovered card, sleeps at night, the Feed character talks while anything plays. */
export function FeedRail({ active }: { active: MenuId }) {
  const navigate = useNavigate()
  const [night] = useNight()
  const react = useFeed((s) => s.settings.react)
  const hover = useFeed((s) => s.hover)
  const playing = useFeed((s) => !!s.playing)
  const unread = useFeed((s) => s.settings.notify && unreadCount(s) > 0)
  const [awake, setAwake] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // Toward the feed column: to the right of the desktop rail, above the mobile bottom bar
  const gaze = hover && react ? (window.innerWidth < 760 ? { x: window.innerWidth / 2, y: -400 } : { x: 520, y: 280 }) : null

  useEffect(() => {
    if (!night || !react) return
    let timer = 0
    const wake = () => {
      setAwake(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setAwake(false), WAKE_MS)
    }
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right)
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom)
      if (Math.hypot(dx, dy) < WAKE_RADIUS) wake()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('scroll', wake, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', wake, true)
    }
  }, [night, react])

  const asleep = night && react && !awake && !hover

  return (
    <div ref={ref} className="feed-rail">
      <MenuRail
        active={active}
        unread={unread}
        onSelect={(id) => navigate(MENU_PATH[id])}
        character={(id) => ({
          mood: react && id === 'feed' && playing ? 'talk' : asleep ? 'sleep' : 'idle',
          lookAt: gaze,
          bounce: react && hover ? 3 : 0,
        })}
      />
    </div>
  )
}
