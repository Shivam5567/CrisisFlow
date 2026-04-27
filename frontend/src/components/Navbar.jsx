import { useState } from 'react'
import { Activity, Zap, Menu, X, Radio, LogIn, LogOut, User } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useWS } from '../context/WSContext'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'

export default function Navbar({ activeView, setActiveView }) {
  const { connected } = useWS()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAuth, setShowAuth] = useState(false)

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
      <div className="desktop-nav">
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

      {/* Status & Auth indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
          <Radio size={14} color={connected ? '#22c55e' : '#ef4444'}
            className={connected ? 'animate-blink' : ''} />
          <span style={{ fontSize: '0.78rem', color: connected ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="desktop-profile-info">
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{user.name}</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>{user.role}</span>
            </div>
            <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={logout} title="Logout">
              <LogOut size={16}/>
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setShowAuth(true)}>
            <LogIn size={16}/> Login
          </button>
        )}

        {/* Mobile menu toggle */}
        <button className="btn btn-ghost mobile-nav-toggle" style={{ padding: '6px 8px' }}
          onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={18}/> : <Menu size={18}/>}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && createPortal(
        <div style={{
          position: 'fixed', top: 60, left: 0, right: 0, zIndex: 1000,
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
        </div>,
        document.body
      )}

      {showAuth && createPortal(
        <AuthModal onClose={() => setShowAuth(false)} />,
        document.body
      )}
    </nav>
  )
}
