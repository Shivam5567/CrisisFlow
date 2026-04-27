# CrisisFlow — Real-Time Crisis Resource Optimizer

## Project Structure

```
Crisis Manager/
├── backend/
│   ├── .env
│   ├── main.py        ← FastAPI app (all routes, WebSocket, background tasks)
│   ├── models.py      ← Pydantic schemas
│   └── database.py    ← Motor (async MongoDB) connection
└── frontend/
    ├── vite.config.js
    └── src/
        ├── api.js                    ← Axios API client
        ├── App.jsx                   ← Root layout
        ├── index.css                 ← Global styles / design tokens
        ├── context/
        │   └── WSContext.jsx         ← WebSocket provider (auto-reconnect)
        ├── components/
        │   ├── Navbar.jsx            ← Sticky glassmorphism nav
        │   ├── LiveFeed.jsx          ← Real-time event sidebar
        │   ├── LiveMap.jsx           ← react-leaflet map
        │   ├── AddResourceModal.jsx  ← Provider form
        │   └── RequestHelpModal.jsx  ← Seeker form
        └── views/
            ├── ResourcesView.jsx     ← CRUD table w/ filters
            ├── RequestsView.jsx      ← Help requests list
            └── QRView.jsx            ← QR generate + verify
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- **MongoDB** running locally on `mongodb://localhost:27017`
  - Install: https://www.mongodb.com/try/download/community
  - Or run via Docker: `docker run -d -p 27017:27017 mongo`

## Running

### Backend (Terminal 1)
```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**

## API Docs
FastAPI auto-generates docs at **http://localhost:8000/docs**

## Key Features
| Feature | Implementation |
|---------|---------------|
| Live resources on map | WebSocket push from FastAPI |
| Resource expiry | Background `asyncio` task, runs every 60 s |
| QR verification | SHA-256 hash, single-use claim endpoint |
| Surge detection | Bounding-box clustering on recent `Open` requests |
| Dark map | CartoDB Dark Matter tile layer |
