import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listResources, deleteResource, generateQR } from '../api'
import { Clock, Trash2, RefreshCw, QrCode, Copy, Check, CheckCircle2, AlertCircle } from 'lucide-react'
import { QRCodeSVG as QRCode } from 'qrcode.react'

const TYPE_EMOJI = { Food:'🍱', Medical:'💊', Shelter:'🏠' }
const TYPE_COLOR = { Food:'#f97316', Medical:'#22c55e', Shelter:'#3b82f6' }
const STATUS_BADGE  = { Active:'badge-green', Claimed:'badge-blue', Expired:'badge-red' }

function timeLeft(expiry) {
  const diff = new Date(expiry) - Date.now()
  if (diff <= 0) return { label:'Expired', warning:true }
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return { label: h > 0 ? `${h}h ${m}m left` : `${m}m left`, warning: diff < 3600000 }
}

// ── Inline QR popup shown on a card ─────────────────────────────────────────
function QRPanel({ resource, onClose }) {
  const [qrHash,   setQrHash]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [copied,   setCopied]   = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const r = await generateQR({ resource_id: resource.id })
      setQrHash(r.data.qr_hash)
    } catch (e) {
      setError(e.response?.data?.detail ?? 'Failed to generate QR')
    } finally { setLoading(false) }
  }

  async function verify() {
    if (!verHash.trim()) return
    setVerLoading(true); setVerMsg(null)
    try {
      // call through the same api module
      const { verifyQR } = await import('../api')
      const r = await verifyQR({ qr_hash: verHash.trim() })
      setVerMsg({ ok: true, text: r.data.message })
    } catch(e) {
      setVerMsg({ ok: false, text: e.response?.data?.detail ?? 'Verification failed' })
    } finally { setVerLoading(false) }
  }

  function copy() { navigator.clipboard.writeText(qrHash); setCopied(true); setTimeout(()=>setCopied(false),2000) }

  return (
    <div style={{
      marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.07)',
      paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {!qrHash ? (
        <>
          <div style={{ fontSize:'0.75rem', color:'#64748b', lineHeight:1.4 }}>
            Generate a one-time QR code for this resource so a volunteer/seeker can claim it on-site.
          </div>
          {error && (
            <div style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444', padding:'6px 10px',
              borderRadius:6, fontSize:'0.78rem', display:'flex', gap:6, alignItems:'center' }}>
              <AlertCircle size={13}/>{error}
            </div>
          )}
          <button className="btn btn-primary" style={{ width:'100%' }} onClick={generate} disabled={loading}>
            <QrCode size={14}/> {loading ? 'Generating…' : 'Generate QR Code'}
          </button>
        </>
      ) : (
        <>
          {/* QR Code display */}
          <div style={{ display:'flex', justifyContent:'center' }}>
            <div style={{ background:'#fff', padding:10, borderRadius:8, display:'inline-block' }}>
              <QRCode value={qrHash} size={120}/>
            </div>
          </div>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.65rem', color:'#475569',
            wordBreak:'break-all', background:'rgba(255,255,255,0.04)', padding:'6px 8px', borderRadius:6 }}>
            {qrHash}
          </div>
          <button className="btn btn-ghost" style={{ width:'100%' }} onClick={copy}>
            {copied ? <><Check size={13} color="#22c55e"/> Copied!</> : <><Copy size={13}/> Copy Hash</>}
          </button>

        </>
      )}
      <button className="btn btn-ghost" style={{ width:'100%', fontSize:'0.75rem' }} onClick={onClose}>
        ✕ Close
      </button>
    </div>
  )
}

