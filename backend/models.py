"""
CrisisFlow — Pydantic models (MongoDB schemas).
All ObjectId fields are serialised as plain strings for JSON transport.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List

from bson import ObjectId
from pydantic import BaseModel, Field, model_validator


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

class PyObjectId(str):
    """Custom type so Pydantic v2 can coerce ObjectId ↔ str."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return str(v)
        if ObjectId.is_valid(v):
            return str(v)
        raise ValueError(f"Invalid ObjectId: {v}")

    @classmethod
    def __get_pydantic_core_schema__(cls, source, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_plain_validator_function(cls.validate)


class LocationCoords(BaseModel):
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class UserRole(str, Enum):
    provider  = "Provider"
    seeker    = "Seeker"
    volunteer = "Volunteer"


class ResourceType(str, Enum):
    food    = "Food"
    medical = "Medical"
    shelter = "Shelter"


class ResourceStatus(str, Enum):
    active  = "Active"
    claimed = "Claimed"
    expired = "Expired"


class RequestStatus(str, Enum):
    open      = "Open"
    assigned  = "Assigned"
    fulfilled = "Fulfilled"


# ──────────────────────────────────────────────
# User
# ──────────────────────────────────────────────

class UserCreate(BaseModel):
    name:            str
    role:            UserRole
    location_coords: LocationCoords
    email:           str
    password:        str
    phone:           Optional[str] = None


class UserDB(BaseModel):
    id:              Optional[PyObjectId] = Field(default=None, alias="_id")
    name:            str
    role:            UserRole
    location_coords: LocationCoords
    email:           str
    password_hash:   str
    phone:           Optional[str] = None
    created_at:      datetime = Field(default_factory=datetime.utcnow)

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class UserResponse(BaseModel):
    id:              str
    name:            str
    role:            UserRole
    location_coords: LocationCoords
    email:           str
    phone:           Optional[str] = None
    created_at:      datetime

    model_config = {"populate_by_name": True}


class UserLogin(BaseModel):
    email:    str
    password: str


class Token(BaseModel):
    access_token: str
    token_type:   str


# ──────────────────────────────────────────────
# Resource
# ──────────────────────────────────────────────

class ResourceCreate(BaseModel):
    provider_id:       str
    resource_type:     ResourceType
    location_coords:   LocationCoords
    quantity:          int          = Field(..., ge=1)
    expiry_timestamp:  datetime
    description:       Optional[str] = None
    provider_name:     Optional[str] = None


class ResourceDB(ResourceCreate):
    id:         Optional[PyObjectId] = Field(default=None, alias="_id")
    status:     ResourceStatus       = ResourceStatus.active
    qr_hash:    Optional[str]        = None
    created_at: datetime             = Field(default_factory=datetime.utcnow)
    claimed_by: Optional[str]        = None

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class ResourceResponse(ResourceCreate):
    id:         str
    status:     ResourceStatus
    qr_hash:    Optional[str]
    created_at: datetime
    claimed_by: Optional[str] = None

    model_config = {"populate_by_name": True}


# ──────────────────────────────────────────────
# Request (Help Request)
# ──────────────────────────────────────────────

class HelpRequestCreate(BaseModel):
    seeker_id:       str
    required_type:   ResourceType
    location_coords: LocationCoords
    description:     Optional[str] = None
    seeker_name:     Optional[str] = None
    urgency:         Optional[str] = "Normal"   # Low | Normal | High | Critical


class HelpRequestDB(HelpRequestCreate):
    id:          Optional[PyObjectId] = Field(default=None, alias="_id")
    status:      RequestStatus        = RequestStatus.open
    timestamp:   datetime             = Field(default_factory=datetime.utcnow)
    assigned_to: Optional[str]        = None   # resource_id or volunteer_id

    model_config = {"populate_by_name": True, "arbitrary_types_allowed": True}


class HelpRequestResponse(HelpRequestCreate):
    id:          str
    status:      RequestStatus
    timestamp:   datetime
    assigned_to: Optional[str] = None

    model_config = {"populate_by_name": True}


# ──────────────────────────────────────────────
# QR / Verification
# ──────────────────────────────────────────────

class QRGenerateRequest(BaseModel):
    resource_id: str


class QRVerifyRequest(BaseModel):
    qr_hash: str


# ──────────────────────────────────────────────
# Surge Zone (output only)
# ──────────────────────────────────────────────

class SurgeZone(BaseModel):
    center:         LocationCoords
    request_count:  int
    urgency_levels: List[str]
    radius_km:      float = 1.0
