import { useNavigate } from 'react-router-dom'
import { PanelIcon, PaperChip } from '../../ui'
import { MENU_PATH, type MenuId } from '../menu/menu'
import { MenuRail } from '../menu/MenuRail'
import { unreadCount, useFeed } from '../feed/feedStore'
import { useArrival } from '../transition/arrivalStore'
import { useHome } from './homeStore'

export function HomeRail() {
  const navigate = useNavigate()
  const panelOpen = useHome((s) => s.panelOpen)
  const setPanel = useHome((s) => s.setPanel)
  const arriving = useArrival((s) => s.active)
  const landed = useArrival((s) => s.landed)
  const happy = useArrival((s) => s.happy)
  const unread = useFeed((s) => s.settings.notify && unreadCount(s) > 0)

  const onSelect = (id: MenuId) => {
    const home = useHome.getState()
    if (id === 'globe') {
      home.clearSpot()
      home.globe?.wholeEarth()
    } else if (id === 'places') {
      home.setPanelTab('places')
      home.setPanel(true)
    } else navigate(MENU_PATH[id])
  }

  return (
    <div className="home-rail" data-arrive="left">
      <PaperChip
        as="button"
        type="button"
        className="hud-panel-btn ui-press"
        aria-label={panelOpen ? 'Hide panel' : 'Show panel'}
        title={panelOpen ? 'Hide panel' : 'Show panel'}
        aria-expanded={panelOpen}
        aria-controls="drops-panel"
        onClick={() => setPanel(!panelOpen)}
      >
        <PanelIcon />
      </PaperChip>
      <MenuRail
        active="globe"
        unread={unread}
        onSelect={onSelect}
        character={(id) => ({
          mood: happy.includes(id) ? 'happy' : 'idle',
          style: arriving && !landed.includes(id) ? { visibility: 'hidden' } : undefined,
        })}
      />
    </div>
  )
}
