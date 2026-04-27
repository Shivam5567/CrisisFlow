/**
 * LocationPickerMap — a small interactive Leaflet map embedded inside modals.
 * User clicks anywhere on the map to drop a pin; onPick(lat, lng) is called.
 */
import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Vite asset paths for default markers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const PIN_ICON = L.divIcon({
  className: '',
  html: `<div style="
    width:28px; height:28px;
    background:#f97316; border-radius:50% 50% 50% 0;
    transform:rotate(-45deg); border:2px solid #fff;
    box-shadow:0 2px 8px rgba(249,115,22,0.6);
  "></div>`,
  iconSize:   [28, 28],
  iconAnchor: [14, 28],
})

export default function LocationPickerMap({ lat, lng, onPick }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)
  const markerRef    = useRef(null)

  useEffect(() => {
    if (mapRef.current) return // already initialised

    const map = L.map(containerRef.current, {
      center: [lat || 20.5937, lng || 78.9629],
      zoom:   lat ? 12 : 5,
      zoomControl: true,
    })
    mapRef.current = map

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '© CARTO' }
    ).addTo(map)

    // place initial pin if coords exist
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon: PIN_ICON }).addTo(map)
    }

    map.on('click', (e) => {
      const { lat: clat, lng: clng } = e.latlng
      if (markerRef.current) {
        markerRef.current.setLatLng([clat, clng])
      } else {
        markerRef.current = L.marker([clat, clng], { icon: PIN_ICON }).addTo(map)
      }
      onPick(parseFloat(clat.toFixed(6)), parseFloat(clng.toFixed(6)))
    })

    return () => { map.remove(); mapRef.current = null }
  }, []) // run once

  // Sync external lat/lng → marker position (e.g. user typed in the input)
  useEffect(() => {
    if (!mapRef.current || !lat || !lng) return
    const pos = [parseFloat(lat), parseFloat(lng)]
    if (markerRef.current) {
      markerRef.current.setLatLng(pos)
    } else {
      markerRef.current = L.marker(pos, { icon: PIN_ICON }).addTo(mapRef.current)
    }
  }, [lat, lng])

  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden',
      border: '1px solid rgba(249,115,22,0.3)', height: 200 }}>
      <div ref={containerRef} style={{ height: '100%', width: '100%' }} />
      <div style={{
        position: 'absolute', top: 8, left: 8, zIndex: 1000,
        background: 'rgba(10,13,20,0.85)', backdropFilter: 'blur(6px)',
        borderRadius: 6, padding: '4px 10px',
        fontSize: '0.72rem', color: '#94a3b8', pointerEvents: 'none',
      }}>
        Click map to place pin
      </div>
    </div>
  )
}
