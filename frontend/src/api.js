import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── Users ──────────────────────────────────
export const createUser   = (data) => api.post('/users', data)
export const getUser      = (id)   => api.get(`/users/${id}`)

// ── Resources ──────────────────────────────
export const createResource = (data)   => api.post('/resources', data)
export const listResources  = (status) => api.get('/resources', { params: { status } })
export const getResource    = (id)     => api.get(`/resources/${id}`)
export const deleteResource = (id)     => api.delete(`/resources/${id}`)

// ── Requests ───────────────────────────────
export const createRequest  = (data)   => api.post('/requests', data)
export const listRequests   = (status) => api.get('/requests', { params: { status } })

// ── QR ─────────────────────────────────────
export const generateQR = (data) => api.post('/qr/generate', data)
export const verifyQR   = (data) => api.post('/qr/verify', data)

// ── Surge ──────────────────────────────────
export const getSurgeZones = () => api.get('/surge-zones')
