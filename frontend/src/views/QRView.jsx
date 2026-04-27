import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'
import { generateQR, verifyQR } from '../api'
import { Scan, QrCode, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react'

export default function QRView() {
  const [resourceId, setResourceId] = useState('')
  const [claimerId,  setClaimerId]  = useState('demo-volunteer')
  const [qrHash,     setQrHash]     = useState('')
  const [verifyHash, setVerifyHash] = useState('')
  const [genResult,  setGenResult]  = useState(null)
  const [verResult,  setVerResult]  = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [copied,     setCopied]     = useState(false)

  async function handleGenerate(e) {
    e.preventDefault()
    setLoading(true); setGenResult(null)
    try {
      const r = await generateQR({ resource_id: resourceId, claimer_id: claimerId })
      setQrHash(r.data.qr_hash)
      setGenResult({ ok: true, msg: 'QR code generated!' })
    } catch (err) {
      setGenResult({ ok: false, msg: err.response?.data?.detail ?? 'Error generating QR' })
    } finally { setLoading(false) }
  }

  async function handleVerify(e) {
    e.preventDefault()
    setLoading(true); setVerResult(null)
    try {
      const r = await verifyQR({ qr_hash: verifyHash })
      setVerResult({ ok: true, msg: r.data.message })
    } catch (err) {
      setVerResult({ ok: false, msg: err.response?.data?.detail ?? 'Verification failed' })
    } finally { setLoading(false) }
  }

  function copy() {
    navigator.clipboard.writeText(qrHash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>QR Verification System</h1>
        <p style={{ color: '#64748b', marginTop: 4, fontSize: '0.9rem' }}>
          Generate cryptographic QR codes for resource assignment and verify collection on-site.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* ── Generate Panel ── */}
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:'rgba(249,115,22,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <QrCode size={18} color="#f97316"/>
            </div>
            <div>
              <div style={{ fontWeight:700 }}>Generate QR Code</div>
              <div style={{ fontSize:'0.75rem', color:'#64748b' }}>For resource assignment</div>
            </div>
          </div>

          <form onSubmit={handleGenerate} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={{ fontSize:'0.78rem', color:'#94a3b8', fontWeight:600, marginBottom:5, display:'block' }}>
                Resource ID
              </label>
              <input className="input" placeholder="MongoDB ObjectId of resource"
                value={resourceId} onChange={e => setResourceId(e.target.value)} required/>
            </div>
            <div>
              <label style={{ fontSize:'0.78rem', color:'#94a3b8', fontWeight:600, marginBottom:5, display:'block' }}>
                Claimer ID
              </label>
              <input className="input" placeholder="Seeker or volunteer ID"
                value={claimerId} onChange={e => setClaimerId(e.target.value)} required/>
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop:4 }}>
              {loading ? 'Generating…' : '⚡ Generate QR'}
            </button>
          </form>

          {genResult && (
            <div style={{
              marginTop:12, padding:'10px 14px', borderRadius:8,
              background: genResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: genResult.ok ? '#22c55e' : '#ef4444',
              fontSize:'0.82rem', display:'flex', gap:8, alignItems:'center',
            }}>
              {genResult.ok ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
              {genResult.msg}
            </div>
          )}

          {/* QR Display */}
          {qrHash && (
            <div className="animate-fade-up" style={{ marginTop:20, textAlign:'center' }}>
              <div style={{ padding:16, background:'#fff', borderRadius:12, display:'inline-block', marginBottom:12 }}>
                <QRCode value={qrHash} size={160}/>
              </div>
              <div style={{ fontSize:'0.72rem', color:'#475569', fontFamily:'JetBrains Mono,monospace',
                wordBreak:'break-all', padding:'8px 12px',
                background:'rgba(255,255,255,0.04)', borderRadius:8, marginBottom:8 }}>
                {qrHash}
              </div>
              <button className="btn btn-ghost" style={{ width:'100%', gap:6 }} onClick={copy}>
                {copied ? <><Check size={14} color="#22c55e"/> Copied!</> : <><Copy size={14}/> Copy Hash</>}
              </button>
            </div>
          )}
        </div>

        {/* ── Verify Panel ── */}
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
            <div style={{ width:36, height:36, borderRadius:8, background:'rgba(34,197,94,0.15)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Scan size={18} color="#22c55e"/>
            </div>
            <div>
              <div style={{ fontWeight:700 }}>Verify & Claim</div>
              <div style={{ fontSize:'0.75rem', color:'#64748b' }}>Enter hash from QR scanner</div>
            </div>
          </div>

          <form onSubmit={handleVerify} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div>
              <label style={{ fontSize:'0.78rem', color:'#94a3b8', fontWeight:600, marginBottom:5, display:'block' }}>
                QR Hash
              </label>
              <textarea className="input" rows={4}
                placeholder="Paste or scan the QR hash here…"
                style={{ fontFamily:'JetBrains Mono,monospace', fontSize:'0.78rem', resize:'vertical' }}
                value={verifyHash} onChange={e => setVerifyHash(e.target.value)} required/>
            </div>
            <button className="btn" type="submit" disabled={loading}
              style={{ background:'#22c55e', color:'#fff' }}>
              {loading ? 'Verifying…' : '✅ Verify & Mark Claimed'}
            </button>
          </form>

          {verResult && (
            <div style={{
              marginTop:12, padding:'12px 14px', borderRadius:8,
              background: verResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: verResult.ok ? '#22c55e' : '#ef4444',
              fontSize:'0.85rem', display:'flex', gap:8, alignItems:'center',
            }}>
              {verResult.ok ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
              <strong>{verResult.msg}</strong>
            </div>
          )}

          {/* Instructions */}
          <div style={{ marginTop:24, borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:20 }}>
            <div style={{ fontSize:'0.8rem', color:'#64748b', fontWeight:600, marginBottom:10 }}>
              HOW IT WORKS
            </div>
            {[
              ['1', 'Provider lists a resource → gets an ID'],
              ['2', 'Volunteer/Seeker requests the resource'],
              ['3', 'System generates a unique SHA-256 QR hash'],
              ['4', 'Collector presents QR at pickup point'],
              ['5', 'Volunteer scans → resource marked Claimed'],
            ].map(([n, txt]) => (
              <div key={n} style={{ display:'flex', gap:10, marginBottom:8, alignItems:'flex-start' }}>
                <div style={{ width:20, height:20, borderRadius:'50%',
                  background:'rgba(59,130,246,0.2)', color:'#3b82f6',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'0.68rem', fontWeight:700, flexShrink:0 }}>
                  {n}
                </div>
                <span style={{ fontSize:'0.8rem', color:'#94a3b8', lineHeight:1.4 }}>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
