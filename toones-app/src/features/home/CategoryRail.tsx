import { ClayCharacter } from '../../components/characters/ClayCharacter'
import { CATEGORIES, CATEGORY_SPECIES } from '../../components/characters/clay'
import { PaperChip } from '../../components/ui'
import { useArrival } from '../transition/arrivalStore'
import { useHome } from './homeStore'

export function CategoryRail() {
  const visible = useHome((s) => s.visible)
  const toggle = useHome((s) => s.toggleCategory)
  const arriving = useArrival((s) => s.active)
  const landed = useArrival((s) => s.landed)
  const happy = useArrival((s) => s.happy)

  return (
    <div className="home-rail" data-arrive-rail>
      <PaperChip radius="rail" className="home-rail__chip" role="toolbar" aria-label="Show categories">
        {CATEGORIES.map((c) => (
          <button key={c} type="button" className="home-rail__cell ui-press" aria-pressed={visible.includes(c)} title={c} data-cat={c} onClick={() => toggle(c)}>
            <ClayCharacter
              species={CATEGORY_SPECIES[c]}
              size={48}
              fill={0.86}
              mood={happy.includes(c) ? 'happy' : 'idle'}
              style={arriving && !landed.includes(c) ? { visibility: 'hidden' } : undefined}
            />
            <span className="sr-only">{c}</span>
          </button>
        ))}
      </PaperChip>
    </div>
  )
}
