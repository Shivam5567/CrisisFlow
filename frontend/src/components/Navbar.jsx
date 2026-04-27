import { useState } from 'react'
import { Activity, Zap, Menu, X, Radio } from 'lucide-react'
import { useWS } from '../context/WSContext'

export default function Navbar({ activeView, setActiveView }) {
  const { connected } = useWS()
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'Dashboard'  },
    { id: 'map',       label: 'Live Map'   },
    { id: 'resources', label: 'Resources'  },
    { id: 'requests',  label: 'Requests'   },
    { id: 'qr',        label: 'QR Verify'  },
  ]

  return (
    <nav style={{
      background: 'rgba(10,13,20,0.9)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.07)',
      position: 'sticky', top: 0, zIndex: 100,
      padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 60,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: 'linear-gradient(135deg, #f97316, #ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 14px rgba(249,115,22,0.4)',
        }}>
          <Zap size={18} color="#fff" fill="#fff" />
        </div>
        <div>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
            Crisis<span style={{ color: '#f97316' }}>Flow</span>
          </span>
          <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: -2 }}>
            Resource Optimizer
          </div>
        </div>
      </div>

      {/* Desktop nav */}
      <div style={{ display: 'flex', gap: 4 }} className="desktop-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className="btn"
            style={{
              background: activeView === item.id ? 'rgba(249,115,22,0.15)' : 'transparent',
              color: activeView === item.id ? '#f97316' : '#94a3b8',
              padding: '6px 14px',
              borderRadius: 8,
              border: activeView === item.id ? '1px solid rgba(249,115,22,0.3)' : '1px solid transparent',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Status indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Radio size={14} color={connected ? '#22c55e' : '#ef4444'}
            className={connected ? 'animate-blink' : ''} />
          <span style={{ fontSize: '0.78rem', color: connected ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
        {/* Mobile menu toggle */}
        <button className="btn btn-ghost" style={{ padding: '6px 8px' }}
          onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: 60, left: 0, right: 0,
          background: 'rgba(10,13,20,0.97)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          padding: '12px 24px', display: 'flex', flexDirection: 'column', gap: 4,
        }} className="animate-fade-up">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id); setMenuOpen(false) }}
              className="btn"
              style={{
                justifyContent: 'flex-start',
                color: activeView === item.id ? '#f97316' : '#94a3b8',
                background: activeView === item.id ? 'rgba(249,115,22,0.1)' : 'transparent',
              }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}
