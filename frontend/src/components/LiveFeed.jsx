import { useEffect, useRef } from 'react'
import { Activity, Package, AlertCircle, Zap, TrendingUp } from 'lucide-react'
import { useWS } from '../context/WSContext'

const EVENT_ICONS = {
  resource: <Package  size={14} color="#f97316" />,
  request:  <AlertCircle size={14} color="#ef4444" />,
  claim:    <Zap      size={14} color="#22c55e" />,
  expiry:   <Activity size={14} color="#eab308" />,
}

const EVENT_COLORS = {
  resource: '#f97316',
  request:  '#ef4444',
  claim:    '#22c55e',
  expiry:   '#eab308',
}

function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function LiveFeed({ resources }) {
  const { events } = useWS()
  const ref = useRef(null)

  const active  = resources.filter(r => r.status === 'Active').length
  const claimed = resources.filter(r => r.status === 'Claimed').length
  const expired = resources.filter(r => r.status === 'Expired').length

  return (
    <aside style={{
      width: 300, minWidth: 300,
      background: 'rgba(11,15,23,0.95)',
      borderLeft: '1px solid rgba(255,255,255,0.07)',
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 60px)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Activity size={16} color="#f97316" />
          <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#94a3b8' }}>
            Live Feed
          </span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Active',  val: active,  color: '#22c55e' },
            { label: 'Claimed', val: claimed, color: '#3b82f6' },
            { label: 'Expired', val: expired, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: 8,
              padding: '8px 6px', textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Events list */}
      <div ref={ref} style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {events.length === 0 && (
          <div style={{ textAlign: 'center', color: '#334155', padding: '32px 16px', fontSize: '0.85rem' }}>
            Waiting for live events…
          </div>
        )}
        {events.map(ev => (
          <div key={ev.id} className="animate-fade-up" style={{
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: `${EVENT_COLORS[ev.type]}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 1,
            }}>
              {EVENT_ICONS[ev.type]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 500, lineHeight: 1.35 }}>
                {ev.text}
              </div>
              {ev.payload?.location_coords && (
                <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                  {ev.payload.location_coords.lat.toFixed(4)}, {ev.payload.location_coords.lng.toFixed(4)}
                </div>
              )}
              <div style={{ fontSize: '0.7rem', color: '#334155', marginTop: 3 }}>
                {fmt(ev.ts)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
