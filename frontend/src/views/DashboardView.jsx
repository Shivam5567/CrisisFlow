import { useEffect, useState } from 'react'
import { getStats } from '../api'
import { Activity, Package, Users, AlertTriangle, RefreshCw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const COLORS = { Food:'#f97316', Medical:'#22c55e', Shelter:'#3b82f6' }

function StatCard({ title, value, icon, color }) {
  return (
    <div className="glass animate-fade-up" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ background: `${color}20`, color, padding: 12, borderRadius: 12 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>{value}</div>
      </div>
    </div>
  )
}

export default function DashboardView() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const { data } = await getStats()
      setStats(data)
    } catch (e) {
      console.error("Failed to load stats", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading && !stats) {
    return <div style={{ textAlign:'center', padding:48, color:'#334155' }}>Loading analytics…</div>
  }

  if (!stats) {
    return <div style={{ textAlign:'center', padding:48, color:'#ef4444' }}>Failed to load analytics.</div>
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Analytics Dashboard</h1>
          <p style={{ color: '#64748b', marginTop: 2, fontSize: '0.9rem' }}>Real-time overview of crisis response</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin-slow' : ''} /> Refresh
        </button>
      </div>

      {/* Top Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard title="Active Resources" value={stats.resources.active} icon={<Package size={24}/>} color="#f97316" />
        <StatCard title="Resources Claimed Today" value={stats.resources.claimed_today} icon={<Activity size={24}/>} color="#22c55e" />
        <StatCard title="Open Requests" value={stats.requests.open} icon={<AlertTriangle size={24}/>} color="#ef4444" />
        <StatCard title="Assigned Volunteers" value={stats.requests.assigned} icon={<Users size={24}/>} color="#3b82f6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        
        {/* Resource Breakdown Chart */}
        <div className="glass animate-fade-up" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Active Resources by Type</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.resources.by_type.filter(d => d.value > 0)}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                  paddingAngle={5} dataKey="value" stroke="none"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.resources.by_type.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Request Urgency Chart */}
        <div className="glass animate-fade-up" style={{ padding: 24, animationDelay: '100ms' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Open Requests by Urgency</h3>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.requests.by_urgency} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {stats.requests.by_urgency.map((entry, index) => {
                    const c = { Critical:'#ef4444', High:'#eab308', Normal:'#3b82f6', Low:'#22c55e' }
                    return <Cell key={`cell-${index}`} fill={c[entry.name]} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
