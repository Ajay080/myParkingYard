from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth import decode_access_token
from app.models import TokenData, UserRole
from app.database import db
from typing import Optional

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if payload is None:
        raise credentials_exception
    
    user_id: str = payload.get("user_id")
    email: str = payload.get("email")
    role: str = payload.get("role")
    
    if user_id is None or email is None:
        raise credentials_exception
    
    # Verify user exists in database
    user = await db.fetch_one(
        "SELECT id, email, role FROM users WHERE id = $1",
        user_id
    )
    
    if user is None:
        raise credentials_exception
    
    return TokenData(user_id=str(user["id"]), email=user["email"], role=user["role"])

async def get_current_admin(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Require admin or superadmin role"""
    if current_user.role not in [UserRole.admin.value, UserRole.superadmin.value]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

async def get_current_superadmin(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Require superadmin role"""
    if current_user.role != UserRole.superadmin.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user
