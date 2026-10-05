import { useNavigate } from 'react-router-dom'
import { PaperChip } from '../../../components/ui'
import { XP_PER_DROP, XP_PER_LEVEL, XP_PER_LISTEN, levelFromXp, progressFromXp } from '../../../lib/xp'
import { badges } from '../format'
import { displayName, useHome } from '../homeStore'
import { stopPlayback } from '../player'
import { usePopover } from '../usePopover'

export function AccountMenu() {
  const user = useHome((s) => s.user)
  const xp = useHome((s) => s.xp)
  const drops = useHome((s) => s.drops)
  const listens = useHome((s) => s.listens)
  const signOut = useHome((s) => s.signOut)
  const navigate = useNavigate()
  const { open, setOpen, ref } = usePopover<HTMLDivElement>()

  const name = displayName(user)
  const initial = name.charAt(0).toUpperCase()
  const level = levelFromXp(xp)
  const into = progressFromXp(xp)

  const onSignOut = () => {
    stopPlayback()
    signOut()
    navigate('/auth')
  }

  return (
    <div ref={ref} className="hud-account">
      <PaperChip as="button" type="button" className="hud-xp num ui-press" onClick={() => setOpen(!open)} aria-label={`Level ${level}, ${xp} xp`}>
        <span className="hud-xp__lv">Lv {level}</span>
        <span className="hud-xp__xp">{xp} xp</span>
      </PaperChip>
      <button type="button" className="hud-avatar ui-press" aria-label="Account" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        {initial}
      </button>
      {open && (
        <PaperChip radius="card" className="hud-menu" role="dialog" aria-label="Account">
          <div className="hud-menu__who">
            <div className="hud-menu__av">{initial}</div>
            <div className="hud-menu__names">
              <div className="ell hud-menu__name">{name}</div>
              {user.email && <div className="ell hud-menu__email">{user.email}</div>}
            </div>
          </div>
          <div className="hud-menu__level">
            <div className="hud-menu__line num">
              <span>Lv {level}</span>
              <span>
                {XP_PER_LEVEL - into} xp to Lv {level + 1}
              </span>
            </div>
            <div className="hud-bar" role="progressbar" aria-label="Progress to next level" aria-valuemin={0} aria-valuemax={XP_PER_LEVEL} aria-valuenow={into}>
              <div className="hud-bar__fill" style={{ width: `${(into / XP_PER_LEVEL) * 100}%` }} />
            </div>
            <div className="hud-menu__small">
              {XP_PER_DROP} xp per drop · {XP_PER_LISTEN} xp per first listen
            </div>
          </div>
          <div className="hud-menu__badges">
            <div className="kicker">Badges</div>
            {badges(drops, listens).map((b) => (
              <div key={b.name} className={b.unlocked ? 'hud-badge' : 'hud-badge is-locked'}>
                <div>
                  <div className="hud-badge__name">{b.name}</div>
                  <div className="hud-menu__small">{b.hint}</div>
                </div>
                <span className="hud-badge__state">{b.unlocked ? 'Unlocked' : 'Locked'}</span>
              </div>
            ))}
          </div>
          <div className="hud-menu__rule" />
          <button type="button" className="hud-menuitem" onClick={onSignOut}>
            Sign out
          </button>
        </PaperChip>
      )}
    </div>
  )
}
