from datetime import datetime, timedelta
from typing import Optional, List
import os

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId

from database import get_users_collection
from models import UserDB, UserRole, UserResponse

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────

# In production, load this from environment variables
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-crisisflow-key-for-development")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ──────────────────────────────────────────────
# Dependencies
# ──────────────────────────────────────────────

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    col = get_users_collection()
    user_doc = await col.find_one({"_id": ObjectId(user_id)})
    if user_doc is None:
        raise credentials_exception
    
    # Return UserResponse (doesn't expose password_hash)
    user_doc["id"] = str(user_doc["_id"])
    return UserResponse(**user_doc)

def require_role(allowed_roles: List[UserRole]):
    """
    Factory dependency to ensure the current user has one of the required roles.
    Usage: @app.post(..., dependencies=[Depends(require_role([UserRole.provider]))])
    """
    async def role_checker(current_user: UserResponse = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required role: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker
