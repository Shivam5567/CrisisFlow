import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { X, AlertCircle } from 'lucide-react'

export default function AuthModal({ onClose }) {
  const { login, register } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('Seeker')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
        onClose()
      } else {
        // Get user location for registration
        let coords = { lat: 0, lng: 0 }
        try {
          coords = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              (err) => reject(err),
              { timeout: 5000 }
            )
          })
        } catch (err) {
          console.warn("Could not get location, using default 0,0")
        }

        await register(name, role, email, password, coords)
        onClose()
      }
    } catch (err) {
      setError(err.response?.data?.detail ?? (isLogin ? 'Login failed' : 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }} className="animate-fade-up">
      <div className="glass" style={{
        width: '100%', maxWidth: 400, padding: 24, borderRadius: 16,
        position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <button className="btn btn-ghost" style={{ position: 'absolute', top: 16, right: 16, padding: 6 }}
          onClick={onClose}>
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 20 }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '10px 14px',
            borderRadius: 8, fontSize: '0.85rem', display: 'flex', gap: 8, alignItems: 'center',
            marginBottom: 16
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!isLogin && (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Full Name
                </label>
                <input className="input" placeholder="Your Name"
                  value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Account Type (Role)
                </label>
                <select className="input" value={role} onChange={e => setRole(e.target.value)} required>
                  <option value="Seeker">Seeker (I need help)</option>
                  <option value="Volunteer">Volunteer (I want to help deliver)</option>
                  <option value="Provider">Provider (I have resources to give)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Email Address
            </label>
            <input className="input" type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Password
            </label>
            <input className="input" type="password" placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: 10, padding: 12 }}>
            {loading ? 'Please wait...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button style={{ background: 'none', border: 'none', color: '#f97316', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => { setIsLogin(!isLogin); setError('') }}>
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>
      </div>
    </div>
  )
}
