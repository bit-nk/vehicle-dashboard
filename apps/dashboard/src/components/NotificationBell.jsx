import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, ClipboardCheck, PackageCheck, XCircle } from 'lucide-react'
import { fmtDate } from '../data/dealer.js'
import { useDealer } from '../store/DealerStore.jsx'

const KIND_ICON = { approval_request: ClipboardCheck, approved: PackageCheck, rejected: XCircle }
const KIND_TONE = { approval_request: 'text-amber-500', approved: 'text-emerald-500', rejected: 'text-rose-500' }

// In-app notifications targeted at the signed-in role: Admin sees approval requests,
// Parts/Service see their approved/rejected items. (Demo: real push/email is in TODO.md.)
export default function NotificationBell({ role }) {
  const { notifications, markNotificationsRead } = useDealer()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const mine = (notifications || []).filter((n) => n.to === role)
  const unread = mine.filter((n) => !n.read).length

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && unread) setTimeout(() => markNotificationsRead(role), 1200) // give the user a beat to see what's new
  }
  const go = (n) => { setOpen(false); if (n.link) navigate(n.link) }

  return (
    <div className="relative">
      <button onClick={toggle} className="relative grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-50" title="Notifications" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-ink-100 bg-[var(--surface)] shadow-lg" onMouseLeave={() => setOpen(false)}>
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2.5">
            <p className="text-sm font-bold text-ink-900">Notifications</p>
            {mine.length > 0 && <button onClick={() => markNotificationsRead(role)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"><CheckCheck className="h-3.5 w-3.5" /> Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {mine.length === 0 && <p className="p-6 text-center text-sm text-ink-400">No notifications yet.</p>}
            {mine.map((n) => {
              const Icon = KIND_ICON[n.kind] || Bell
              return (
                <button key={n.id} onClick={() => go(n)} className={`flex w-full items-start gap-2.5 px-4 py-3 text-left transition hover:bg-ink-50 ${n.read ? '' : 'bg-brand-50/40'}`}>
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${KIND_TONE[n.kind] || 'text-ink-400'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink-800">{n.message}</span>
                    <span className="block text-[11px] text-ink-400">{fmtDate(n.createdOn)}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
