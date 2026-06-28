import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, ArrowLeft } from 'lucide-react'
import { useAdmin } from '../../store/AdminStore.jsx'
import OnboardingForm from '../../components/OnboardingForm.jsx'

const STATUS_TONE = { active: 'bg-emerald-50 text-emerald-700', inactive: 'bg-ink-100 text-ink-500', pending: 'bg-amber-50 text-amber-700' }

export default function AdminDealerships() {
  const admin = useAdmin()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)
  const dealers = Object.values(admin.onboarding)

  if (adding) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <button onClick={() => setAdding(false)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> Dealerships</button>
        <div className="card p-5">
          <h1 className="mb-4 font-display text-xl font-extrabold text-ink-900">Onboard a new dealership</h1>
          <OnboardingForm submitLabel="Onboard dealership" onSubmit={(values) => { const id = admin.onboardDealership(values); navigate(`/admin/dealerships/${id}`) }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Dealerships</h1>
          <p className="text-sm text-ink-500">{dealers.length} onboarded</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn bg-brand-600 text-white hover:bg-brand-700"><Plus className="h-4 w-4" /> Onboard new</button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dealers.map((d) => (
          <Link key={d.dealershipId} to={`/admin/dealerships/${d.dealershipId}`} className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            {d.logoDataUrl
              ? <img src={d.logoDataUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
              : <span className="grid h-11 w-11 place-items-center rounded-xl text-sm font-extrabold text-white" style={{ background: d.accent?.[600] || '#0d9488' }}>{d.mark}</span>}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-900">{d.name}</p>
              <p className="truncate text-xs text-ink-400">{d.city || d.address || d.dealershipId}</p>
            </div>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[d.status || 'active']}`}>{d.status || 'active'}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
