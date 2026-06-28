import CatalogManager from '../../components/CatalogManager.jsx'
import PackageManager from '../../components/PackageManager.jsx'

export default function AdminCatalog() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">Catalog &amp; packages</h1>
        <p className="text-sm text-ink-500">Edit onboarding packages, and add or remove service types/subtypes and parts categories/items/subtypes per dealership.</p>
      </div>
      <PackageManager />
      <div className="border-t border-ink-100 pt-6">
        <CatalogManager />
      </div>
    </div>
  )
}
