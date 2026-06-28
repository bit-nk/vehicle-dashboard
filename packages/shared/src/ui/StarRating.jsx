import { Star } from 'lucide-react'

export default function StarRating({ value = 0, size = 14, className = '' }) {
  const full = Math.floor(value)
  const half = value - full >= 0.5
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const filled = i < full
        const isHalf = i === full && half
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-ink-200" style={{ width: size, height: size }} fill="currentColor" />
            {(filled || isHalf) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: isHalf ? size / 2 : size }}>
                <Star className="text-amber-400" style={{ width: size, height: size }} fill="currentColor" />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}
