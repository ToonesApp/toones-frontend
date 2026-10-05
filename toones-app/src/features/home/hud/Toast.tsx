import { PaperChip } from '../../../components/ui'
import { useHome } from '../homeStore'

export function Toast() {
  const toast = useHome((s) => s.toast)
  return (
    <div className="hud-toast-wrap" role="status" aria-live="polite">
      {toast && (
        <PaperChip key={toast.id} className="hud-toast num">
          {toast.text}
        </PaperChip>
      )}
    </div>
  )
}
