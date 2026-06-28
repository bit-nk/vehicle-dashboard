import { createContext, useContext, useEffect, useState } from 'react'
import { iso } from '@shared/lib'
import {
  DEALERSHIPS, readPlatformStore, writePlatformStore, readOnboarding,
  DEFAULT_SERVICE_TEMPLATE, DEFAULT_PARTS_TEMPLATE, DEFAULT_PACKAGES, buildCatalogsFromPackage, TODAY,
} from '../data/dealer.js'

// Cross-tenant platform config the admin panel owns: dealership onboarding, the per-
// dealership service + parts catalogs, and change-request decisions. Persisted in
// localStorage so the dealer dashboard (a separate route subtree) reads it via the pure
// helpers in dealer.js without provider coupling. (Demo only - real backend in TODO.md.)
const AdminContext = createContext(null)
const TODAY_ISO = iso(TODAY)
const clone = (x) => JSON.parse(JSON.stringify(x))
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'dealer'

function initState() {
  const s = readPlatformStore()
  const onboarding = { ...(s.onboarding || {}) }
  for (const d of DEALERSHIPS) if (!onboarding[d.id]) onboarding[d.id] = readOnboarding(d.id) // seed the 3 existing
  return { onboarding, serviceCatalog: s.serviceCatalog || {}, partsCatalog: s.partsCatalog || {}, changeRequests: s.changeRequests || [], packages: s.packages || clone(DEFAULT_PACKAGES), users: s.users || {} }
}

export function AdminStoreProvider({ children }) {
  const [state, setState] = useState(initState)
  useEffect(() => { writePlatformStore(state) }, [state])

  const svcOf = (s, did) => (s.serviceCatalog[did] ? clone(s.serviceCatalog[did]) : clone(DEFAULT_SERVICE_TEMPLATE))
  const partsOf = (s, did) => (s.partsCatalog[did] ? clone(s.partsCatalog[did]) : clone(DEFAULT_PARTS_TEMPLATE))
  const withSvc = (did, fn) => setState((s) => { const c = svcOf(s, did); fn(c); return { ...s, serviceCatalog: { ...s.serviceCatalog, [did]: c } } })
  const withParts = (did, fn) => setState((s) => { const c = partsOf(s, did); fn(c); return { ...s, partsCatalog: { ...s.partsCatalog, [did]: c } } })

  const api = {
    ...state,

    /* ---- onboarding ---- */
    onboardDealership: (form) => {
      let id = slugify(form.name)
      setState((s) => {
        let uid = id, n = 1
        while (s.onboarding[uid]) uid = `${id}-${++n}`
        id = uid
        const mark = (form.mark || form.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2)).toUpperCase()
        const rec = { dealershipId: id, status: 'active', onboardedOn: TODAY_ISO, ...form, mark }
        const pkg = form.package ? buildCatalogsFromPackage(s.packages.find((p) => p.id === form.package)) : null  // auto-seed catalogs from the chosen package
        return {
          ...s,
          onboarding: { ...s.onboarding, [id]: rec },
          serviceCatalog: pkg ? { ...s.serviceCatalog, [id]: pkg.service } : s.serviceCatalog,
          partsCatalog: pkg ? { ...s.partsCatalog, [id]: pkg.parts } : s.partsCatalog,
        }
      })
      return id
    },
    updateOnboarding: (did, patch) => setState((s) => ({ ...s, onboarding: { ...s.onboarding, [did]: { ...s.onboarding[did], ...patch } } })),
    setOnboardingStatus: (did, status) => setState((s) => ({ ...s, onboarding: { ...s.onboarding, [did]: { ...s.onboarding[did], status } } })),

    /* ---- service catalog (2-level) ---- */
    addServiceType: (did, type) => type && withSvc(did, (c) => { if (!c.some((t) => t.type === type)) c.push({ type, subtypes: [] }) }),
    removeServiceType: (did, type) => withSvc(did, (c) => { const i = c.findIndex((t) => t.type === type); if (i >= 0) c.splice(i, 1) }),
    addServiceSubtype: (did, type, sub) => sub && withSvc(did, (c) => { const t = c.find((x) => x.type === type); if (t && !t.subtypes.includes(sub)) t.subtypes.push(sub) }),
    removeServiceSubtype: (did, type, sub) => withSvc(did, (c) => { const t = c.find((x) => x.type === type); if (t) t.subtypes = t.subtypes.filter((x) => x !== sub) }),
    loadServiceTemplate: (did) => setState((s) => ({ ...s, serviceCatalog: { ...s.serviceCatalog, [did]: clone(DEFAULT_SERVICE_TEMPLATE) } })),

    /* ---- parts catalog (3-level) ---- */
    addPartCategory: (did, category) => category && withParts(did, (c) => { if (!c.categories.some((x) => x.category === category)) c.categories.push({ category, items: [] }) }),
    removePartCategory: (did, category) => withParts(did, (c) => { c.categories = c.categories.filter((x) => x.category !== category) }),
    addPart: (did, category, item) => item?.name && withParts(did, (c) => { const cat = c.categories.find((x) => x.category === category); if (cat && !cat.items.some((i) => i.name === item.name)) cat.items.push({ name: item.name, subtypes: item.subtypes || [] }) }),
    removePart: (did, category, name) => withParts(did, (c) => { const cat = c.categories.find((x) => x.category === category); if (cat) cat.items = cat.items.filter((i) => i.name !== name) }),
    addPartSubtype: (did, category, name, sub) => sub && withParts(did, (c) => { const it = c.categories.find((x) => x.category === category)?.items.find((i) => i.name === name); if (it && !it.subtypes.includes(sub)) it.subtypes.push(sub) }),
    removePartSubtype: (did, category, name, sub) => withParts(did, (c) => { const it = c.categories.find((x) => x.category === category)?.items.find((i) => i.name === name); if (it) it.subtypes = it.subtypes.filter((x) => x !== sub) }),
    loadPartsTemplate: (did) => setState((s) => ({ ...s, partsCatalog: { ...s.partsCatalog, [did]: clone(DEFAULT_PARTS_TEMPLATE) } })),

    /* ---- onboarding packages (admin-editable) ---- */
    // Prepend so the new (editable) package appears right under the "New package" button,
    // not below several tall cards off-screen. Returns the new id so the UI can highlight it.
    addPackage: () => { const id = `pkg-${Date.now()}`; setState((s) => ({ ...s, packages: [{ id, name: 'New package', description: '', serviceTypes: [], partsCategories: [] }, ...s.packages] })); return id },
    updatePackage: (id, patch) => setState((s) => ({ ...s, packages: s.packages.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    removePackage: (id) => setState((s) => ({ ...s, packages: s.packages.filter((p) => p.id !== id) })),

    // (Change-request approvals moved to each dealership's own Admin - see DealerStore.)

    /* ---- system users (admin can add a user for any dealership) ---- */
    addUser: (did, user) => setState((s) => ({ ...s, users: { ...s.users, [did]: [{ id: `U-${Date.now()}`, ...user }, ...(s.users?.[did] || [])] } })),

    serviceCatalogFor: (did) => svcOf(state, did),
    partsCatalogFor: (did) => partsOf(state, did),
  }

  return <AdminContext.Provider value={api}>{children}</AdminContext.Provider>
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminStoreProvider')
  return ctx
}
