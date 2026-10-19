import { PaperChip } from '../../../components/ui'
import { useHome } from '../homeStore'
import { AccountMenu } from './AccountMenu'
import { Search } from './Search'

export function Header() {
  const globe = useHome((s) => s.globe)

  return (
    <header className="hud-top" data-arrive>
      <div className="hud-top__left">
        <PaperChip as="button" type="button" className="hud-wordmark ui-press" aria-label="TOONES, show the whole Earth" onClick={() => globe?.wholeEarth()}>
          TOONES
        </PaperChip>
      </div>
      <Search />
      <AccountMenu />
    </header>
  )
}
