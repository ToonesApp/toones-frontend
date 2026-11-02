import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { sanitizeLook } from '../../characters/avatar'
import { LookAvatar } from '../../characters/LookAvatar'
import { addFriend, getProfile, removeFriend, type ApiProfile } from '../../lib/api'
import { CloseIcon, PaperChip } from '../../ui'
import { useFeed } from '../feed/feedStore'
import { fmtDur, shortAgo } from '../feed/format'
import { usePresence } from '../feed/usePresence'
import './profile.css'

const OPEN_MS = 500

type Props = {
  open: boolean
  username: string
  /** Called after you follow or unfollow from here, so lists behind the sheet can refresh. */
  onChanged?: () => void
  onClose: () => void
}

/** Someone's public profile in a sheet: character, bio, counts, recent Toones, and an Add/Remove button. */
export function PublicProfileSheet(props: Props) {
  const { mounted, open } = usePresence(props.open, OPEN_MS)
  return mounted ? createPortal(<SheetBody {...props} open={open} />, document.body) : null
}

const joined = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

function SheetBody({ open, username, onChanged, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [loaded, setLoaded] = useState<{ username: string; profile: ApiProfile | null } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    closeRef.current?.focus()
    // Capture phase, so Escape closes only this sheet when it sits on top of another one
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  useEffect(() => {
    let stale = false
    getProfile(username).then(
      (profile) => !stale && setLoaded({ username, profile }),
      () => !stale && setLoaded({ username, profile: null }),
    )
    return () => {
      stale = true
    }
  }, [username])

  const ready = loaded?.username === username
  const p = ready ? loaded.profile : null

  const toggle = async () => {
    if (!p || busy) return
    setBusy(true)
    try {
      if (p.youFollow) await removeFriend(p.username)
      else await addFriend(p.username)
      const youFollow = !p.youFollow
      setLoaded({ username, profile: { ...p, youFollow, followers: p.followers + (youFollow ? 1 : -1) } })
      onChanged?.()
      useFeed.getState().flash(youFollow ? `Added @${p.username}` : `Removed @${p.username}`)
    } catch (e) {
      useFeed.getState().flash(e instanceof Error ? e.message : 'Something went wrong')
    }
    setBusy(false)
  }

  return (
    <>
      <div className={open ? 'sheet-scrim is-open' : 'sheet-scrim'} onClick={onClose} />
      <section className={open ? 'sheet pp is-open' : 'sheet pp'} role="dialog" aria-modal="true" aria-label={`@${username}`}>
        <div className="sheet__head">
          <h2>@{username}</h2>
          <button ref={closeRef} type="button" className="round-btn ui-press" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {!ready && <p className="view-note">Loading…</p>}
        {ready && !p && <p className="view-note">Couldn’t load this profile.</p>}
        {p && (
          <>
            <div className="pp__top">
              <LookAvatar look={sanitizeLook(p.look)} size={96} />
              <div className="pp__who">
                <span className="pp__name ell">{p.displayName}</span>
                <span className="pp__sub num">
                  Lv {p.level} · Joined {joined(p.joinedAt)}
                </span>
                {p.followsYou && !p.isMe && <span className="pp__tag">Follows you</span>}
              </div>
            </div>

            {p.bio ? <p className="pp__bio">{p.bio}</p> : p.isMe && <p className="pp__bio is-empty">You haven’t written a bio yet.</p>}

            <PaperChip radius="card" className="pstats">
              <div className="pstats__cell">
                <span className="pstats__n num">{p.posts}</span>
                <span className="pstats__label">{p.posts === 1 ? 'Post' : 'Posts'}</span>
              </div>
              <div className="pstats__cell">
                <span className="pstats__n num">{p.following}</span>
                <span className="pstats__label">Following</span>
              </div>
              <div className="pstats__cell">
                <span className="pstats__n num">{p.followers}</span>
                <span className="pstats__label">{p.followers === 1 ? 'Follower' : 'Followers'}</span>
              </div>
            </PaperChip>

            {!p.isMe && (
              <button type="button" className={p.youFollow ? 'pill-btn pp__btn ui-press' : 'pill-btn pp__btn is-add ui-press'} disabled={busy} onClick={toggle}>
                {p.youFollow ? 'Remove' : p.followsYou ? 'Follow back' : 'Add friend'}
              </button>
            )}

            <div className="kicker">Recent Toones</div>
            {!p.sounds.length && <p className="view-note">No Toones yet.</p>}
            {p.sounds.map((s) => (
              <PaperChip key={s.id} radius="well" className="pp__toone">
                <span className="pp__toone-body">
                  <span className="pp__toone-title ell">{s.title}</span>
                  <span className="pp__toone-sub ell num">
                    {s.category} · {s.placeName || 'Somewhere'} · {fmtDur(s.durationSec)}
                  </span>
                </span>
                <span className="pp__toone-meta num">
                  {s.playCount} {s.playCount === 1 ? 'play' : 'plays'}
                  <span>{shortAgo(Date.parse(s.createdAt))}</span>
                </span>
              </PaperChip>
            ))}
          </>
        )}
      </section>
    </>
  )
}
