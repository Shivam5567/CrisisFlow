"""
CrisisFlow — FastAPI main application.

Routes
------
  POST /api/users              – create user
  GET  /api/users/{id}         – get user
  POST /api/resources          – create resource
  GET  /api/resources          – list active resources
  GET  /api/resources/{id}     – get resource
  DELETE /api/resources/{id}   – delete resource
  POST /api/requests           – create help request
  GET  /api/requests           – list open requests
  POST /api/qr/generate        – generate QR hash for a resource
  POST /api/qr/verify          – verify QR hash → mark Claimed
  GET  /api/surge-zones        – hotspot detection
  WS   /ws/resources           – live resource feed
"""

import asyncio
import hashlib
import json
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import List

from bson import ObjectId
from dotenv import load_dotenv
from fastapi import (
    FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
)
from fastapi.middleware.cors import CORSMiddleware

from database import connect_db, close_db, get_resources_collection, get_requests_collection, get_users_collection
from models import (
    HelpRequestCreate, HelpRequestResponse,
    QRGenerateRequest, QRVerifyRequest,
    ResourceCreate, ResourceResponse,
    SurgeZone, LocationCoords,
    UserCreate, UserResponse,
)

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crisisflow")

# ─────────────────────────────────────────────
# App bootstrap
# ─────────────────────────────────────────────

app = FastAPI(
    title="CrisisFlow API",
    description="Real-Time Crisis Resource Optimizer",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        await connect_db()
    except Exception as e:
        logger.warning("MongoDB unavailable at startup (%s) — running in degraded mode", e)
    asyncio.create_task(expiry_checker())


@app.on_event("shutdown")
async def shutdown():
    await close_db()


# ─────────────────────────────────────────────
# WebSocket Connection Manager
# ─────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, message: dict):
        data = json.dumps(message, default=str)
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)


manager = ConnectionManager()


# ─────────────────────────────────────────────
# Background: Expiry Checker (runs every 60 s)
# ─────────────────────────────────────────────

async def expiry_checker():
    while True:
        try:
            now = datetime.now(timezone.utc)
            col = get_resources_collection()
            result = await col.update_many(
                {
                    "status": "Active",
                    "expiry_timestamp": {"$lt": now},
                },
                {"$set": {"status": "Expired"}},
            )
            if result.modified_count:
                logger.info("Expiry checker: expired %d resource(s)", result.modified_count)
                await manager.broadcast({"event": "resources_expired", "count": result.modified_count})
        except Exception as e:
            logger.error(f"Expiry checker error: {e}")
        await asyncio.sleep(60)


# ─────────────────────────────────────────────
# Helper: dict → response
# ─────────────────────────────────────────────

