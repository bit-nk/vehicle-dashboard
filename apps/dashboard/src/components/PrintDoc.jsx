import { useRef, useState } from 'react'
import { Printer, Mail, X, CheckCircle2 } from 'lucide-react'
import { accentVars } from '../data/dealer.js'
import Letterhead, { LetterheadFooter } from './Letterhead.jsx'

// Full-screen print shell. The "Print / Save PDF" button renders the sheet into a
// dedicated popup window (with the page's styles copied in) and triggers the browser
// print dialog there - reliable across embeds/iframes where window.print() can no-op.
// Falls back to window.print() if the popup is blocked. In the print dialog the user
// picks "Save as PDF". @media print in index.css also isolates `.print-sheet` as a backup.
export default function PrintDoc({ dealershipId, docTitle, docNo, docDate, copyLabel, ownerEmail, onClose, children }) {
  const [sentTo, setSentTo] = useState(null)
  const sheetRef = useRef(null)

  function doPrint() {
    const sheet = sheetRef.current
    if (!sheet) { window.print(); return }
    const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((n) => n.outerHTML).join('\n')
    const accent = accentVars(dealershipId)
    const accentCss = Object.entries(accent).map(([k, v]) => `${k}:${v}`).join(';')
    // escape caller-supplied title/no before it goes into raw HTML (defence-in-depth: these are
    // app-generated today, but never interpolate untrusted strings into document.write unescaped)
    const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
    const title = `${esc(docTitle)}${docNo ? ' ' + esc(docNo) : ''}`
    const win = window.open('', 'print_doc', 'width=900,height=1000')
    if (!win) { window.print(); return } // popup blocked -> in-page print fallback
    win.document.open()
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' 'self' https:; img-src 'self' data: https:; font-src 'self' data: https:">` +
      `<title>${title}</title>${styles}` +
      `<style>@page{size:A4;margin:14mm} html,body{background:#fff;margin:0;padding:0} .print-sheet{box-shadow:none!important;margin:0!important;max-width:none!important;padding:0!important}</style>` +
      `</head><body style="${accentCss}"><div class="print-sheet">${sheet.innerHTML}</div></body></html>`,
    )
    win.document.close()
    win.focus()
    const fire = () => { try { win.print() } catch { /* ignore */ } }
    // give the copied stylesheets a tick to apply
    if (win.document.readyState === 'complete') setTimeout(fire, 250)
    else win.onload = () => setTimeout(fire, 250)
  }

  function emailOwner() {
    setSentTo(ownerEmail)
    // open the user's mail client pre-addressed to the owner (real, no backend)
    const subject = encodeURIComponent(`${docTitle}${docNo ? ' ' + docNo : ''}`)
    const body = encodeURIComponent(`Please find your ${docTitle.toLowerCase()} attached.`)
    try { window.open(`mailto:${ownerEmail}?subject=${subject}&body=${body}`, '_blank') } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-auto bg-ink-200/70 print:static print:bg-white" style={accentVars(dealershipId)}>
      {/* toolbar is always on a white bar -> use fixed slate colors (themed ink would vanish in dark mode) */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
        <p className="truncate text-sm font-semibold text-slate-600">{docTitle}{docNo && <span className="text-slate-400"> · {docNo}</span>}</p>
        <div className="flex items-center gap-2">
          {sentTo && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Sent to {sentTo}</span>}
          {ownerEmail && (
            <button onClick={emailOwner} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100" title="Email a copy to the owner">
              <Mail className="h-4 w-4" /> Email to owner
            </button>
          )}
          <button onClick={doPrint} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
      </div>

      <div ref={sheetRef} className="print-sheet mx-auto my-6 w-full max-w-[820px] bg-white p-8 shadow-lg print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <Letterhead dealershipId={dealershipId} docTitle={docTitle} docNo={docNo} docDate={docDate} copyLabel={copyLabel} />
        <div className="mt-5">{children}</div>
        <LetterheadFooter dealershipId={dealershipId} />
      </div>
    </div>
  )
}
