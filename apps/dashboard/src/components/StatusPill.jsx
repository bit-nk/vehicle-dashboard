// Vehicle status pill - uses the shared .badge palette (light + dark aware) for a
// consistent, legible status look across the whole dashboard.
export const VEHICLE_STATUS = {
  in_stock: { label: 'In stock', tone: 'badge-green' },
  in_service: { label: 'In service', tone: 'badge-amber' },
  reserved: { label: 'Reserved', tone: 'badge-indigo' },
  sold: { label: 'Sold', tone: 'badge-gray' },
}
export const STATUS_KEYS = Object.keys(VEHICLE_STATUS)

export default function StatusPill({ status, className = '' }) {
  const s = VEHICLE_STATUS[status] || VEHICLE_STATUS.in_stock
  return (
    <span className={`badge ${s.tone} ${className}`}>
      <span className="badge-dot" />
      {s.label}
    </span>
  )
}
