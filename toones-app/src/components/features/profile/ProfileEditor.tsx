import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BACKGROUNDS, COLORS, EYES, FACIAL, GLASSES, HAIR, HAIR_COLORS, HATS, MOUTHS, OUTFITS, SPECIES_OPTIONS, isUnlocked, lockHint, lookUnlocked, randomLook, type Look, type Option } from '../../characters/avatar'
import { lookDataUrl } from '../../characters/avatarImage'
import { ClayCharacter } from '../../characters/ClayCharacter'
import { useLooks } from '../../characters/lookStore'
import { ClayButton, CloseIcon } from '../../ui'
import { useFeed } from '../feed/feedStore'
import { usePresence } from '../feed/usePresence'
import './profile.css'
import { useProgress } from './useProgress'

const OPEN_MS = 500

type Part = 'species' | 'hair' | 'hat' | 'glasses' | 'eyes' | 'mouth' | 'outfit' | 'facial' | 'bg'
type Tab = Part | 'colors'

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'species', label: 'Character' },
  { id: 'hair', label: 'Hair' },
  { id: 'hat', label: 'Hat' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'eyes', label: 'Eyes' },
  { id: 'mouth', label: 'Mouth' },
  { id: 'outfit', label: 'Outfit' },
  { id: 'facial', label: 'Facial hair' },
  { id: 'colors', label: 'Colors' },
  { id: 'bg', label: 'Backdrop' },
]

const OPTIONS: Record<Part, readonly Option<string>[]> = {
  species: SPECIES_OPTIONS,
  hair: HAIR,
  hat: HATS,
  glasses: GLASSES,
  eyes: EYES,
  mouth: MOUTHS,
  outfit: OUTFITS,
  facial: FACIAL,
  bg: BACKGROUNDS,
}

type Props = { open: boolean; email: string; initial: Look; onClose: () => void }

/** Bottom sheet where a user builds their character: one pick per category, like Snapchat's Bitmoji. */
export function ProfileEditor({ open, email, initial, onClose }: Props) {
  const { mounted, open: shown } = usePresence(open, OPEN_MS)
  return mounted ? createPortal(<EditorBody open={shown} email={email} initial={initial} onClose={onClose} />, document.body) : null
}

function EditorBody({ open, email, initial, onClose }: Props) {
  const [look, setLook] = useState<Look>(initial)
  const [tab, setTab] = useState<Tab>('species')
  const [cheer, setCheer] = useState(false)
  const progress = useProgress()
  const closeRef = useRef<HTMLButtonElement>(null)
  const cheerTimer = useRef(0)
  const dirty = JSON.stringify(look) !== JSON.stringify(initial)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(cheerTimer.current)
    }
  }, [onClose])

  const change = useCallback((patch: Partial<Look>) => {
    setLook((l) => ({ ...l, ...patch }))
    setCheer(true)
    window.clearTimeout(cheerTimer.current)
    cheerTimer.current = window.setTimeout(() => setCheer(false), 1100)
  }, [])

  const save = () => {
    useLooks.getState().save(email, look)
    useFeed.getState().flash('Character saved')
    onClose()
  }

  const { species, bg, ...dress } = look
  void bg

  return (
    <>
      <div className={open ? 'sheet-scrim is-open' : 'sheet-scrim'} onClick={onClose} />
      <section className={open ? 'sheet pe is-open' : 'sheet pe'} role="dialog" aria-modal="true" aria-labelledby="pe-title">
        <div className="sheet__head">
          <h2 id="pe-title">Your character</h2>
          <button ref={closeRef} type="button" className="round-btn ui-press" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="pe__stage">
          <span className="pe__well" style={{ background: backgroundCss(look.bg) || undefined }}>
            <ClayCharacter species={species} dress={dress} size={[240, 250]} fill={0.62} mood={cheer ? 'happy' : 'idle'} idleWaves />
          </span>
          <button type="button" className="pill-btn ui-press" onClick={() => change(randomLook(progress))}>
            Surprise me
          </button>
        </div>

        <div className="chips pe__tabs" role="tablist" aria-label="Character parts">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" className="chip ui-press" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'colors' ? (
          <>
            <Swatches title="Hair and facial hair" list={HAIR_COLORS} value={look.hairColor} onPick={(hairColor) => change({ hairColor })} />
            <Swatches title="Hats and outfits" list={COLORS} value={look.color} onPick={(color) => change({ color })} />
          </>
        ) : (
          <div className="pe__grid" role="radiogroup" aria-label={TABS.find((t) => t.id === tab)?.label}>
            {OPTIONS[tab].map((o) => {
              const locked = !isUnlocked(o, progress)
              const next = { ...look, [tab]: o.id } as Look
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={look[tab] === o.id}
                  aria-disabled={locked}
                  title={locked && o.lock ? `Unlock with ${lockHint(o.lock)}` : undefined}
                  className={locked ? 'pe__tile is-locked ui-press' : 'pe__tile ui-press'}
                  onClick={() => {
                    if (locked) useFeed.getState().flash(`Unlock with ${lockHint(o.lock!)}`)
                    else change({ [tab]: o.id })
                  }}
                >
                  <img src={lookDataUrl(next)} width={64} height={64} alt="" draggable={false} />
                  <span className="pe__label">{locked && o.lock ? lockHint(o.lock) : o.label}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="pe__foot">
          <ClayButton variant="ghost" onClick={onClose}>
            Cancel
          </ClayButton>
          <ClayButton variant="primary" onClick={save} disabled={!dirty || !lookUnlocked(look, progress)}>
            Save
          </ClayButton>
        </div>
      </section>
    </>
  )
}

function Swatches({ title, list, value, onPick }: { title: string; list: readonly { name: string; hex: string }[]; value: number; onPick: (i: number) => void }) {
  return (
    <div className="pe__swatches">
      <div className="kicker">{title}</div>
      <div className="pe__row" role="radiogroup" aria-label={title}>
        {list.map((c, i) => (
          <button key={c.hex} type="button" role="radio" aria-checked={value === i} aria-label={c.name} title={c.name} className="pe__dot ui-press" style={{ background: c.hex }} onClick={() => onPick(i)} />
        ))}
      </div>
    </div>
  )
}
