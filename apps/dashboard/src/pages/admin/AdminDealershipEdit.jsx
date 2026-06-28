import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useAdmin } from '../../store/AdminStore.jsx'
import OnboardingForm from '../../components/OnboardingForm.jsx'

const STATUSES = ['active', 'inactive', 'pending']

export default function AdminDealershipEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const admin = useAdmin()
  const rec = admin.onboarding[id]
  const [saved, setSaved] = useState(false)

  if (!rec) return <div className="py-20 text-center text-ink-400">Dealership not found. <Link to="/admin/dealerships" className="font-semibold text-brand-600">Back</Link></div>

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button onClick={() => navigate('/admin/dealerships')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900"><ArrowLeft className="h-4 w-4" /> Dealerships</button>

      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-display text-xl font-extrabold text-ink-900">{rec.name}</h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-400">Status</span>
            <select value={rec.status || 'active'} onChange={(e) => admin.setOnboardingStatus(id, e.target.value)} className="field-select h-9 rounded-lg border border-ink-200 bg-[var(--surface)] pl-2.5 text-sm outline-none focus:border-brand-500">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {saved && <p className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Saved</p>}
        <OnboardingForm initial={rec} submitLabel="Save changes" onSubmit={(values) => { admin.updateOnboarding(id, values); setSaved(true) }} />
      </div>
    </div>
  )
}
