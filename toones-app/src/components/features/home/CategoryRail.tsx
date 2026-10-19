import { ClayCharacter } from '../../characters/ClayCharacter'
import { CATEGORIES, CATEGORY_SPECIES } from '../../characters/clay'
import { PaperChip } from '../../ui'
import { useArrival } from '../transition/arrivalStore'
import { useHome } from './homeStore'

export function CategoryRail() {
  const visible = useHome((s) => s.visible)
  const toggle = useHome((s) => s.toggleCategory)
  const panelOpen = useHome((s) => s.panelOpen)
  const setPanel = useHome((s) => s.setPanel)
  const arriving = useArrival((s) => s.active)
  const landed = useArrival((s) => s.landed)
  const happy = useArrival((s) => s.happy)

  return (
    <div className="home-rail" data-arrive-rail>
      <PaperChip
        as="button"
        type="button"
        className="hud-panel-btn ui-press"
        aria-label={panelOpen ? 'Hide panel' : 'Show panel'}
        title={panelOpen ? 'Hide panel' : 'Show panel'}
        aria-expanded={panelOpen}
        aria-controls="drops-panel"
        onClick={() => setPanel(!panelOpen)}
        data-arrive
      >
        <PanelIcon />
      </PaperChip>
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
