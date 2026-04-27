import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listRequests, assignRequest, fulfillRequest } from '../api'
import { AlertCircle, Clock, RefreshCw, Utensils, Heart, Home, CheckCircle2, UserCheck } from 'lucide-react'

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
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [filter,   setFilter]   = useState('Open')
  const [loading,  setLoading]  = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  async function load() {
    setLoading(true)
    try { const r = await listRequests(filter); setRequests(r.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  async function handleAssign(id) {
    setActionLoading(id)
    try {
      await assignRequest(id, 'demo-volunteer')
      setRequests(prev => prev.filter(req => req.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleFulfill(id) {
    setActionLoading(id)
    try {
      await fulfillRequest(id)
      setRequests(prev => prev.filter(req => req.id !== id))
    } catch (e) {
      console.error(e)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div style={{ padding:24, maxWidth:1000, margin:'0 auto' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:'1.4rem', fontWeight:800 }}>Help Requests</h1>
          <p style={{ color:'#64748b', marginTop:2, fontSize:'0.9rem' }}>{requests.length} {filter.toLowerCase()} request{requests.length!==1?'s':''}</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading?'animate-spin-slow':''}/> Refresh
        </button>
      </div>

      <div style={{ display:'flex', gap:0, marginBottom:20, border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:10, overflow:'hidden', width:'fit-content' }}>
        {[
          { val:'Open', emoji:'🔴' },
          { val:'Assigned', emoji:'🔵' },
          { val:'Fulfilled', emoji:'🟢' },
        ].map(({ val, emoji }) => (
          <button key={val} onClick={() => setFilter(val)}
            style={{
              padding:'9px 20px', cursor:'pointer', border:'none',
              background: filter === val ? 'rgba(239,68,68,0.15)' : 'transparent',
              color: filter === val ? '#ef4444' : '#64748b',
              fontWeight: filter === val ? 700 : 500, fontSize:'0.85rem',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              transition:'all 0.2s',
            }}>
            {emoji} {val}
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
                
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12, flexWrap:'wrap', gap:8 }}>
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                    <span style={{ fontSize:'0.72rem', color:'#475569', fontFamily:'JetBrains Mono,monospace' }}>
                      📍 {req.location_coords.lat.toFixed(4)}, {req.location_coords.lng.toFixed(4)}
                    </span>
                    <span style={{ fontSize:'0.72rem', color:'#475569', display:'flex', alignItems:'center', gap:4 }}>
                      <Clock size={11}/> {relTime(req.timestamp)}
                    </span>
                  </div>
                  {user?.id === req.seeker_id && (
                    <div style={{
                      padding:'6px 12px', borderRadius:8, fontSize:'0.75rem', fontWeight:700,
                      background: req.status === 'Open' ? 'rgba(234,179,8,0.1)' : req.status === 'Assigned' ? 'rgba(59,130,246,0.1)' : 'rgba(34,197,94,0.1)',
                      color: req.status === 'Open' ? '#eab308' : req.status === 'Assigned' ? '#3b82f6' : '#22c55e'
                    }}>
                      {req.status === 'Open' ? '⏳ Finding volunteer...' : req.status === 'Assigned' ? '🚑 Help is on the way!' : '✅ Delivered!'}
                    </div>
                  )}

                  {user?.role === 'Volunteer' && filter === 'Open' && (
                    <button className="btn btn-primary" style={{ padding:'6px 14px', fontSize:'0.75rem' }}
                      onClick={() => handleAssign(req.id)} disabled={actionLoading === req.id}>
                      {actionLoading === req.id ? 'Accepting...' : <><UserCheck size={14}/> Accept Request</>}
                    </button>
                  )}
                  {user?.role === 'Volunteer' && filter === 'Assigned' && (
                    <button className="btn" style={{ background:'#22c55e', color:'#fff', padding:'6px 14px', fontSize:'0.75rem' }}
                      onClick={() => handleFulfill(req.id)} disabled={actionLoading === req.id}>
                      {actionLoading === req.id ? 'Updating...' : <><CheckCircle2 size={14}/> Mark Fulfilled</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
