import { ClayCharacter } from '../../characters/ClayCharacter'
import { CATEGORY_SPECIES } from '../../characters/clay'
import { NextIcon, PauseIcon, PrevIcon } from '../../ui'
import { seekFeed, stepFeed, stopFeed } from './feedPlayer'
import { useFeed } from './feedStore'
import { fmtDur } from './format'

/** Pill at the bottom while a Toone plays. */
export function NowPlaying() {
  const playing = useFeed((s) => s.playing)
  const toone = useFeed((s) => s.toones.find((t) => t.id === s.playing?.id))
  if (!playing || !toone) return null
  const f = toone.dur ? Math.min(1, playing.elapsed / toone.dur) : 0

  return (
    <div className="nowbar ui-chip ui-r-pill" role="region" aria-label="Now playing">
      <span className="nowbar__char">
        <ClayCharacter species={CATEGORY_SPECIES[toone.cat]} size={44} mood="talk" fill={0.78} />
      </span>
      <div className="nowbar__info">
        <div className="nowbar__title ell">{toone.title}</div>
        <div
          className="nowbar__scrub"
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(toone.dur)}
          aria-valuenow={Math.round(playing.elapsed)}
          onPointerDown={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            seekFeed(toone, (e.clientX - r.left) / r.width)
          }}
          onKeyDown={(e) => {
            const step = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0
            if (step) seekFeed(toone, (playing.elapsed + step) / toone.dur)
          }}
        >
          <span style={{ width: `${f * 100}%` }} />
        </div>
        <div className="nowbar__time num">
          {fmtDur(playing.elapsed)} / {fmtDur(toone.dur)}
        </div>
      </div>
      <button type="button" className="round-btn ui-press" aria-label="Previous Toone" onClick={() => stepFeed(-1)}>
        <PrevIcon />
      </button>
      <button type="button" className="round-btn ui-press" aria-label="Next Toone" onClick={() => stepFeed(1)}>
        <NextIcon />
      </button>
      <button type="button" className="nowbar__pause ui-press" aria-label="Pause" onClick={stopFeed}>
        <PauseIcon />
      </button>
    </div>
  )
}
