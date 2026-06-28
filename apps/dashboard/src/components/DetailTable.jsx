// Shared simple table used by the Overview/Parts/Billing detail drawers.
// columns: [{ label, key?, render?(row), align? }].
export default function DetailTable({ columns, rows, empty = 'Nothing here.' }) {
  if (!rows.length) return <p className="p-6 text-sm text-ink-400">{empty}</p>
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-xs uppercase tracking-wide text-ink-400">
          {columns.map((c) => (
            <th key={c.label} className={`px-5 py-2 font-semibold ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.id ?? i} className="border-t border-ink-100">
            {columns.map((c) => (
              <td key={c.label} className={`px-5 py-2.5 text-ink-700 ${c.align === 'right' ? 'text-right' : ''}`}>{c.render ? c.render(row) : row[c.key]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
