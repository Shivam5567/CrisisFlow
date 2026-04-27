import { useEffect, useState } from 'react'
import { listRequests } from '../api'
import { AlertCircle, Clock, RefreshCw, Utensils, Heart, Home } from 'lucide-react'

const TYPE_EMOJI = { Food:'🍱', Medical:'💊', Shelter:'🏠' }
const URGENCY_STYLE = {
  Low:      { bg:'rgba(34,197,94,0.1)',   color:'#22c55e' },
  Normal:   { bg:'rgba(59,130,246,0.1)',  color:'#3b82f6' },
  High:     { bg:'rgba(234,179,8,0.1)',   color:'#eab308' },
  Critical: { bg:'rgba(239,68,68,0.1)',   color:'#ef4444' },
}

function relTime(ts) {
  const diff = Date.now() - new Date(ts)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m/60)}h ${m%60}m ago`
}

export default function RequestsView() {
  const [requests, setRequests] = useState([])
  const [filter,   setFilter]   = useState('Open')
  const [loading,  setLoading]  = useState(false)

  async function load() {
    setLoading(true)
    try { const r = await listRequests(filter); setRequests(r.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  return (
    <div style={{ padding:24, maxWidth:1000, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:'1.4rem', fontWeight:800 }}>Help Requests</h1>
          <p style={{ color:'#64748b', marginTop:2, fontSize:'0.9rem' }}>{requests.length} active request{requests.length!==1?'s':''}</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading?'animate-spin-slow':''}/> Refresh
        </button>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {['Open','Assigned','Fulfilled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="btn"
            style={{
              background: filter===s ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
              color: filter===s ? '#ef4444' : '#64748b',
              border: filter===s ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.07)',
            }}>
            {s}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign:'center', padding:48, color:'#334155' }}>Loading…</div>}
      {!loading && requests.length===0 && (
        <div style={{ textAlign:'center', padding:48, color:'#334155' }}>
          <AlertCircle size={32} style={{ marginBottom:12, opacity:0.3 }}/>
          <div>No {filter.toLowerCase()} requests</div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {[...requests].sort((a,b) => {
          const order = { Critical:0, High:1, Normal:2, Low:3 }
          return (order[a.urgency]??2) - (order[b.urgency]??2)
        }).map(req => {
          const urg = URGENCY_STYLE[req.urgency] ?? URGENCY_STYLE.Normal
          return (
            <div key={req.id} className="glass animate-fade-up"
              style={{ padding:18, display:'flex', gap:16, alignItems:'flex-start',
                borderLeft:`3px solid ${urg.color}` }}>
              <span style={{ fontSize:'1.8rem', flexShrink:0 }}>{TYPE_EMOJI[req.required_type]}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                  <div style={{ fontWeight:700, fontSize:'0.95rem' }}>
                    {req.seeker_name || 'Anonymous'} needs {req.required_type}
                  </div>
                  <span style={{
                    padding:'2px 10px', borderRadius:999,
                    background:urg.bg, color:urg.color,
                    fontSize:'0.7rem', fontWeight:700, flexShrink:0, marginLeft:8,
                  }}>
                    {req.urgency ?? 'Normal'}
                  </span>
                </div>
                {req.description && (
                  <p style={{ fontSize:'0.82rem', color:'#94a3b8', marginBottom:8, lineHeight:1.45 }}>{req.description}</p>
                )}
                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                  <span style={{ fontSize:'0.72rem', color:'#475569', fontFamily:'JetBrains Mono,monospace' }}>
                    📍 {req.location_coords.lat.toFixed(4)}, {req.location_coords.lng.toFixed(4)}
                  </span>
                  <span style={{ fontSize:'0.72rem', color:'#475569', display:'flex', alignItems:'center', gap:4 }}>
                    <Clock size={11}/> {relTime(req.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
