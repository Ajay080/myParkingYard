from fastapi import APIRouter, HTTPException, status, Depends
from app.models import VehicleCreate, VehicleUpdate, VehicleResponse, TokenData
from app.database import db
from app.dependencies import get_current_user, get_current_admin
from typing import List

router = APIRouter(prefix="/api/vehicles", tags=["vehicles"])

@router.post("/", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(vehicle: VehicleCreate, current_user: TokenData = Depends(get_current_user)):
    """Create a new vehicle"""
    # Check if user exists
    user_exists = await db.fetch_one("SELECT id FROM users WHERE id = $1", vehicle.user_id)
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if number plate already exists
    existing = await db.fetch_one(
        "SELECT id FROM vehicles WHERE number_plate = $1",
        vehicle.number_plate
    )
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with number plate '{vehicle.number_plate}' already exists"
        )
    
    try:
        result = await db.fetch_one(
            """
            INSERT INTO vehicles (user_id, number_plate, type, model)
            VALUES ($1, $2, $3, $4)
            RETURNING id, user_id, number_plate, type, model, created_at, updated_at
            """,
            vehicle.user_id, vehicle.number_plate, vehicle.type.value, vehicle.model
        )
        
        return VehicleResponse(
            id=str(result["id"]),
            user_id=str(result["user_id"]),
            number_plate=result["number_plate"],
            type=result["type"],
            model=result["model"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create vehicle: {str(e)}"
        )

@router.get("/", response_model=List[VehicleResponse])
async def get_all_vehicles(user_id: str = None, current_user: TokenData = Depends(get_current_user)):
    """Get all vehicles, optionally filter by user_id"""
    if user_id:
        vehicles = await db.fetch_all(
            "SELECT id, user_id, number_plate, type, model, created_at, updated_at FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC",
            user_id
        )
    else:
        vehicles = await db.fetch_all(
            "SELECT id, user_id, number_plate, type, model, created_at, updated_at FROM vehicles ORDER BY created_at DESC"
        )
    
    return [VehicleResponse(
        id=str(vehicle["id"]),
        user_id=str(vehicle["user_id"]),
        number_plate=vehicle["number_plate"],
        type=vehicle["type"],
        model=vehicle["model"],
        created_at=vehicle["created_at"],
        updated_at=vehicle["updated_at"]
    ) for vehicle in vehicles]

@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle_by_id(vehicle_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get vehicle by ID"""
    vehicle = await db.fetch_one(
        "SELECT id, user_id, number_plate, type, model, created_at, updated_at FROM vehicles WHERE id = $1",
        vehicle_id
    )
    
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    
    return VehicleResponse(
        id=str(vehicle["id"]),
        user_id=str(vehicle["user_id"]),
        number_plate=vehicle["number_plate"],
        type=vehicle["type"],
        model=vehicle["model"],
        created_at=vehicle["created_at"],
        updated_at=vehicle["updated_at"]
    )

@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: str,
    vehicle_update: VehicleUpdate,
    current_user: TokenData = Depends(get_current_user)
):
    """Update vehicle"""
    # Check if number plate is being changed and if it conflicts with existing vehicle
    if vehicle_update.number_plate is not None:
        existing_vehicle = await db.fetch_one(
            "SELECT id FROM vehicles WHERE number_plate = $1 AND id != $2",
            vehicle_update.number_plate, vehicle_id
        )
        
        if existing_vehicle:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle with number plate '{vehicle_update.number_plate}' already exists"
            )
    
    updates = []
    values = []
    param_count = 1
    
    if vehicle_update.number_plate is not None:
        updates.append(f"number_plate = ${param_count}")
        values.append(vehicle_update.number_plate)
        param_count += 1
    
    if vehicle_update.type is not None:
        updates.append(f"type = ${param_count}")
        values.append(vehicle_update.type.value)
        param_count += 1
    
    if vehicle_update.model is not None:
        updates.append(f"model = ${param_count}")
        values.append(vehicle_update.model)
        param_count += 1
    
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    updates.append(f"updated_at = NOW()")
    values.append(vehicle_id)
    
    query = f"""
        UPDATE vehicles
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING id, user_id, number_plate, type, model, created_at, updated_at
    """
    
    try:
        result = await db.fetch_one(query, *values)
        
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
        
        return VehicleResponse(
            id=str(result["id"]),
            user_id=str(result["user_id"]),
            number_plate=result["number_plate"],
            type=result["type"],
            model=result["model"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update vehicle: {str(e)}"
        )

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vehicle(vehicle_id: str, current_user: TokenData = Depends(get_current_user)):
    """Delete vehicle"""
    result = await db.execute("DELETE FROM vehicles WHERE id = $1", vehicle_id)
    
    if result == "DELETE 0":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
