import { useState, useEffect } from 'react'
import { X, AlertCircle, Utensils, Heart, Home, Crosshair } from 'lucide-react'
import { createRequest } from '../api'
import LocationPickerMap from './LocationPickerMap'

const URGENCY_COLORS = {
  Low:      { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  Normal:   { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  High:     { bg: 'rgba(234,179,8,0.12)',  color: '#eab308' },
  Critical: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
}

export default function RequestHelpModal({ onClose, onSuccess, userLocation }) {
  const [form, setForm] = useState({
    seeker_name:   '',
    seeker_id:     'demo-seeker',
    required_type: 'Food',
    urgency:       'Normal',
    description:   '',
    lat:           userLocation?.lat ?? 20.5937,
    lng:           userLocation?.lng ?? 78.9629,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

  useEffect(() => {
    if (!userLocation) requestGeo()
  }, [])

  function requestGeo() {
    if (!navigator.geolocation) return
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setForm(p => ({ ...p, lat: parseFloat(coords.latitude.toFixed(6)), lng: parseFloat(coords.longitude.toFixed(6)) }))
        setGeoLoading(false)
      },
      () => setGeoLoading(false),
      { timeout: 8000 }
    )
  }

  function set(field, val) { setForm(p => ({ ...p, [field]: val })) }
  function handleMapPick(lat, lng) { setForm(p => ({ ...p, lat, lng })) }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createRequest({
        seeker_id:       form.seeker_id,
        seeker_name:     form.seeker_name,
        required_type:   form.required_type,
        location_coords: { lat: parseFloat(form.lat), lng: parseFloat(form.lng) },
        description:     form.description,
        urgency:         form.urgency,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to submit request.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflowY: 'auto',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass animate-fade-up" style={{
        width: '100%', maxWidth: 500, padding: 28,
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ef4444' }}>Request Help</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>Describe what you need</p>
          </div>
          <button className="btn btn-ghost" style={{ padding: 6 }} onClick={onClose}><X size={18}/></button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: 6, display: 'block' }}>Your Name</label>
            <input className="input" placeholder="Name or alias" value={form.seeker_name}
              onChange={e => set('seeker_name', e.target.value)} required />
          </div>

          {/* Need type */}
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: 6, display: 'block' }}>Need</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['Food', <Utensils size={15}/>], ['Medical', <Heart size={15}/>], ['Shelter', <Home size={15}/>]].map(([t, icon]) => (
                <button type="button" key={t} onClick={() => set('required_type', t)} style={{
                  flex: 1, padding: '10px 6px', borderRadius: 8, cursor: 'pointer',
                  border: form.required_type === t ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.07)',
                  background: form.required_type === t ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                  color: form.required_type === t ? '#ef4444' : '#94a3b8',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
                }}>
                  {icon}{t}
                </button>
              ))}
            </div>
          </div>

          {/* Urgency */}
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: 6, display: 'block' }}>Urgency</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Low','Normal','High','Critical'].map(u => {
                const c = URGENCY_COLORS[u]
                return (
                  <button type="button" key={u} onClick={() => set('urgency', u)} style={{
                    flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                    border: form.urgency === u ? `1px solid ${c.color}` : '1px solid rgba(255,255,255,0.07)',
                    background: form.urgency === u ? c.bg : 'rgba(255,255,255,0.04)',
                    color: form.urgency === u ? c.color : '#64748b',
                    fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.2s',
                  }}>
                    {u}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Location Picker Map ── */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                📍 Your Location — click map to pin where you are
              </label>
              <button type="button" onClick={requestGeo}
                style={{
                  display:'flex', alignItems:'center', gap:4, fontSize:'0.72rem',
                  background: geoLoading ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.06)',
                  color: geoLoading ? '#3b82f6' : '#94a3b8',
                  border:'1px solid rgba(255,255,255,0.1)', borderRadius:6,
                  padding:'4px 10px', cursor:'pointer', transition:'all 0.2s',
                }}>
                <Crosshair size={11}/> {geoLoading ? 'Locating…' : 'Use My Location'}
              </button>
            </div>
            <LocationPickerMap
              lat={form.lat} lng={form.lng}
              onPick={handleMapPick}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <input className="input" type="number" step="any" placeholder="Latitude"
                value={form.lat} onChange={e => set('lat', parseFloat(e.target.value))}
                style={{ fontSize: '0.8rem' }} required />
              <input className="input" type="number" step="any" placeholder="Longitude"
                value={form.lng} onChange={e => set('lng', parseFloat(e.target.value))}
                style={{ fontSize: '0.8rem' }} required />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: 6, display: 'block' }}>Details</label>
            <textarea className="input" rows={2} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Number of people, special needs, landmark…" />
          </div>

          {error && (
            <div style={{ display:'flex', gap:8, alignItems:'center', color:'#ef4444',
              fontSize:'0.82rem', background:'rgba(239,68,68,0.1)', padding:'8px 12px', borderRadius:8 }}>
              <AlertCircle size={14}/> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" style={{ flex: 2 }} disabled={loading}>
              {loading ? 'Sending…' : '🆘 Request Help'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