export default function ResourcesView() {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [filter, setFilter] = useState('Active')
  const [typeFilter, setTypeFilter] = useState('All')
  const [loading,    setLoading]    = useState(false)
  const [deleting,   setDeleting]   = useState(null)
  const [qrOpenId,   setQrOpenId]   = useState(null)  // card with QR panel open

  async function load() {
    setLoading(true)
    try { const r = await listResources(filter); setResources(r.data) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  async function handleDelete(id) {
    setDeleting(id)
    try { await deleteResource(id); setResources(prev => prev.filter(r => r.id !== id)) }
    catch (_) {} finally { setDeleting(null) }
  }

  const statusOrder = { Active:0, Claimed:1, Expired:2 }
  const shown = (typeFilter === 'All' ? resources : resources.filter(r => r.resource_type === typeFilter))

  return (
    <div style={{ padding:24, maxWidth:1100, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, gap:12, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontSize:'1.4rem', fontWeight:800 }}>Resources</h1>
          <p style={{ color:'#64748b', marginTop:2, fontSize:'0.9rem' }}>{shown.length} record{shown.length!==1?'s':''}</p>
        </div>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin-slow' : ''}/> Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:20, border:'1px solid rgba(255,255,255,0.07)',
        borderRadius:10, overflow:'hidden', width:'fit-content' }}>
        {[
          { val:'Active',  emoji:'🟢', count: null },
          { val:'Claimed', emoji:'🔵', count: null },
          { val:'Expired', emoji:'🔴', count: null },
        ].map(({ val, emoji }) => (
          <button key={val} onClick={() => { setFilter(val); setQrOpenId(null) }}
            style={{
              padding:'9px 20px', cursor:'pointer', border:'none',
              background: filter === val ? 'rgba(249,115,22,0.15)' : 'transparent',
              color: filter === val ? '#f97316' : '#64748b',
              fontWeight: filter === val ? 700 : 500, fontSize:'0.85rem',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              transition:'all 0.2s',
            }}>
            {emoji} {val}
          </button>
        ))}
      </div>

      {/* Type filters */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {['All','Food','Medical','Shelter'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} className="btn"
            style={{
              background: typeFilter === t ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: typeFilter === t ? '#e2e8f0' : '#64748b',
              border: '1px solid rgba(255,255,255,0.07)', padding:'5px 12px', fontSize:'0.8rem',
            }}>
            {t !== 'All' && TYPE_EMOJI[t]} {t}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {loading && <div style={{ textAlign:'center', padding:48, color:'#334155' }}>Loading…</div>}
      {!loading && shown.length === 0 && (
        <div style={{ textAlign:'center', padding:48, color:'#334155' }}>
          <div style={{ fontSize:'2rem', marginBottom:8 }}>
            {filter==='Active'?'📦':filter==='Claimed'?'✅':'⏰'}
          </div>
          No {filter.toLowerCase()} resources
          {filter === 'Claimed' && (
            <div style={{ fontSize:'0.8rem', marginTop:8, color:'#475569' }}>
              Resources appear here after a QR code is successfully verified.
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(290px, 1fr))', gap:16 }}>
        {shown.map(r => {
          const tl = timeLeft(r.expiry_timestamp)
          const isQrOpen = qrOpenId === r.id
          return (
            <div key={r.id} className="glass animate-fade-up"
              style={{ padding:18, position:'relative', overflow:'hidden' }}>
              {/* Type colour stripe */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3,
                background: TYPE_COLOR[r.resource_type] ?? '#f97316' }}/>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:'1.5rem' }}>{TYPE_EMOJI[r.resource_type]}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'0.95rem' }}>{r.resource_type}</div>
                    {r.provider_name && <div style={{ fontSize:'0.72rem', color:'#64748b' }}>by {r.provider_name}</div>}
                  </div>
                </div>
                <span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
              </div>

              {r.description && (
                <p style={{ fontSize:'0.8rem', color:'#94a3b8', marginBottom:8, lineHeight:1.4 }}>{r.description}</p>
              )}

              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <div style={{ fontSize:'0.82rem', color:'#94a3b8' }}>
                  <b style={{ color:'#e2e8f0' }}>{r.quantity}</b> units
                </div>
                <div style={{ fontSize:'0.75rem', display:'flex', alignItems:'center', gap:4,
                  color: tl.warning ? '#ef4444' : '#64748b' }}>
                  <Clock size={12}/> {tl.label}
                </div>
              </div>

              {/* Resource ID (for QR workflow) */}
              <div style={{ fontSize:'0.65rem', color:'#334155', fontFamily:'JetBrains Mono,monospace',
                marginBottom:10, wordBreak:'break-all' }}>
                ID: {r.id}
              </div>

              <div style={{ fontSize:'0.72rem', color:'#475569', fontFamily:'JetBrains Mono,monospace', marginBottom:12 }}>
                📍 {r.location_coords.lat.toFixed(4)}, {r.location_coords.lng.toFixed(4)}
              </div>

              {/* Action buttons */}
              {r.status === 'Active' && user?.id === r.provider_id && (
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn"
                    style={{
                      flex:1, padding:'7px 0', fontSize:'0.78rem',
                      background: isQrOpen ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.1)',
                      color:'#f97316', border:'1px solid rgba(249,115,22,0.3)',
                    }}
                    onClick={() => setQrOpenId(isQrOpen ? null : r.id)}>
                    <QrCode size={13}/> {isQrOpen ? 'Close QR' : 'QR Code'}
                  </button>
                  <button className="btn btn-danger"
                    style={{ flex:1, padding:'7px 0', fontSize:'0.78rem' }}
                    onClick={() => handleDelete(r.id)} disabled={deleting === r.id}>
                    <Trash2 size={13}/> {deleting === r.id ? '…' : 'Remove'}
                  </button>
                </div>
              )}

              {/* Inline QR panel */}
              {isQrOpen && (
                <QRPanel resource={r} onClose={() => setQrOpenId(null)} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
