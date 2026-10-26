import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { COLORS, FACIAL, GLASSES, HATS, OUTFITS, SPECIES_OPTIONS, randomLook, type Look } from '../../characters/avatar'
import { lookDataUrl } from '../../characters/avatarImage'
import { ClayCharacter } from '../../characters/ClayCharacter'
import { useLooks } from '../../characters/lookStore'
import { ClayButton, CloseIcon } from '../../ui'
import { useFeed } from '../feed/feedStore'
import { usePresence } from '../feed/usePresence'
import './profile.css'

const OPEN_MS = 500

type Tab = 'species' | 'hat' | 'glasses' | 'outfit' | 'facial' | 'color'

const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'species', label: 'Character' },
  { id: 'hat', label: 'Hat' },
  { id: 'glasses', label: 'Glasses' },
  { id: 'outfit', label: 'Outfit' },
  { id: 'facial', label: 'Facial hair' },
  { id: 'color', label: 'Color' },
]

const OPTIONS = { species: SPECIES_OPTIONS, hat: HATS, glasses: GLASSES, outfit: OUTFITS, facial: FACIAL } as const

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

  const { species, ...dress } = look

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
          <span className="pe__well">
            <ClayCharacter species={species} dress={dress} size={[240, 250]} fill={0.62} mood={cheer ? 'happy' : 'idle'} idleWaves />
          </span>
          <button type="button" className="pill-btn ui-press" onClick={() => change(randomLook())}>
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

        <div className="pe__grid" role="radiogroup" aria-label={TABS.find((t) => t.id === tab)?.label}>
          {tab === 'color'
            ? COLORS.map((c, i) => (
                <button key={c.hex} type="button" role="radio" aria-checked={look.color === i} aria-label={c.name} className="pe__tile ui-press" onClick={() => change({ color: i })}>
                  <span className="pe__swatch" style={{ background: c.hex }} />
                  <span className="pe__label">{c.name}</span>
                </button>
              ))
            : OPTIONS[tab].map((o) => {
                const next = { ...look, [tab]: o.id } as Look
                return (
                  <button key={o.id} type="button" role="radio" aria-checked={look[tab] === o.id} className="pe__tile ui-press" onClick={() => change({ [tab]: o.id })}>
                    <img src={lookDataUrl(next)} width={64} height={64} alt="" draggable={false} />
                    <span className="pe__label">{o.label}</span>
                  </button>
                )
              })}
        </div>
        {tab === 'color' && <p className="pe__hint">Color tints your hat and outfit.</p>}

        <div className="pe__foot">
          <ClayButton variant="ghost" onClick={onClose}>
            Cancel
          </ClayButton>
          <ClayButton variant="primary" onClick={save} disabled={!dirty}>
            Save
          </ClayButton>
        </div>
      </section>
    </>
  )
}
