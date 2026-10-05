import { useNight } from '../../lib/storage'
import { PaperChip } from './PaperChip'
import './ui.css'

export function NightToggle({ className, hideLabel }: { className?: string; hideLabel?: boolean }) {
  const [night, toggle] = useNight()
  return (
    <PaperChip
      as="button"
      type="button"
      className={['ui-night', 'ui-press', className].filter(Boolean).join(' ')}
      aria-pressed={night}
      aria-label={night ? 'Switch to day' : 'Switch to night'}
      onClick={toggle}
    >
      <span className="ui-night__icon" aria-hidden="true" />
      {!hideLabel && <span>{night ? 'Day' : 'Night'}</span>}
    </PaperChip>
  )
}
