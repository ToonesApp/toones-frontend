import type { ComponentProps } from 'react'
import { ClayCharacter } from '../../characters/ClayCharacter'
import { SPECIES, type Category } from '../../characters/clay'
import { PaperChip } from '../../ui'
import { MENU, type MenuId } from './menu'
import './menu.css'

type CharacterProps = Omit<ComponentProps<typeof ClayCharacter>, 'species'>

type MenuRailProps = {
  active: MenuId | null
  onSelect: (id: MenuId) => void
  unread?: boolean
  /** Per-item character overrides (mood, gaze, hiding during the arrival). */
  character?: (id: MenuId) => CharacterProps
  className?: string
}

export function MenuRail({ active, onSelect, unread = false, character, className }: MenuRailProps) {
  return (
    <PaperChip as="nav" radius="rail" className={['menu-rail', className].filter(Boolean).join(' ')} aria-label="Menu">
      {MENU.map((m) => (
        <button
          key={m.id}
          type="button"
          className="menu-rail__cell ui-press"
          aria-current={active === m.id ? 'page' : undefined}
          aria-label={m.id === 'inbox' && unread ? 'Inbox, unread messages' : m.label}
          title={m.label}
          data-cat={SPECIES[m.species].category as Category}
          onClick={() => onSelect(m.id)}
        >
          <ClayCharacter species={m.species} size={48} fill={0.86} {...character?.(m.id)} />
          <span className="menu-rail__label">{m.label}</span>
          {m.id === 'inbox' && unread && <span className="menu-rail__dot" aria-hidden="true" />}
        </button>
      ))}
    </PaperChip>
  )
}
