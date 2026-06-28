// VINSight wordmark. `tone="light"` for dark backgrounds.
export default function Logo({ tone = 'dark', className = '' }) {
  const text = tone === 'light' ? '#ffffff' : '#142657'
  const sub = tone === 'light' ? '#8ec6ff' : '#1c66f1'
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#1c66f1" />
        <path d="M8 9.5h4.2l3.8 9.4 3.8-9.4H24l-6 14h-4l-6-14Z" fill="#fff" />
        <circle cx="23" cy="22.5" r="2.4" fill="#8ec6ff" />
      </svg>
      <span className="font-display text-xl font-extrabold tracking-tight" style={{ color: text }}>
        VIN<span style={{ color: sub }}>sight</span>
      </span>
    </span>
  )
}
