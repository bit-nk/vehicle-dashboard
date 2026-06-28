// Shared recharts styling so the dark tooltip / grid / axis look is single-sourced
// (was duplicated as `tip`/`grid`/`axis` consts + inline literals across the chart pages).
export const chartTip = { borderRadius: 12, border: '1px solid #334155', background: '#0f1729', fontSize: 13, color: '#e2e8f0' }
export const chartGrid = { strokeDasharray: '3 3', stroke: '#475569', strokeOpacity: 0.2 }
export const chartAxis = { tickLine: false, axisLine: false, tick: { fontSize: 11, fill: '#94a3b8' } }
