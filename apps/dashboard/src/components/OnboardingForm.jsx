import { useRef, useState } from 'react'
import { Upload, Building2, Package } from 'lucide-react'
import { sanitizeText, isValidEmail, isValidPhone } from '@shared/lib'
import { accentScale, readPackages } from '../data/dealer.js'

// Quick-pick accent swatches (the picker below sets any custom color). 5-key shape accentVars() expects.
export const ACCENT_PRESETS = {
  Teal: { 50: '#f0fdfa', 100: '#ccfbf1', 500: '#14b8a6', 600: '#0d9488', 700: '#0f766e' },
  Indigo: { 50: '#eef2ff', 100: '#e0e7ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
  Orange: { 50: '#fff7ed', 100: '#ffedd5', 500: '#f97316', 600: '#ea580c', 700: '#c2410c' },
  Rose: { 50: '#fff1f2', 100: '#ffe4e6', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c' },
  Blue: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
}
const PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim']
const field = 'h-10 w-full rounded-lg border border-ink-200 px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200'

// Reusable onboarding form (create + edit). Logo is downscaled client-side to a dataURL.
export default function OnboardingForm({ initial = {}, submitLabel = 'Onboard dealership', onSubmit }) {
  const [f, setF] = useState({
    name: initial.name || '', mark: initial.mark || '', address: initial.address || '', city: initial.city || '',
    province: initial.province || 'Bagmati', phone: initial.phone || '', email: initial.email || '', pan: initial.pan || '',
    contactName: initial.primaryContact?.name || '', contactPhone: initial.primaryContact?.phone || '', contactRole: initial.primaryContact?.role || 'Owner',
    accent: initial.accent || ACCENT_PRESETS.Teal, packageKey: initial.package || '', logoDataUrl: initial.logoDataUrl || null,
  })
  const [err, setErr] = useState('')
  const fileRef = useRef(null)
  const upd = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const packages = readPackages()
  const selectedPkg = packages.find((p) => p.id === f.packageKey)

  function onLogo(file) {
    if (!file) return
    const rd = new FileReader()
    rd.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 256, scale = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.max(1, Math.round(img.width * scale)); c.height = Math.max(1, Math.round(img.height * scale))
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        setF((p) => ({ ...p, logoDataUrl: c.toDataURL('image/png') }))
      }
      img.src = rd.result
    }
    rd.readAsDataURL(file)
  }

  function submit(e) {
    e.preventDefault()
    const name = sanitizeText(f.name, 80)
    if (!name) return setErr('Dealership name is required.')
    if (f.email && !isValidEmail(f.email)) return setErr('Enter a valid email.')
    if (f.phone && !isValidPhone(f.phone)) return setErr('Enter a valid phone number.')
    onSubmit({
      name, mark: f.mark.toUpperCase().slice(0, 2) || undefined,
      address: sanitizeText(f.address, 120), city: sanitizeText(f.city, 40), province: f.province,
      phone: f.phone, email: f.email, pan: sanitizeText(f.pan, 20),
      accent: f.accent, package: f.packageKey || null, logoDataUrl: f.logoDataUrl,
      primaryContact: { name: sanitizeText(f.contactName, 60), phone: f.contactPhone, role: sanitizeText(f.contactRole, 30) },
    })
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* logo + live brand preview */}
      <div className="flex items-center gap-4 rounded-xl border border-ink-100 bg-[var(--surface)] p-4">
        {f.logoDataUrl
          ? <img src={f.logoDataUrl} alt="logo" className="h-16 w-16 rounded-xl object-cover" style={{ outline: `2px solid ${f.accent[600]}` }} />
          : <span className="grid h-16 w-16 place-items-center rounded-xl text-lg font-extrabold text-white" style={{ background: f.accent[600] }}>{(f.mark || f.name.slice(0, 2) || 'DL').toUpperCase().slice(0, 2)}</span>}
        <div>
          <p className="font-display font-bold text-ink-900">{f.name || 'New dealership'}</p>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onLogo(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} className="btn mt-1 border border-ink-200 text-ink-700 hover:bg-ink-50"><Upload className="h-4 w-4" /> Upload logo</button>
          {f.logoDataUrl && <button type="button" onClick={() => setF((p) => ({ ...p, logoDataUrl: null }))} className="btn ml-2 text-ink-400 hover:text-rose-600">Remove</button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block"><span className="text-xs font-semibold text-ink-600">Dealership name *</span><input value={f.name} onChange={upd('name')} className={field} /></label>
        <label className="block"><span className="text-xs font-semibold text-ink-600">Mark (2 letters)</span><input value={f.mark} onChange={upd('mark')} maxLength={2} placeholder="auto" className={`${field} uppercase`} /></label>
        <label className="block sm:col-span-2"><span className="text-xs font-semibold text-ink-600">Address</span><input value={f.address} onChange={upd('address')} className={field} /></label>
        <label className="block"><span className="text-xs font-semibold text-ink-600">City</span><input value={f.city} onChange={upd('city')} className={field} /></label>
        <label className="block"><span className="text-xs font-semibold text-ink-600">Province</span><select value={f.province} onChange={upd('province')} className={`field-select ${field} bg-[var(--surface)]`}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="block"><span className="text-xs font-semibold text-ink-600">Phone</span><input value={f.phone} onChange={upd('phone')} placeholder="+977 ..." className={field} /></label>
        <label className="block"><span className="text-xs font-semibold text-ink-600">Email</span><input value={f.email} onChange={upd('email')} className={field} /></label>
        <label className="block"><span className="text-xs font-semibold text-ink-600">PAN</span><input value={f.pan} onChange={upd('pan')} className={field} /></label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block"><span className="text-xs font-semibold text-ink-600">Primary contact</span><input value={f.contactName} onChange={upd('contactName')} placeholder="Name" className={field} /></label>
        <label className="block"><span className="text-xs font-semibold text-ink-600">Contact phone</span><input value={f.contactPhone} onChange={upd('contactPhone')} className={field} /></label>
        <label className="block"><span className="text-xs font-semibold text-ink-600">Role</span><input value={f.contactRole} onChange={upd('contactRole')} className={field} /></label>
      </div>

      <div>
        <span className="text-xs font-semibold text-ink-600">Brand accent</span>
        <div className="mt-1 flex items-center gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-ink-200 px-2 py-1.5 text-sm font-semibold text-ink-700">
            <input type="color" value={f.accent[600]} onChange={(e) => setF((p) => ({ ...p, accent: accentScale(e.target.value) }))} className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0" title="Pick a brand color" />
            Pick a color
          </label>
          <span className="font-mono text-xs text-ink-400">{f.accent[600]}</span>
        </div>
      </div>

      <div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-600"><Package className="h-3.5 w-3.5" /> Starter package <span className="font-normal text-ink-400">(auto-onboards a set of services &amp; parts; editable later)</span></span>
        <select value={f.packageKey} onChange={upd('packageKey')} className={`field-select mt-1 ${field} bg-[var(--surface)]`}>
          <option value="">None - start with an empty catalog</option>
          {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {selectedPkg && <p className="mt-1 text-xs text-ink-400">{selectedPkg.description}</p>}
      </div>

      {err && <p className="text-xs font-semibold text-rose-600">{err}</p>}
      <button type="submit" className="btn bg-brand-600 text-white hover:bg-brand-700"><Building2 className="h-4 w-4" /> {submitLabel}</button>
    </form>
  )
}
