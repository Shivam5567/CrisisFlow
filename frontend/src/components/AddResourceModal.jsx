import { useState } from 'react'
import { X, Clock, Utensils, Heart, Home, AlertCircle } from 'lucide-react'
import { createResource } from '../api'
import LocationPickerMap from './LocationPickerMap'

const TYPE_ICONS = { Food: <Utensils size={16}/>, Medical: <Heart size={16}/>, Shelter: <Home size={16}/> }

export default function AddResourceModal({ onClose, onSuccess, userLocation }) {
  const [form, setForm] = useState({
    provider_name:  '',
    provider_id:    'demo-provider',
    resource_type:  'Food',
    quantity:       1,
    description:    '',
    lat:            userLocation?.lat ?? 20.5937,
    lng:            userLocation?.lng ?? 78.9629,
    expires_in_hrs: 4,
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function set(field, val) { setForm(p => ({ ...p, [field]: val })) }

  function handleMapPick(lat, lng) { setForm(p => ({ ...p, lat, lng })) }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const expiry = new Date(Date.now() + form.expires_in_hrs * 3600 * 1000).toISOString()
      await createResource({
        provider_id:      form.provider_id,
        provider_name:    form.provider_name,
        resource_type:    form.resource_type,
        location_coords:  { lat: parseFloat(form.lat), lng: parseFloat(form.lng) },
        quantity:         parseInt(form.quantity),
        description:      form.description,
        expiry_timestamp: expiry,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to add resource.')
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
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Resource</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>Post resources for people in need</p>
          </div>
          <button className="btn btn-ghost" style={{ padding: 6 }} onClick={onClose}><X size={18}/></button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Provider Name */}
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: 6, display: 'block' }}>
              Provider Name
            </label>
            <input className="input" placeholder="Your name / org name"
              value={form.provider_name} onChange={e => set('provider_name', e.target.value)} required />
          </div>

          {/* Type */}
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: 6, display: 'block' }}>
              Resource Type
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Food', 'Medical', 'Shelter'].map(t => (
                <button type="button" key={t} onClick={() => set('resource_type', t)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                  border: form.resource_type === t ? '1px solid #f97316' : '1px solid rgba(255,255,255,0.07)',
                  background: form.resource_type === t ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.04)',
                  color: form.resource_type === t ? '#f97316' : '#94a3b8',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
                }}>
                  {TYPE_ICONS[t]}{t}
                </button>
              ))}
            </div>
          </div>

          {/* Qty + Expiry */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: 6, display: 'block' }}>Quantity</label>
              <input className="input" type="number" min={1} value={form.quantity}
                onChange={e => set('quantity', e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                <Clock size={11} style={{ display:'inline', marginRight:3 }}/>Expires in
              </label>
              <select className="input" value={form.expires_in_hrs} onChange={e => set('expires_in_hrs', e.target.value)}>
                {[1,2,4,6,12,24,48].map(h => <option key={h} value={h}>{h} hours</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: 6, display: 'block' }}>
              Description (optional)
            </label>
            <textarea className="input" rows={2} value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Hot meals for 20, dietary restrictions…" />
          </div>

          {/* ── Location Picker Map ── */}
          <div>
            <label style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginBottom: 6, display: 'block' }}>
              📍 Drop Location — click the map to place a pin
            </label>
            <LocationPickerMap
              lat={form.lat} lng={form.lng}
              onPick={handleMapPick}
            />
            {/* Coordinate readout */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8,
            }}>
              <input className="input" type="number" step="any" placeholder="Latitude"
                value={form.lat} onChange={e => set('lat', parseFloat(e.target.value))}
                style={{ fontSize: '0.8rem' }} required />
              <input className="input" type="number" step="any" placeholder="Longitude"
                value={form.lng} onChange={e => set('lng', parseFloat(e.target.value))}
                style={{ fontSize: '0.8rem' }} required />
            </div>
          </div>

          {error && (
            <div style={{ display:'flex', gap:8, alignItems:'center', color:'#ef4444',
              fontSize:'0.82rem', background:'rgba(239,68,68,0.1)', padding:'8px 12px', borderRadius:8 }}>
              <AlertCircle size={14}/> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
              {loading ? 'Posting…' : '📦 Post Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
