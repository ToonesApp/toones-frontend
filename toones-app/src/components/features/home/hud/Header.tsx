import { useNavigate } from 'react-router-dom'
import { PaperChip, SegmentedTabs } from '../../../ui'
import { useHome } from '../homeStore'
import { AccountMenu } from './AccountMenu'
import { Search } from './Search'

const VIEWS = [
  { value: 'globe', label: 'Globe' },
  { value: 'feed', label: 'Feed' },
] as const

export function Header() {
  const globe = useHome((s) => s.globe)
  const navigate = useNavigate()

  return (
    <header className="hud-top">
      <div className="hud-top__left">
        <PaperChip as="button" type="button" className="hud-wordmark ui-press" aria-label="TOONES, show the whole Earth" onClick={() => globe?.wholeEarth()}>
          TOONES
        </PaperChip>
        <div className="hud-switch-wrap" data-arrive="top">
          <SegmentedTabs aria-label="Globe or feed" options={VIEWS} value="globe" onChange={(v) => v === 'feed' && navigate('/feed')} />
        </div>
      </div>
      <Search />
      <AccountMenu />
    </header>
  )
}
