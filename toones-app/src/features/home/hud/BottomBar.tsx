import { useEffect, useState } from 'react'
import { CATEGORY_SPECIES, faceDataUrl } from '../../../components/characters/clay'
import { ClayButton, IconButton, PauseIcon, PaperChip } from '../../../components/ui'
import { coordText, localTime } from '../../../lib/geo'
import { fmtDur } from '../format'
import { spotLabel, useHome } from '../homeStore'
import { stopPlayback } from '../player'

function Player() {
  const playing = useHome((s) => s.playing)
  const drop = useHome((s) => (s.playing ? s.drops.find((d) => d.id === s.playing?.id) : undefined))
  if (!playing || !drop) return null
  const elapsed = Math.min(playing.elapsed, drop.dur)
  return (
    <PaperChip className="hud-player">
      <img src={faceDataUrl(CATEGORY_SPECIES[drop.cat])} alt="" width={36} height={36} />
      <div className="hud-player__body">
        <div className="hud-player__line">
          <span className="ell hud-player__title">{drop.title}</span>
          <span className="num hud-muted">
            {fmtDur(elapsed)} / {fmtDur(drop.dur)}
          </span>
        </div>
        <div className="hud-bar">
          <div className="hud-bar__fill hud-bar__fill--live" style={{ width: `${(elapsed / Math.max(1, drop.dur)) * 100}%` }} />
        </div>
      </div>
      <IconButton aria-label="Pause" onClick={stopPlayback}>
        <PauseIcon />
      </IconButton>
    </PaperChip>
  )
}

/** Re-renders once a minute so local times stay current. */
function useMinute() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function Hint() {
  const looking = useHome((s) => s.looking)
  const hasDrops = useHome((s) => s.drops.length > 0)
  const now = useMinute()
  return (
    <PaperChip className="hud-hint num" role="status">
      <span className="ell hud-hint__main">{looking ? `${looking.label} · ${localTime(looking.lon, now)} local` : 'Loading Earth'}</span>
      {looking && <span className="ell hud-muted">{hasDrops ? 'Click a spot or a face' : 'Click anywhere to choose a spot'}</span>}
    </PaperChip>
  )
}

function SpotCard() {
  const spot = useHome((s) => s.spot)
  const clearSpot = useHome((s) => s.clearSpot)
  const openRecord = useHome((s) => s.openRecord)
  const now = useMinute()
  if (!spot) return null
  return (
    <PaperChip radius="card" className="hud-spot">
      <div className="hud-spot__text">
        <div className="kicker">Chosen spot</div>
        <div className="ell hud-spot__name">{spotLabel(spot)}</div>
        <div className="num hud-muted hud-spot__coord">
          {coordText(spot.lon, spot.lat)} <span className="nowrap">· {localTime(spot.lon, now)} local</span>
        </div>
      </div>
      <button type="button" className="ui-quiet" onClick={clearSpot}>
        Clear
      </button>
      <ClayButton onClick={openRecord}>Drop here</ClayButton>
    </PaperChip>
  )
}

export function BottomBar() {
  const hasSpot = useHome((s) => s.spot !== null)
  return (
    <div className="hud-bottom" data-arrive>
      <Player />
      {hasSpot ? <SpotCard /> : <Hint />}
    </div>
  )
}
