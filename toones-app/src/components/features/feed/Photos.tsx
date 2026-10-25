import { useRef } from 'react'
import { useNight } from '../../lib/storage'
import { ChevronIcon, ExpandIcon, PhotoIcon, PinIcon } from '../../ui'
import { useFeed, type Toone } from './feedStore'
import { TINT } from './format'

const MAX_PHOTOS = 3

/** Photo carousel. Only the uploader gets an upload slot; everyone else sees the photos read-only. */
export function Photos({ toone, height, onExpand }: { toone: Toone; height: number; onExpand?: () => void }) {
  const photos = useFeed((s) => s.photos[toone.id]) ?? []
  const index = useFeed((s) => s.slide[toone.id] ?? 0)
  const setSlide = useFeed((s) => s.setSlide)
  const addPhoto = useFeed((s) => s.addPhoto)
  const [night] = useNight()
  const input = useRef<HTMLInputElement>(null)

  const slot = toone.mine && photos.length < MAX_PHOTOS
  const count = photos.length + (slot ? 1 : 0) || 1
  const at = Math.min(index, count - 1)
  const go = (i: number) => setSlide(toone.id, Math.max(0, Math.min(count - 1, i)))

  return (
    <div className="photos" style={{ height }}>
      <div className="photos__track" style={{ transform: `translateX(${-at * 100}%)` }}>
        {photos.map((src, i) => (
          <img key={src} className="photos__slide" src={src} alt={`Photo ${i + 1} of ${toone.place}`} />
        ))}
        {slot && (
          <button type="button" className="photos__slide photos__add" onClick={() => input.current?.click()}>
            <PhotoIcon />
            <span>{photos.length ? 'Add another photo' : 'Add a photo of this place'}</span>
          </button>
        )}
        {!photos.length && !slot && (
          <div className="photos__slide photos__none" style={{ backgroundColor: TINT[toone.cat][night ? 1 : 0] }} aria-hidden="true">
            <span className="pin" />
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) addPhoto(toone.id, f)
          e.target.value = ''
        }}
      />

      <span className="photos__place ell">
        <PinIcon className="photos__place-icon" />
        <span className="ell">{toone.place}</span>
      </span>
      {onExpand && (
        <button type="button" className="photos__round photos__expand ui-press" aria-label={`Open ${toone.title}`} onClick={onExpand}>
          <ExpandIcon />
        </button>
      )}
      {count > 1 && (
        <>
          <button type="button" className="photos__round photos__prev ui-press" aria-label="Previous photo" disabled={at === 0} onClick={() => go(at - 1)}>
            <ChevronIcon dir="left" />
          </button>
          <button type="button" className="photos__round photos__next ui-press" aria-label="Next photo" disabled={at === count - 1} onClick={() => go(at + 1)}>
            <ChevronIcon />
          </button>
          <div className="photos__dots" aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
              <span key={i} className={i === at ? 'is-on' : undefined} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
