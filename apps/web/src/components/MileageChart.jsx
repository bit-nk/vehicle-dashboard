import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// Default-exported so it can be React.lazy()'d - keeps Recharts out of the
// initial bundle. Renders the odometer timeline as a smooth area chart.
export default function MileageChart({ data }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="miles" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1c66f1" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1c66f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eceef2" vertical={false} />
          <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#818ea6' }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: '#818ea6' }}
            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            width={42}
          />
          <Tooltip
            formatter={(v) => [`${v.toLocaleString()} km`, 'Odometer']}
            contentStyle={{ borderRadius: 12, border: '1px solid #eceef2', fontSize: 13 }}
          />
          <Area type="monotone" dataKey="mileage" stroke="#1c66f1" strokeWidth={2.5} fill="url(#miles)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
