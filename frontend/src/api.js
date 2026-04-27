import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Add a request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crisisflow_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => Promise.reject(error))

// ── Auth & Users ───────────────────────────
export const register     = (data) => api.post('/auth/register', data)
export const login        = (data) => {
  const formData = new URLSearchParams()
  formData.append('username', data.email)
  formData.append('password', data.password)
  return api.post('/auth/login', formData)
}
export const getMe        = ()     => api.get('/users/me')
export const getUser      = (id)   => api.get(`/users/${id}`)

// ── Resources ──────────────────────────────
export const createResource = (data)   => api.post('/resources', data)
export const listResources  = (status) => api.get('/resources', { params: { status } })
export const getResource    = (id)     => api.get(`/resources/${id}`)
export const deleteResource = (id)     => api.delete(`/resources/${id}`)

// ── Requests ───────────────────────────────
export const createRequest   = (data)      => api.post('/requests', data)
export const listRequests    = (status)    => api.get('/requests', { params: { status } })
export const assignRequest   = (id)        => api.patch(`/requests/${id}/assign`)
export const fulfillRequest  = (id)        => api.patch(`/requests/${id}/fulfill`)

// ── QR ─────────────────────────────────────
export const generateQR = (data) => api.post('/qr/generate', data)
export const verifyQR   = (data) => api.post('/qr/verify', data)

// ── Analytics ──────────────────────────────
export const getStats      = () => api.get('/stats')
export const getSurgeZones = () => api.get('/surge-zones')
