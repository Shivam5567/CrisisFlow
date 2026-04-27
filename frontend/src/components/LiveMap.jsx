import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getSurgeZones, listRequests } from '../api'
import { Package, AlertCircle, Flame, Clock, User } from 'lucide-react'

// Fix default marker icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom SVG icons
function makeIcon(color, emoji, size = 32) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:${size}px; height:${size}px;
      background:${color}; border-radius:50% 50% 50% 0;
      transform:rotate(-45deg); border:2px solid rgba(255,255,255,0.3);
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 2px 10px ${color}60;
    ">
      <span style="transform:rotate(45deg); font-size:${size*0.45}px; line-height:1">${emoji}</span>
    </div>`,
    iconSize:   [size, size],
    iconAnchor: [size/2, size],
    popupAnchor:[0, -size],
  })
}

const RESOURCE_ICONS = {
  Food:    makeIcon('#f97316', '🍱'),
  Medical: makeIcon('#22c55e', '💊'),
  Shelter: makeIcon('#3b82f6', '🏠'),
}
const REQUEST_ICON = makeIcon('#ef4444', '🆘')

function LocationPicker({ onPick }) {
  useMapEvents({ click: e => onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

function timeLeft(expiry) {
  const diff = new Date(expiry) - Date.now()
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function LiveMap({ resources, onMapClick }) {
  const [surgeZones, setSurgeZones] = useState([])
  const [requests,   setRequests]   = useState([])
  const center = [20.5937, 78.9629]  // India

  useEffect(() => {
    getSurgeZones().then(r => setSurgeZones(r.data)).catch(() => {})
    listRequests('Open').then(r => setRequests(r.data)).catch(() => {})
    const t = setInterval(() => {
      getSurgeZones().then(r => setSurgeZones(r.data)).catch(() => {})
      listRequests('Open').then(r => setRequests(r.data)).catch(() => {})
    }, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ position: 'relative', flex: 1, height: '100%' }}>
      <MapContainer
        center={center} zoom={5}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <LocationPicker onPick={onMapClick} />

        {/* Surge Zones */}
        {surgeZones.map((z, i) => (
          <Circle key={i}
            center={[z.center.lat, z.center.lng]}
            radius={z.radius_km * 1000}
            pathOptions={{
              color: '#ef4444', fillColor: '#ef4444',
              fillOpacity: 0.12, weight: 2, dashArray: '6 4',
            }}
          >
            <Popup>
              <div style={{ fontFamily:'Inter,sans-serif', minWidth:160 }}>
                <div style={{ fontWeight:700, color:'#ef4444', marginBottom:4 }}>⚡ Surge Zone</div>
                <div><b>Requests:</b> {z.request_count}</div>
                <div><b>Urgency:</b> {z.urgency_levels.join(', ')}</div>
                <div style={{ fontSize:'0.75rem', color:'#888', marginTop:4 }}>
                  {z.center.lat.toFixed(4)}, {z.center.lng.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Resources */}
        {resources.filter(r => r.status === 'Active').map(r => (
          <Marker key={r.id}
            position={[r.location_coords.lat, r.location_coords.lng]}
            icon={RESOURCE_ICONS[r.resource_type] ?? RESOURCE_ICONS.Food}
          >
            <Popup>
              <div style={{ fontFamily:'Inter,sans-serif', minWidth:180 }}>
                <div style={{ fontWeight:700, marginBottom:6 }}>
                  {r.resource_type === 'Food' ? '🍱' : r.resource_type === 'Medical' ? '💊' : '🏠'} {r.resource_type}
                </div>
                {r.provider_name && <div style={{ color:'#666', fontSize:'0.8rem', marginBottom:4 }}>By {r.provider_name}</div>}
                <div><b>Qty:</b> {r.quantity}</div>
                {r.description && <div style={{ fontSize:'0.82rem', color:'#555', margin:'4px 0' }}>{r.description}</div>}
                <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.78rem', color: timeLeft(r.expiry_timestamp) === 'Expired' ? '#ef4444' : '#22a' }}>
                  ⏱ {timeLeft(r.expiry_timestamp)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Help Requests */}
        {requests.map(req => (
          <Marker key={req.id}
            position={[req.location_coords.lat, req.location_coords.lng]}
            icon={REQUEST_ICON}
          >
            <Popup>
              <div style={{ fontFamily:'Inter,sans-serif', minWidth:180 }}>
                <div style={{ fontWeight:700, color:'#ef4444', marginBottom:6 }}>🆘 Help Needed</div>
                {req.seeker_name && <div style={{ color:'#666', fontSize:'0.8rem', marginBottom:4 }}>From: {req.seeker_name}</div>}
                <div><b>Needs:</b> {req.required_type}</div>
                {req.urgency && <div><b>Urgency:</b> <span style={{ color: req.urgency === 'Critical' ? '#ef4444' : '#888' }}>{req.urgency}</span></div>}
                {req.description && <div style={{ fontSize:'0.82rem', color:'#555', marginTop:4 }}>{req.description}</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 24, left: 16, zIndex: 1000,
        background: 'rgba(10,13,20,0.9)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10,
        padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {[
          { color:'#f97316', label:'Food Resource'     },
          { color:'#22c55e', label:'Medical Resource'  },
          { color:'#3b82f6', label:'Shelter Resource'  },
          { color:'#ef4444', label:'Help Request'      },
          { color:'#ef444440', label:'Surge Zone', dashed:true },
        ].map(l => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.75rem', color:'#94a3b8' }}>
            <div style={{
              width:10, height:10, borderRadius:'50%',
              background: l.color,
              border: l.dashed ? '2px dashed #ef4444' : 'none',
            }}/>
            {l.label}
          </div>
        ))}
      </div>

      {/* Surge count badge */}
      {surgeZones.length > 0 && (
        <div style={{
          position:'absolute', top:16, left:'50%', transform:'translateX(-50%)',
          zIndex:1000, background:'rgba(239,68,68,0.9)', borderRadius:999,
          padding:'6px 16px', display:'flex', alignItems:'center', gap:6,
          fontSize:'0.8rem', fontWeight:700, color:'#fff',
          boxShadow:'0 0 16px rgba(239,68,68,0.5)',
        }} className="animate-blink">
          <Flame size={14}/>
          {surgeZones.length} Surge Zone{surgeZones.length > 1 ? 's' : ''} Detected
        </div>
      )}
    </div>
  )
}
