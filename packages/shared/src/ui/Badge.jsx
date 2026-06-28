// Status pill. Tones map to semantic classes defined in each app's CSS (.badge-*), which
// carry light + dark variants so statuses read well in both themes. A leading dot gives a
// consistent status look; solid tones (e.g. "great") omit it.
const TONES = {
  green: 'badge-green', good: 'badge-green',
  brand: 'badge-brand',
  blue: 'badge-blue',
  indigo: 'badge-indigo',
  amber: 'badge-amber', high: 'badge-amber',
  rose: 'badge-rose', red: 'badge-rose',
  gray: 'badge-gray', fair: 'badge-gray',
  great: 'badge-solid',
}

export default function Badge({ tone = 'gray', children, className = '', icon: Icon }) {
  const cls = TONES[tone] ?? TONES.gray
  const solid = tone === 'great'
  return (
    <span className={`badge ${cls} ${className}`}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : (!solid && <span className="badge-dot" />)}
      {children}
    </span>
  )
}
