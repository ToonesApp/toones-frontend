import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { unlocksAtLevel, type Look } from '../../characters/avatar'
import { lookDataUrl } from '../../characters/avatarImage'
import { XP_PER_LEVEL, levelFromXp, progressFromXp } from '../../lib/xp'
import { ChevronIcon, CloseIcon, PaperChip } from '../../ui'
import { usePresence } from '../feed/usePresence'
import { useHome } from '../home/homeStore'
import './profile.css'

const OPEN_MS = 500

/** Level progress, with a tap-through to what the next level unlocks. */
export function LevelCard({ look }: { look: Look }) {
  const xp = useHome((s) => s.xp)
  const [open, setOpen] = useState(false)
  const level = levelFromXp(xp)
  const into = progressFromXp(xp)
  const next = unlocksAtLevel(level + 1)
  const hint = `${XP_PER_LEVEL - into} xp to Lv ${level + 1}`

  return (
    <PaperChip radius="card" className="level">
      <div className="level__top num">
        <span className="level__lv">Level {level}</span>
        <span>
          {into} / {XP_PER_LEVEL} xp
        </span>
      </div>
      <span className="lvl" role="progressbar" aria-label={`Progress to level ${level + 1}`} aria-valuemin={0} aria-valuemax={XP_PER_LEVEL} aria-valuenow={into}>
        <span className="lvl__fill" style={{ width: `${(into / XP_PER_LEVEL) * 100}%` }} />
      </span>
      {next.length ? (
        <button type="button" className="level__more ui-press" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          <span className="num">
            {hint} · {next.length} new {next.length === 1 ? 'item' : 'items'} to unlock
          </span>
          <ChevronIcon dir="right" />
        </button>
      ) : (
        <span className="lvl__hint num">{hint}</span>
      )}
      <UnlocksSheet open={open} level={level + 1} hint={hint} look={look} onClose={() => setOpen(false)} />
    </PaperChip>
  )
}

type SheetProps = { open: boolean; level: number; hint: string; look: Look; onClose: () => void }

function UnlocksSheet(props: SheetProps) {
  const { mounted, open } = usePresence(props.open, OPEN_MS)
  return mounted ? createPortal(<SheetBody {...props} open={open} />, document.body) : null
}

function SheetBody({ open, level, hint, look, onClose }: SheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const items = unlocksAtLevel(level)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className={open ? 'sheet-scrim is-open' : 'sheet-scrim'} onClick={onClose} />
      <section className={open ? 'sheet ul is-open' : 'sheet ul'} role="dialog" aria-modal="true" aria-labelledby="ul-title">
        <div className="sheet__head">
          <h2 id="ul-title">Unlocks at Lv {level}</h2>
          <button ref={closeRef} type="button" className="round-btn ui-press" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <p className="ul__note num">{hint}. Keep dropping and listening to Toones to earn xp.</p>
        <div className="ul__grid">
          {items.map((it) => (
            <div key={`${it.part}-${it.id}`} className="pe__tile ul__tile">
              <img src={lookDataUrl({ ...look, [it.part]: it.id } as Look)} width={64} height={64} alt="" draggable={false} />
              <span className="pe__label">{it.label}</span>
              <span className="ul__part">{it.partLabel}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
