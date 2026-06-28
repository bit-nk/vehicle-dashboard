import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

// Custom replacement for the browser's confirm()/prompt(). Light dim backdrop (no heavy
// blur), Esc / backdrop to cancel. Pass `withReason` to collect a short note (e.g. a
// rejection reason) that is handed to onConfirm.
export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  tone = 'danger', withReason = false, reasonLabel = 'Reason', reasonRequired = false,
  onConfirm, onCancel,
}) {
  const [reason, setReason] = useState('')
  useEffect(() => { if (open) setReason('') }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onCancel?.()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])
  if (!open) return null

  const confirmCls = tone === 'danger'
    ? 'bg-rose-600 text-white hover:bg-rose-700'
    : 'bg-brand-600 text-white hover:bg-brand-700'
  const disabled = withReason && reasonRequired && !reason.trim()

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-950/50 p-4" onClick={onCancel}>
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-[var(--surface)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-5">
          {tone === 'danger' && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500"><AlertTriangle className="h-5 w-5" /></span>}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-ink-900">{title}</h2>
              <button onClick={onCancel} aria-label="Close" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100"><X className="h-4 w-4" /></button>
            </div>
            {message && <p className="mt-1 text-sm text-ink-500">{message}</p>}
            {withReason && (
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder={reasonLabel}
                className="mt-3 w-full rounded-lg border border-ink-200 bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-3">
          <button onClick={onCancel} className="btn-sm border border-ink-200 text-ink-600 hover:bg-ink-50">{cancelLabel}</button>
          <button onClick={() => onConfirm?.(reason)} disabled={disabled} className={`btn-sm ${confirmCls} disabled:opacity-50`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
