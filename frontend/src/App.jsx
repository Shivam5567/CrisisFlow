import { useState } from 'react'
import { WSProvider, useWS } from './context/WSContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar            from './components/Navbar'
import LiveFeed          from './components/LiveFeed'
import LiveMap           from './components/LiveMap'
import AddResourceModal  from './components/AddResourceModal'
import RequestHelpModal  from './components/RequestHelpModal'
import ResourcesView     from './views/ResourcesView'
import RequestsView      from './views/RequestsView'
import QRView            from './views/QRView'
import DashboardView     from './views/DashboardView'
import { Plus, AlertCircle } from 'lucide-react'

function Dashboard() {
  const { resources } = useWS()
  const { user } = useAuth()
  const [view,           setView]           = useState('map')
  const [showAddRes,     setShowAddRes]     = useState(false)
  const [showReqHelp,    setShowReqHelp]    = useState(false)
  const [clickedCoords,  setClickedCoords]  = useState(null)

  const isMapView = view === 'map'

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
      <Navbar activeView={view} setActiveView={setView} />

      {/* FABs – always visible, restricted by role */}
      <div style={{
        position:'fixed', bottom:28, right:isMapView ? 320 : 28,
        zIndex:500, display:'flex', flexDirection:'column', gap:10,
        transition:'right 0.3s ease',
      }}>
        {user?.role === 'Provider' && (
          <button className="btn btn-primary"
            style={{ borderRadius:'999px', padding:'12px 20px',
              boxShadow:'0 4px 20px rgba(249,115,22,0.4)', fontSize:'0.85rem' }}
            onClick={() => setShowAddRes(true)}>
            <Plus size={16}/> Add Resource
          </button>
        )}
        {user?.role === 'Seeker' && (
          <button className="btn btn-danger"
            style={{ borderRadius:'999px', padding:'12px 20px',
              boxShadow:'0 4px 20px rgba(239,68,68,0.4)', fontSize:'0.85rem' }}
            onClick={() => setShowReqHelp(true)}>
            <AlertCircle size={16}/> Request Help
          </button>
        )}
      </div>

      {/* Main content area */}
      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <main style={{ flex:1, overflow:'auto', position:'relative' }}>
          {view === 'dashboard' && <DashboardView />}
          {view === 'map' && (
            <LiveMap
              resources={resources}
              onMapClick={coords => setClickedCoords(coords)}
            />
          )}
          {view === 'resources' && <ResourcesView />}
          {view === 'requests'  && <RequestsView  />}
          {view === 'qr'        && <QRView         />}
        </main>

        {/* Live feed sidebar – only on map view */}
        {isMapView && <LiveFeed resources={resources}/>}
      </div>

      {/* Modals */}
      {showAddRes && (
        <AddResourceModal
          onClose={() => setShowAddRes(false)}
          onSuccess={() => {}}
          userLocation={clickedCoords}
        />
      )}
      {showReqHelp && (
        <RequestHelpModal
          onClose={() => setShowReqHelp(false)}
          onSuccess={() => {}}
          userLocation={clickedCoords}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <WSProvider>
        <Dashboard />
      </WSProvider>
    </AuthProvider>
  )
}
