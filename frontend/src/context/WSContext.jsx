import { createContext, useContext, useEffect, useRef, useState } from 'react'

const WSContext = createContext(null)

export function WSProvider({ children }) {
  const [resources, setResources] = useState([])
  const [events,    setEvents]    = useState([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)

  useEffect(() => {
    function connect() {
      const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${wsProtocol}//${location.host}/ws/resources`)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        console.log('🔌  WS connected')
      }
      ws.onclose = () => {
        setConnected(false)
        console.log('🔴  WS disconnected – retrying in 3 s')
        setTimeout(connect, 3000)
      }
      ws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data)
          if (msg.event === 'init') {
            setResources(msg.resources)
          } else if (msg.event === 'new_resource') {
            setResources(prev => [msg.resource, ...prev])
            pushEvent({ type: 'resource', text: `New resource: ${msg.resource.resource_type}`, payload: msg.resource })
          } else if (msg.event === 'new_request') {
            pushEvent({ type: 'request', text: `Help needed: ${msg.request.required_type}`, payload: msg.request })
          } else if (msg.event === 'resource_claimed') {
            setResources(prev => prev.map(r =>
              r.id === msg.resource_id ? { ...r, status: 'Claimed' } : r
            ))
            pushEvent({ type: 'claim', text: `Resource claimed`, payload: msg })
          } else if (msg.event === 'resources_expired') {
            pushEvent({ type: 'expiry', text: `${msg.count} resource(s) expired`, payload: msg })
          }
        } catch (_) {}
      }
    }

    connect()
    return () => wsRef.current?.close()
  }, [])

  function pushEvent(ev) {
    setEvents(prev => [{ ...ev, id: Date.now(), ts: new Date() }, ...prev].slice(0, 50))
  }

  // Heartbeat ping every 25 s to keep connection alive
  useEffect(() => {
    const t = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN)
        wsRef.current.send('ping')
    }, 25000)
    return () => clearInterval(t)
  }, [])

  return (
    <WSContext.Provider value={{ resources, setResources, events, connected }}>
      {children}
    </WSContext.Provider>
  )
}

export const useWS = () => useContext(WSContext)
