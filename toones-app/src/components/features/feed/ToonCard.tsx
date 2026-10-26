import { ClayCharacter } from '../../characters/ClayCharacter'
import { LookAvatar } from '../../characters/LookAvatar'
import { useLooks } from '../../characters/lookStore'
import { useHome } from '../home/homeStore'
import { CommentIcon, HeartIcon, PauseIcon, PlayIcon, ShareIcon } from '../../ui'
import { toggleFeed } from './feedPlayer'
import { shareToone, useFeed, type Toone } from './feedStore'
import { fmtDur, initialOf, shortAgo } from './format'
import { burstNotes } from './notes'
import { Photos } from './Photos'
import { Waveform } from './Waveform'

export function LikeButton({ toone, className }: { toone: Toone; className?: string }) {
  const liked = useFeed((s) => s.liked.includes(toone.id))
  const toggleLike = useFeed((s) => s.toggleLike)
  return (
    <button
      type="button"
      className={['card-act ui-press', liked && 'is-liked', className].filter(Boolean).join(' ')}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      onClick={(e) => {
        if (!liked) burstNotes(e.clientX, e.clientY)
        toggleLike(toone.id)
      }}
    >
      <HeartIcon filled={liked} />
      <span className="num">{liked ? 1 : 0}</span>
    </button>
  )
}

export function ToonCard({ toone }: { toone: Toone }) {
  const playing = useFeed((s) => s.playing?.id === toone.id)
  const elapsed = useFeed((s) => (s.playing?.id === toone.id ? s.playing.elapsed : 0))
  const email = useHome((s) => s.user.email)
  const comments = useFeed((s) => s.comments[toone.id]?.length ?? 0)
  const openDetail = useFeed((s) => s.openDetail)
  const setHover = useFeed((s) => s.setHover)
  const open = () => openDetail(toone.id)
  const mine = useLooks((s) => s.looks[email.toLowerCase()])
  const look = toone.look ?? (toone.mine ? mine : null)

  return (
    <article className={playing ? 'card is-playing' : 'card'} onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <header className="card__head">
        {look ? (
          <LookAvatar look={look} size={52} />
        ) : (
          <span className="avatar avatar--52" aria-hidden="true">
            {initialOf(toone.name)}
          </span>
        )}
        <div className="card__who">
          <div className="card__name ell">{toone.name}</div>
          <div className="card__sub ell">
            {toone.handle ? `${toone.handle} · ` : ''}
            {shortAgo(toone.when)}
          </div>
        </div>
        <span className="cat-pill">{toone.cat}</span>
      </header>

      <Photos toone={toone} height={300} onExpand={open} />

      <div className="card__body">
        <button type="button" className="card__title" onClick={open}>
          {toone.title}
        </button>
        {toone.caption && <p className="card__caption">{toone.caption}</p>}
        <div className="card__player">
          <button type="button" className={playing ? 'play-btn is-on ui-press' : 'play-btn ui-press'} aria-label={playing ? `Pause ${toone.title}` : `Play ${toone.title}`} onClick={() => toggleFeed(toone)}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <Waveform id={toone.id} bars={48} height={32} minBar={5} maxBar={27} progress={toone.dur ? elapsed / toone.dur : 0} playing={playing} className="card__wave" />
          <span className="card__time num">
            {fmtDur(elapsed)} / {fmtDur(toone.dur)}
          </span>
        </div>
      </div>

      <footer className="card__foot">
        <LikeButton toone={toone} />
        <button type="button" className="card-act ui-press" aria-label={`Comments, ${comments}`} onClick={open}>
          <CommentIcon />
          <span className="num">{comments}</span>
        </button>
        <button type="button" className="card-act ui-press" onClick={() => shareToone(toone)}>
          <ShareIcon />
          <span>Share</span>
        </button>
      </footer>
    </article>
  )
}

export function SkeletonCard() {
  return (
    <div className="card card--skeleton" aria-hidden="true">
      <div className="card__head">
        <span className="sk sk--avatar" />
        <div className="card__who">
          <span className="sk" style={{ width: '40%', height: 14 }} />
          <span className="sk" style={{ width: '26%', height: 11, marginTop: 8 }} />
        </div>
      </div>
      <div className="sk sk--photo">
        <ClayCharacter species="pip" size={96} followCursor={false} />
      </div>
      <div className="card__body">
        <span className="sk" style={{ width: '62%', height: 18 }} />
        <span className="sk" style={{ width: '88%', height: 12 }} />
        <span className="sk" style={{ width: '100%', height: 44, borderRadius: 18 }} />
      </div>
    </div>
  )
}
