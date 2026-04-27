import { useEffect, useState } from 'react'
import { listResources, deleteResource } from '../api'
import { Package, Clock, Trash2, RefreshCw, Utensils, Heart, Home, Filter } from 'lucide-react'

const TYPE_EMOJI = { Food:'🍱', Medical:'💊', Shelter:'🏠' }
const STATUS_BADGE = {
  Active:  'badge-green',
  Claimed: 'badge-blue',
  Expired: 'badge-red',
}

function timeLeft(expiry) {
  const diff = new Date(expiry) - Date.now()
  if (diff <= 0) return { label:'Expired', warning:true }
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const warning = diff < 3600000
  return { label: h > 0 ? `${h}h ${m}m left` : `${m}m left`, warning }
}

export default function ResourcesView() {
  const [resources, setResources] = useState([])
  const [filter,    setFilter]    = useState('Active')
  const [typeFilter,setTypeFilter]= useState('All')
  const [loading,   setLoading]   = useState(false)
  const [deleting,  setDeleting]  = useState(null)

  async function load() {
    setLoading(true)
    try {
      const r = await listResources(filter)
      setResources(r.data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  async function handleDelete(id) {
    setDeleting(id)
    try { await deleteResource(id); setResources(prev => prev.filter(r => r.id !== id)) }
    catch (_) {} finally { setDeleting(null) }
  }

  const shown = typeFilter === 'All' ? resources : resources.filter(r => r.resource_type === typeFilter)

  return (
    <div style={{ padding:24, maxWidth:1000, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:'1.4rem', fontWeight:800 }}>Resources</h1>
          <p style={{ color:'#64748b', marginTop:2, fontSize:'0.9rem' }}>{shown.length} record{shown.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin-slow' : ''}/> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {['Active','Claimed','Expired'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="btn"
            style={{
              background: filter === s ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
              color: filter === s ? '#f97316' : '#64748b',
              border: filter === s ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.07)',
            }}>
            {s}
          </button>
        ))}
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          {['All','Food','Medical','Shelter'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="btn"
              style={{
                background: typeFilter === t ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: typeFilter === t ? '#e2e8f0' : '#64748b',
                border: '1px solid rgba(255,255,255,0.07)',
                padding:'6px 12px',
              }}>
              {t !== 'All' && TYPE_EMOJI[t]} {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading && (
        <div style={{ textAlign:'center', padding:48, color:'#334155' }}>Loading…</div>
      )}
      {!loading && shown.length === 0 && (
        <div style={{ textAlign:'center', padding:48, color:'#334155' }}>
          No {filter.toLowerCase()} resources
        </div>
      )}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
        {shown.map(r => {
          const tl = timeLeft(r.expiry_timestamp)
          return (
            <div key={r.id} className="glass animate-fade-up" style={{ padding:18, position:'relative', overflow:'hidden' }}>
              {/* Type stripe */}
              <div style={{
                position:'absolute', top:0, left:0, right:0, height:3,
                background: r.resource_type==='Food' ? '#f97316' : r.resource_type==='Medical' ? '#22c55e' : '#3b82f6',
              }}/>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:'1.5rem' }}>{TYPE_EMOJI[r.resource_type]}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'0.95rem' }}>{r.resource_type}</div>
                    {r.provider_name && <div style={{ fontSize:'0.75rem', color:'#64748b' }}>by {r.provider_name}</div>}
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
              </div>

              {r.description && (
                <p style={{ fontSize:'0.82rem', color:'#94a3b8', marginBottom:10, lineHeight:1.4 }}>{r.description}</p>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:'0.82rem', color:'#64748b' }}>
                  <b style={{ color:'#e2e8f0' }}>{r.quantity}</b> units
                </div>
                <div style={{
                  fontSize:'0.76rem', display:'flex', alignItems:'center', gap:4,
                  color: tl.warning ? '#ef4444' : '#64748b',
                }}>
                  <Clock size={12}/> {tl.label}
                </div>
              </div>

              <div style={{ fontSize:'0.72rem', color:'#475569', fontFamily:'JetBrains Mono, monospace', marginBottom:12 }}>
                {r.location_coords.lat.toFixed(4)}, {r.location_coords.lng.toFixed(4)}
              </div>

              {r.status === 'Active' && (
                <button className="btn btn-danger" style={{ width:'100%', padding:'6px 0', fontSize:'0.78rem' }}
                  onClick={() => handleDelete(r.id)} disabled={deleting === r.id}>
                  <Trash2 size={13}/> {deleting === r.id ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