def _fix_id(doc: dict) -> dict:
    """Convert MongoDB _id ObjectId to str 'id'."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


# ─────────────────────────────────────────────
# ── USERS ────────────────────────────────────
# ─────────────────────────────────────────────

@app.post("/api/users", response_model=UserResponse, status_code=201, tags=["Users"])
async def create_user(payload: UserCreate):
    col  = get_users_collection()
    doc  = payload.model_dump()
    doc["created_at"] = datetime.utcnow()
    res  = await col.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return doc


@app.get("/api/users/{user_id}", response_model=UserResponse, tags=["Users"])
async def get_user(user_id: str):
    col = get_users_collection()
    doc = await col.find_one({"_id": ObjectId(user_id)})
    if not doc:
        raise HTTPException(404, "User not found")
    return _fix_id(doc)


# ─────────────────────────────────────────────
# ── RESOURCES ────────────────────────────────
# ─────────────────────────────────────────────

@app.post("/api/resources", response_model=ResourceResponse, status_code=201, tags=["Resources"])
async def create_resource(payload: ResourceCreate):
    col  = get_resources_collection()
    doc  = payload.model_dump()
    doc["status"]     = "Active"
    doc["qr_hash"]    = None
    doc["claimed_by"] = None
    doc["created_at"] = datetime.utcnow()
    res  = await col.insert_one(doc)
    doc["id"] = str(res.inserted_id)

    # push to WebSocket clients
    await manager.broadcast({"event": "new_resource", "resource": {**doc}})
    return doc


@app.get("/api/resources", response_model=List[ResourceResponse], tags=["Resources"])
async def list_resources(status: str = "Active"):
    col  = get_resources_collection()
    docs = await col.find({"status": status}).to_list(500)
    return [_fix_id(d) for d in docs]


@app.get("/api/resources/{resource_id}", response_model=ResourceResponse, tags=["Resources"])
async def get_resource(resource_id: str):
    col = get_resources_collection()
    doc = await col.find_one({"_id": ObjectId(resource_id)})
    if not doc:
        raise HTTPException(404, "Resource not found")
    return _fix_id(doc)


@app.delete("/api/resources/{resource_id}", tags=["Resources"])
async def delete_resource(resource_id: str):
    col = get_resources_collection()
    res = await col.delete_one({"_id": ObjectId(resource_id)})
    if res.deleted_count == 0:
        raise HTTPException(404, "Resource not found")
    return {"message": "Resource deleted"}


# ─────────────────────────────────────────────
# ── HELP REQUESTS ─────────────────────────────
# ─────────────────────────────────────────────

@app.post("/api/requests", response_model=HelpRequestResponse, status_code=201, tags=["Requests"])
async def create_request(payload: HelpRequestCreate):
    col  = get_requests_collection()
    doc  = payload.model_dump()
    doc["status"]      = "Open"
    doc["timestamp"]   = datetime.utcnow()
    doc["assigned_to"] = None
    res  = await col.insert_one(doc)
    doc["id"] = str(res.inserted_id)

    await manager.broadcast({"event": "new_request", "request": {**doc}})
    return doc


@app.get("/api/requests", response_model=List[HelpRequestResponse], tags=["Requests"])
async def list_requests(status: str = "Open"):
    col  = get_requests_collection()
    docs = await col.find({"status": status}).to_list(500)
    return [_fix_id(d) for d in docs]


@app.get("/api/requests/{request_id}", response_model=HelpRequestResponse, tags=["Requests"])
async def get_request(request_id: str):
    col = get_requests_collection()
    doc = await col.find_one({"_id": ObjectId(request_id)})
    if not doc:
        raise HTTPException(404, "Request not found")
    return _fix_id(doc)


@app.patch("/api/requests/{request_id}/assign", tags=["Requests"])
async def assign_request(request_id: str, volunteer_id: str = "volunteer"):
    """Volunteer accepts an open help request."""
    col = get_requests_collection()
    doc = await col.find_one({"_id": ObjectId(request_id)})
    if not doc:
        raise HTTPException(404, "Request not found")
    if doc["status"] != "Open":
        raise HTTPException(400, f"Request is already {doc['status']}")

    await col.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "Assigned", "assigned_to": volunteer_id}},
    )
    await manager.broadcast({
        "event": "request_assigned",
        "request_id": request_id,
        "volunteer_id": volunteer_id,
    })
    return {"message": "Request accepted", "request_id": request_id}


@app.patch("/api/requests/{request_id}/fulfill", tags=["Requests"])
async def fulfill_request(request_id: str):
    """Mark a request as fulfilled after delivery."""
    col = get_requests_collection()
    doc = await col.find_one({"_id": ObjectId(request_id)})
    if not doc:
        raise HTTPException(404, "Request not found")
    await col.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": "Fulfilled"}},
    )
    await manager.broadcast({"event": "request_fulfilled", "request_id": request_id})
    return {"message": "Request marked fulfilled", "request_id": request_id}


# ─────────────────────────────────────────────
# ── QR / VERIFICATION ─────────────────────────
# ─────────────────────────────────────────────

@app.post("/api/qr/generate", tags=["QR"])
async def generate_qr(payload: QRGenerateRequest):
    col = get_resources_collection()
    doc = await col.find_one({"_id": ObjectId(payload.resource_id)})
    if not doc:
        raise HTTPException(404, "Resource not found")
    if doc["status"] != "Active":
        raise HTTPException(400, f"Resource is {doc['status']} — cannot generate QR")

    raw      = f"{payload.resource_id}:{payload.claimer_id}:{secrets.token_hex(16)}"
    qr_hash  = hashlib.sha256(raw.encode()).hexdigest()

    await col.update_one(
        {"_id": ObjectId(payload.resource_id)},
        {"$set": {"qr_hash": qr_hash, "claimed_by": payload.claimer_id, "status": "Active"}},
    )
    return {"qr_hash": qr_hash, "resource_id": payload.resource_id}


@app.post("/api/qr/verify", tags=["QR"])
async def verify_qr(payload: QRVerifyRequest):
    col = get_resources_collection()
    doc = await col.find_one({"qr_hash": payload.qr_hash})
    if not doc:
        raise HTTPException(404, "Invalid or already-used QR code")
    if doc["status"] == "Claimed":
        raise HTTPException(400, "Resource already claimed")
    if doc["status"] == "Expired":
        raise HTTPException(400, "Resource is expired")

    await col.update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": "Claimed"}},
    )
    await manager.broadcast({"event": "resource_claimed", "resource_id": str(doc["_id"])})
    return {"message": "Resource successfully claimed", "resource_id": str(doc["_id"])}


# ─────────────────────────────────────────────
# ── SURGE DETECTION ───────────────────────────
# ─────────────────────────────────────────────

SURGE_RADIUS_DEG = 0.05   # ~5.5 km bounding box half-width
SURGE_MIN_COUNT  = 3      # minimum requests to qualify as hotspot
SURGE_WINDOW_HRS = 2


@app.get("/api/surge-zones", response_model=List[SurgeZone], tags=["Analytics"])
async def get_surge_zones():
    col      = get_requests_collection()
    cutoff   = datetime.utcnow() - timedelta(hours=SURGE_WINDOW_HRS)
    requests = await col.find(
        {"timestamp": {"$gte": cutoff}, "status": "Open"}
    ).to_list(1000)

    if not requests:
        return []

    # Simple bounding-box clustering
    clusters: list[dict] = []
    used = set()

    for i, req in enumerate(requests):
        if i in used:
            continue
        lat_i = req["location_coords"]["lat"]
        lng_i = req["location_coords"]["lng"]
        cluster_members = [req]
        used.add(i)

        for j, other in enumerate(requests):
            if j in used:
                continue
            lat_j = other["location_coords"]["lat"]
            lng_j = other["location_coords"]["lng"]
            if (abs(lat_i - lat_j) <= SURGE_RADIUS_DEG and
                    abs(lng_i - lng_j) <= SURGE_RADIUS_DEG):
                cluster_members.append(other)
                used.add(j)

        if len(cluster_members) >= SURGE_MIN_COUNT:
            avg_lat = sum(m["location_coords"]["lat"] for m in cluster_members) / len(cluster_members)
            avg_lng = sum(m["location_coords"]["lng"] for m in cluster_members) / len(cluster_members)
            urgencies = list({m.get("urgency", "Normal") for m in cluster_members})
            clusters.append(
                SurgeZone(
                    center=LocationCoords(lat=avg_lat, lng=avg_lng),
                    request_count=len(cluster_members),
                    urgency_levels=urgencies,
                    radius_km=SURGE_RADIUS_DEG * 111,
                )
            )

    return clusters


# ─────────────────────────────────────────────
# ── WEBSOCKET ─────────────────────────────────
# ─────────────────────────────────────────────

@app.websocket("/ws/resources")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    logger.info("WS client connected. Total: %d", len(manager.active))
    try:
        # Send current active resources on connect (graceful if DB unavailable)
        try:
            col  = get_resources_collection()
            docs = await col.find({"status": "Active"}).to_list(200)
            payload = [_fix_id(d) for d in docs]
        except Exception as db_err:
            logger.warning("WS init DB error (MongoDB down?): %s", db_err)
            payload = []

        await ws.send_text(json.dumps({"event": "init", "resources": payload}, default=str))

        while True:
            await ws.receive_text()   # keep-alive / heartbeat ping
    except WebSocketDisconnect:
        manager.disconnect(ws)
        logger.info("WS client disconnected. Total: %d", len(manager.active))
    except Exception as e:
        logger.error("WS unexpected error: %s", e)
        try:
            manager.disconnect(ws)
        except Exception:
            pass


# ─────────────────────────────────────────────
# ── ANALYTICS / STATS ─────────────────────────
# ─────────────────────────────────────────────

@app.get("/api/stats", tags=["Analytics"])
async def get_stats():
    """Aggregated counts for the analytics dashboard."""
    r_col = get_resources_collection()
    q_col = get_requests_collection()

    try:
        # Resource counts
        r_active  = await r_col.count_documents({"status": "Active"})
        r_claimed = await r_col.count_documents({"status": "Claimed"})
        r_expired = await r_col.count_documents({"status": "Expired"})

        r_food    = await r_col.count_documents({"status": "Active", "resource_type": "Food"})
        r_medical = await r_col.count_documents({"status": "Active", "resource_type": "Medical"})
        r_shelter = await r_col.count_documents({"status": "Active", "resource_type": "Shelter"})

        # Request counts
        q_open      = await q_col.count_documents({"status": "Open"})
        q_assigned  = await q_col.count_documents({"status": "Assigned"})
        q_fulfilled = await q_col.count_documents({"status": "Fulfilled"})

        q_critical = await q_col.count_documents({"urgency": "Critical"})
        q_high     = await q_col.count_documents({"urgency": "High"})
        q_normal   = await q_col.count_documents({"urgency": "Normal"})
        q_low      = await q_col.count_documents({"urgency": "Low"})

        # Claimed today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        claimed_today = await r_col.count_documents({
            "status": "Claimed",
            "created_at": {"$gte": today_start},
        })

    except Exception:
        # MongoDB unavailable — return zeroes
        r_active = r_claimed = r_expired = 0
        r_food = r_medical = r_shelter = 0
        q_open = q_assigned = q_fulfilled = 0
        q_critical = q_high = q_normal = q_low = 0
        claimed_today = 0

    return {
        "resources": {
            "active":  r_active,
            "claimed": r_claimed,
            "expired": r_expired,
            "claimed_today": claimed_today,
            "by_type": [
                {"name": "Food",    "value": r_food},
                {"name": "Medical", "value": r_medical},
                {"name": "Shelter", "value": r_shelter},
            ],
            "by_status": [
                {"name": "Active",  "value": r_active},
                {"name": "Claimed", "value": r_claimed},
                {"name": "Expired", "value": r_expired},
            ],
        },
        "requests": {
            "open":      q_open,
            "assigned":  q_assigned,
            "fulfilled": q_fulfilled,
            "by_urgency": [
                {"name": "Critical", "value": q_critical},
                {"name": "High",     "value": q_high},
                {"name": "Normal",   "value": q_normal},
                {"name": "Low",      "value": q_low},
            ],
        },
    }


# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow()}
