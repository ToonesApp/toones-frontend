import { GlobeIcon, IconButton, LayersIcon, LocateIcon, MinusIcon, PaperChip, PlusIcon } from '../../../components/ui'
import { NEW_YORK } from '../../../lib/geo'
import { useHome, type Layers } from '../homeStore'
import { usePopover } from '../usePopover'

const LAYER_ROWS: [keyof Layers, string][] = [
  ['labels', 'Place names'],
  ['borders', 'Borders'],
  ['sun', 'Live daylight'],
  ['spin', 'Auto-spin'],
]

export function ZoomControls() {
  const globe = useHome((s) => s.globe)
  const layers = useHome((s) => s.layers)
  const setLayer = useHome((s) => s.setLayer)
  const flash = useHome((s) => s.flash)
  const { open, setOpen, ref } = usePopover<HTMLDivElement>()

  const locate = () => {
    if (!globe) return
    const fallback = () => {
      globe.flyTo(NEW_YORK, 6)
      flash('Location is off, so here is New York.')
    }
    if (!navigator.geolocation) return fallback()
    navigator.geolocation.getCurrentPosition((p) => globe.flyTo([p.coords.longitude, p.coords.latitude], 7), fallback, { timeout: 6000, maximumAge: 600_000 })
  }

  return (
    <PaperChip radius="rail" className="hud-zoom" data-arrive>
      <IconButton variant="quiet" aria-label="Zoom in" onClick={() => globe?.zoomBy(1)}>
        <PlusIcon />
      </IconButton>
      <IconButton variant="quiet" aria-label="Zoom out" onClick={() => globe?.zoomBy(-1)}>
        <MinusIcon />
      </IconButton>
      <div className="hud-zoom__rule" />
      <IconButton variant="quiet" aria-label="Go to my location" onClick={locate}>
        <LocateIcon />
      </IconButton>
      <IconButton variant="quiet" aria-label="Zoom out to whole Earth" onClick={() => globe?.wholeEarth()}>
        <GlobeIcon />
      </IconButton>
      <div ref={ref} className="hud-zoom__layers">
        <IconButton variant="quiet" aria-label="Map layers" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
          <LayersIcon />
        </IconButton>
        {open && (
          <PaperChip radius="well" className="hud-layers">
            <div className="kicker hud-layers__kicker">Layers</div>
            {LAYER_ROWS.map(([k, label]) => (
              <button key={k} type="button" role="switch" aria-checked={layers[k]} className="hud-menuitem" onClick={() => setLayer(k, !layers[k])}>
                {label}
                <span className="hud-switch" aria-hidden="true" />
              </button>
            ))}
          </PaperChip>
        )}
      </div>
    </PaperChip>
  )
}
