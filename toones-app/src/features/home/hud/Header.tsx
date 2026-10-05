import { PanelIcon, PaperChip } from '../../../components/ui'
import { useHome } from '../homeStore'
import { AccountMenu } from './AccountMenu'
import { Search } from './Search'

export function Header() {
  const panelOpen = useHome((s) => s.panelOpen)
  const setPanel = useHome((s) => s.setPanel)
  const globe = useHome((s) => s.globe)

  return (
    <header className="hud-top" data-arrive>
      <div className="hud-top__left">
        <PaperChip as="button" type="button" className="hud-wordmark ui-press" aria-label="TOONES, show the whole Earth" onClick={() => globe?.wholeEarth()}>
          TOONES
        </PaperChip>
        <PaperChip as="button" type="button" className="hud-panel-btn ui-press" aria-expanded={panelOpen} aria-controls="drops-panel" onClick={() => setPanel(!panelOpen)}>
          <PanelIcon />
          <span>{panelOpen ? 'Hide panel' : 'Show panel'}</span>
        </PaperChip>
      </div>
      <Search />
      <AccountMenu />
    </header>
  )
}
