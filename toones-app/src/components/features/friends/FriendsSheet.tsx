import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../ui'
import { usePresence } from '../feed/usePresence'
import { FriendsPanel, type FriendsTab } from './FriendsPanel'
import './friends.css'

const OPEN_MS = 500

type Props = { open: boolean; tab: FriendsTab; onClose: () => void }

/** Bottom sheet over the current page with your following and followers, so closing it lands you back where you were. */
export function FriendsSheet({ open: want, tab, onClose }: Props) {
  const { mounted, open } = usePresence(want, OPEN_MS)
  return mounted ? createPortal(<SheetBody open={open} tab={tab} onClose={onClose} />, document.body) : null
}

function SheetBody({ open, tab, onClose }: { open: boolean; tab: FriendsTab; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className={open ? 'sheet-scrim is-open' : 'sheet-scrim'} onClick={onClose} />
      <section className={open ? 'sheet fs is-open' : 'sheet fs'} role="dialog" aria-modal="true" aria-labelledby="fs-title">
        <div className="sheet__head">
          <h2 id="fs-title">Friends</h2>
          <button ref={closeRef} type="button" className="round-btn ui-press" aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <FriendsPanel initialTab={tab} />
      </section>
    </>
  )
}
