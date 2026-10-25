import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BackIcon, PauseIcon, PlayIcon } from '../../ui'
import { displayName, useHome } from '../home/homeStore'
import { seekFeed, toggleFeed } from './feedPlayer'
import { useFeed } from './feedStore'
import { fmtDur, initialOf, shortAgo } from './format'
import { MiniMap } from './MiniMap'
import { Photos } from './Photos'
import { LikeButton } from './ToonCard'
import { usePresence } from './usePresence'
import { Waveform } from './Waveform'

const CLOSE_MS = 450

/** Right-side drawer for one Toone: big player, map, comments. */
export function DetailDrawer() {
  const id = useFeed((s) => s.detail)
  const { mounted, open } = usePresence(!!id, CLOSE_MS)
  // The last Toone stays on screen while the drawer slides out
  const [shown, setShown] = useState(id)
  if (id && id !== shown) setShown(id)

  if (!mounted || !shown) return null
  return <DrawerBody id={shown} open={open} />
}

function DrawerBody({ id, open }: { id: string; open: boolean }) {
  const toone = useFeed((s) => s.toones.find((t) => t.id === id))
  const playing = useFeed((s) => s.playing?.id === id)
  const elapsed = useFeed((s) => (s.playing?.id === id ? s.playing.elapsed : 0))
  const comments = useFeed((s) => s.comments[id]) ?? []
  const hasPhotos = useFeed((s) => !!s.photos[id]?.length)
  const close = useFeed((s) => s.closeDetail)
  const addComment = useFeed((s) => s.addComment)
  const me = useHome((s) => displayName(s.user))
  const [text, setText] = useState('')
  const backRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    backRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!toone) return null
  const post = () => {
    if (!text.trim()) return
    addComment(id, me, text.trim())
    setText('')
  }

  return (
    <>
      <div className={open ? 'drawer-scrim is-open' : 'drawer-scrim'} onClick={close} />
      <aside className={open ? 'drawer is-open' : 'drawer'} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer__top">
          <button ref={backRef} type="button" className="pill-btn ui-press" onClick={close}>
            <BackIcon />
            Back
          </button>
          <span className="cat-pill">{toone.cat}</span>
        </div>

        {(toone.mine || hasPhotos) && <Photos toone={toone} height={260} />}

        <div>
          <h2 id="drawer-title" className="drawer__title">
            {toone.title}
          </h2>
          <div className="drawer__by">
            {toone.name}
            {toone.handle ? ` · ${toone.handle}` : ''} · {shortAgo(toone.when)}
          </div>
        </div>
        {toone.caption && <p className="card__caption">{toone.caption}</p>}

        <div className="drawer__player">
          <button type="button" className={playing ? 'play-btn play-btn--52 is-on ui-press' : 'play-btn play-btn--52 ui-press'} aria-label={playing ? 'Pause' : 'Play'} onClick={() => toggleFeed(toone)}>
            {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          </button>
          <Waveform
            id={toone.id}
            bars={56}
            height={56}
            minBar={6}
            maxBar={52}
            progress={toone.dur ? elapsed / toone.dur : 0}
            playing={playing}
            onSeek={(f) => seekFeed(toone, f)}
            className="drawer__wave"
          />
        </div>
        <div className="drawer__meta num">
          <span>
            {fmtDur(elapsed)} / {fmtDur(toone.dur)}
          </span>
          <span>
            {toone.listens} {toone.listens === 1 ? 'listen' : 'listens'}
          </span>
        </div>

        <div className="maptile">
          <MiniMap lon={toone.lon} lat={toone.lat} />
          <span className="pin" aria-hidden="true" />
          <span className="photos__place maptile__place ell">{toone.place}</span>
          <Link className="maptile__go ui-press" to={`/home?at=${toone.lon.toFixed(4)},${toone.lat.toFixed(4)}`}>
            Show on globe
          </Link>
        </div>

        <div className="drawer__comments-head">
          <span>Comments · {comments.length}</span>
          <LikeButton toone={toone} />
        </div>
        {comments.map((c) => (
          <div key={c.id} className="comment">
            <span className="avatar avatar--34" aria-hidden="true">
              {initialOf(c.name)}
            </span>
            <div className="comment__bubble">
              <b>{c.name}</b> {c.text}
            </div>
          </div>
        ))}
        <form
          className="drawer__post"
          onSubmit={(e) => {
            e.preventDefault()
            post()
          }}
        >
          <input className="pill-input" type="text" placeholder="Add a comment" aria-label="Add a comment" maxLength={280} value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="ui-btn ui-btn--ink ui-press drawer__post-btn" disabled={!text.trim()}>
            Post
          </button>
        </form>
      </aside>
    </>
  )
}
