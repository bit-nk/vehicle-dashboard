import { useState } from 'react'
import CarImage from './CarImage.jsx'

// Renders a vehicle's REAL (openly-licensed) photo, falling back to the SVG
// illustration if there's no photo or the image fails to load. Keeps the
// required attribution (author + license) as a small credit that links to the
// Wikimedia Commons source page.
export default function VehiclePhoto({
  vehicle: v,
  className = '',
  eager = false,
  showCredit = true,
  rounded = false,
}) {
  const [failed, setFailed] = useState(false)
  const photo = v.photo

  if (!photo?.thumbUrl || failed) {
    return <CarImage color={v.colorHex} bodyStyle={v.bodyStyle} rounded={rounded} className={className} />
  }

  return (
    <div className={`relative h-full w-full overflow-hidden bg-ink-100 ${className}`}>
      <img
        src={photo.thumbUrl}
        alt={`${v.year} ${v.make} ${v.model}`}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
      {showCredit && (
        <a
          href={photo.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          onClick={(e) => e.stopPropagation()}
          title={`Photo: ${photo.author} - ${photo.license} (Wikimedia Commons)`}
          className="absolute bottom-1 right-1 rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-white/90 backdrop-blur-sm hover:bg-black/70"
        >
          © {photo.license}
        </a>
      )}
    </div>
  )
}
