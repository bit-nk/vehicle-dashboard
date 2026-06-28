import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

// Smooth right-side slide-over. Animates in/out (no abrupt pop), closes on Esc,
// locks body scroll, and exposes title + optional footer. Reused for inventory,
// service jobs and metric detail panels so the flow feels consistent.
export default function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl', accentHeader }) {
  const [render, setRender] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) {
      setRender(true)
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    const t = setTimeout(() => setRender(false), 250) // wait for slide-out
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!render) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end sm:py-4 sm:pr-4">
      <div
        className={`absolute inset-0 bg-ink-950/50 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        className={`relative flex h-full w-full ${width} flex-col overflow-hidden rounded-l-3xl bg-[var(--surface)] shadow-2xl transition-transform duration-300 ease-out sm:rounded-2xl ${shown ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className={`flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 ${accentHeader ? 'bg-brand-50' : ''}`}>
          <div className="min-w-0">
            {title && <h2 className="font-display text-lg font-bold text-ink-900">{title}</h2>}
            {subtitle && <p className="truncate text-xs text-ink-400">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-ink-100 p-4">{footer}</div>}
      </div>
    </div>
  )
}
