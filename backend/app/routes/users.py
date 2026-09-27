from fastapi import APIRouter, HTTPException, status, Depends
from app.models import UserCreate, UserLogin, UserResponse, Token, UserUpdate, TokenData, UserProfileUpdate, PasswordChange
from app.auth import hash_password, verify_password, create_access_token
from app.database import db
from app.dependencies import get_current_user, get_current_admin
from typing import List

router = APIRouter(prefix="/api/users", tags=["users"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate):
    """Register a new user"""
    # Check if email already exists
    existing_email = await db.fetch_one(
        "SELECT id FROM users WHERE email = $1",
        user.email
    )
    
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email '{user.email}' already exists"
        )
    
    # Check if phone already exists
    existing_phone = await db.fetch_one(
        "SELECT id FROM users WHERE phone = $1",
        user.phone
    )
    
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with phone number '{user.phone}' already exists"
        )
    
    try:
        # Hash password
        hashed_password = hash_password(user.password)
        
        # Insert user
        result = await db.fetch_one(
            """
            INSERT INTO users (name, email, phone, password, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, email, phone, role, created_at, updated_at
            """,
            user.name, user.email, user.phone, hashed_password, user.role.value
        )
        
        return UserResponse(
            id=str(result["id"]),
            name=result["name"],
            email=result["email"],
            phone=result["phone"],
            role=result["role"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register user: {str(e)}"
        )

@router.post("/login", response_model=Token)
async def login_user(credentials: UserLogin):
    """Login user and return JWT token"""
    # Find user by email
    user = await db.fetch_one(
        "SELECT id, email, password, role FROM users WHERE email = $1",
        credentials.email
    )
    
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"user_id": str(user["id"]), "email": user["email"], "role": user["role"]}
    )
    
    return Token(access_token=access_token)

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    """Get current user information"""
    user = await db.fetch_one(
        "SELECT id, name, email, phone, role, created_at, updated_at FROM users WHERE id = $1",
        current_user.user_id
    )
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return UserResponse(
        id=str(user["id"]),
        name=user["name"],
        email=user["email"],
        phone=user["phone"],
        role=user["role"],
        created_at=user["created_at"],
        updated_at=user["updated_at"]
    )

@router.get("/", response_model=List[UserResponse])
async def get_all_users(current_user: TokenData = Depends(get_current_admin)):
    """Get all users (admin only)"""
    users = await db.fetch_all(
        "SELECT id, name, email, phone, role, created_at, updated_at FROM users ORDER BY created_at DESC"
    )
    
    return [UserResponse(
        id=str(user["id"]),
        name=user["name"],
        email=user["email"],
        phone=user["phone"],
        role=user["role"],
        created_at=user["created_at"],
        updated_at=user["updated_at"]
    ) for user in users]

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str, current_user: TokenData = Depends(get_current_admin)):
    """Get user by ID (admin only)"""
    user = await db.fetch_one(
        "SELECT id, name, email, phone, role, created_at, updated_at FROM users WHERE id = $1",
        user_id
    )
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    return UserResponse(
        id=str(user["id"]),
        name=user["name"],
        email=user["email"],
        phone=user["phone"],
        role=user["role"],
        created_at=user["created_at"],
        updated_at=user["updated_at"]
    )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: TokenData = Depends(get_current_admin)
):
    """Update user (admin only)"""
    # Check if phone is being changed and if it conflicts with existing user
    if user_update.phone is not None:
        existing_phone = await db.fetch_one(
            "SELECT id FROM users WHERE phone = $1 AND id != $2",
            user_update.phone, user_id
        )
        
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with phone number '{user_update.phone}' already exists"
            )
    
    # Build dynamic update query
    updates = []
    values = []
    param_count = 1
    
    if user_update.name is not None:
        updates.append(f"name = ${param_count}")
        values.append(user_update.name)
        param_count += 1
    
    if user_update.phone is not None:
        updates.append(f"phone = ${param_count}")
        values.append(user_update.phone)
        param_count += 1
    
    if user_update.role is not None:
        updates.append(f"role = ${param_count}")
        values.append(user_update.role.value)
        param_count += 1
    
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    updates.append(f"updated_at = NOW()")
    values.append(user_id)
    
    query = f"""
        UPDATE users
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING id, name, email, phone, role, created_at, updated_at
    """
    
    try:
        result = await db.fetch_one(query, *values)
        
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        return UserResponse(
            id=str(result["id"]),
            name=result["name"],
            email=result["email"],
            phone=result["phone"],
            role=result["role"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: str, current_user: TokenData = Depends(get_current_admin)):
    """Delete user (admin only)"""
    result = await db.execute("DELETE FROM users WHERE id = $1", user_id)
    
    if result == "DELETE 0":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

@router.put("/me/profile", response_model=UserResponse)
async def update_my_profile(
    profile_update: UserProfileUpdate,
    current_user: TokenData = Depends(get_current_user)
):
    """Update current user's profile"""
    # Check if phone is being changed and if it conflicts with existing user
    if profile_update.phone is not None:
        existing_phone = await db.fetch_one(
            "SELECT id FROM users WHERE phone = $1 AND id != $2",
            profile_update.phone, current_user.user_id
        )
        
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with phone number '{profile_update.phone}' already exists"
            )
    
    # Build dynamic update query
    updates = []
    values = []
    param_count = 1
    
    if profile_update.name is not None:
        updates.append(f"name = ${param_count}")
        values.append(profile_update.name)
        param_count += 1
    
    if profile_update.phone is not None:
        updates.append(f"phone = ${param_count}")
        values.append(profile_update.phone)
        param_count += 1
    
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    updates.append(f"updated_at = NOW()")
    values.append(current_user.user_id)
    
    query = f"""
        UPDATE users
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING id, name, email, phone, role, created_at, updated_at
    """
    
    try:
        result = await db.fetch_one(query, *values)
        
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        return UserResponse(
            id=str(result["id"]),
            name=result["name"],
            email=result["email"],
            phone=result["phone"],
            role=result["role"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )

@router.put("/me/password", status_code=status.HTTP_200_OK)
async def change_my_password(
    password_data: PasswordChange,
    current_user: TokenData = Depends(get_current_user)
):
    """Change current user's password"""
    # Get current user's password hash
    user = await db.fetch_one(
        "SELECT password FROM users WHERE id = $1",
        current_user.user_id
    )
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # Verify current password
    if not verify_password(password_data.current_password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Hash new password
    new_hashed_password = hash_password(password_data.new_password)
    
    # Update password
    try:
        await db.execute(
            "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
            new_hashed_password, current_user.user_id
        )
        
        return {"message": "Password changed successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to change password: {str(e)}"
        )
