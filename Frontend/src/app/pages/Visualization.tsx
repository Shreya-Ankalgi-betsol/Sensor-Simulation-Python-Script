import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  threatsOverTime,
  threatsByLocation,
  threatTypeDistribution,
  sensorActivityHeatmap,
} from '../data/mockData';
import { Download } from 'lucide-react';
import { NotificationBell } from '../components/NotificationBell';

export function Visualization() {
  return (
    <div className="p-6 space-y-6">
      {/* Notification Bell */}
      <NotificationBell />

      {/* Page Header */}
      <div>
        <div
          className="mb-2"
          style={{
            fontSize: '0.865rem',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Dashboard / Visualization
        </div>
        <h1
          className="font-heading"
          style={{
            fontSize: '2.3rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
          }}
        >
          VISUALIZATION
        </h1>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Chart 1: Threats Over Time */}
        <ChartCard title="Threats Over Time">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={threatsOverTime}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284C7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284C7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.8)" />
              <XAxis
                dataKey="time"
                stroke="var(--text-secondary)"
                style={{ fontSize: '0.865rem', fontFamily: 'var(--font-mono)' }}
              />
              <YAxis
                stroke="var(--text-secondary)"
                style={{ fontSize: '0.865rem', fontFamily: 'var(--font-mono)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#0284C7"
                strokeWidth={3}
                fill="url(#colorCount)"
                dot={{ fill: '#0284C7', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Threats by Location */}
        <ChartCard title="Threats by Location">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={threatsByLocation} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.8)" />
              <XAxis
                type="number"
                stroke="var(--text-secondary)"
                style={{ fontSize: '0.865rem', fontFamily: 'var(--font-mono)' }}
              />
              <YAxis
                type="category"
                dataKey="location"
                stroke="var(--text-secondary)"
                style={{ fontSize: '0.865rem', fontFamily: 'var(--font-mono)' }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {threatsByLocation.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`rgba(2, 132, 199, ${0.4 + entry.count * 0.04})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 3: Threat Type Distribution */}
        <ChartCard title="Threat Type Distribution">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={threatTypeDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {threatTypeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: '0.865rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-primary)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
            style={{ marginTop: '-10px' }}
          >
            <div
              className="font-heading"
              style={{
                fontSize: '1.725rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
              }}
            >
              47
            </div>
            <div
              style={{
                fontSize: '0.865rem',
                color: 'var(--text-secondary)',
              }}
            >
              TOTAL
            </div>
          </div>
        </ChartCard>

        {/* Chart 4: Sensor Activity Heatmap */}
        <ChartCard title="Sensor Activity Heatmap">
          <div className="w-full h-[250px] overflow-auto">
            <div className="min-w-[600px]">
              {sensorActivityHeatmap.map((sensor, sensorIdx) => (
                <div key={sensor.sensor} className="flex items-center gap-2 mb-1">
                  <div
                    className="w-16 text-right"
                    style={{
                      fontSize: '0.865rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    {sensor.sensor}
                  </div>
                  <div className="flex gap-1 flex-1">
                    {sensor.hours.map((activity, hourIdx) => {
                      const intensity = activity / 12;
                      return (
                        <div
                          key={hourIdx}
                          className="w-5 h-8 rounded transition-all duration-200"
                          style={{
                            background: `rgba(2, 132, 199, ${intensity * 0.8})`,
                            border: '1px solid rgba(2, 132, 199, 0.2)',
                          }}
                          title={`${hourIdx}:00 - Activity: ${activity}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 mt-3">
                <div className="w-16" />
                <div className="flex gap-1 flex-1">
                  {Array.from({ length: 24 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-5 text-center"
                      style={{
                        fontSize: '0.71875rem',
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {idx % 3 === 0 ? idx : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg p-4 border transition-all duration-200 relative"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className="uppercase tracking-wider"
          style={{
            fontSize: '0.865rem',
            fontWeight: 600,
            color: 'var(--accent-cyan)',
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {title}
        </h3>
        <button
          className="p-1 rounded transition-all duration-200"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent-cyan)';
            e.currentTarget.style.background = 'rgba(2, 132, 199, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <Download size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}