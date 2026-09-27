from fastapi import APIRouter, HTTPException, status, Depends
from app.models import DeviceCreate, DeviceUpdate, DeviceResponse, TokenData
from app.database import db
from app.dependencies import get_current_user, get_current_admin
from typing import List

router = APIRouter(prefix="/api/devices", tags=["devices"])

@router.post("/", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_device(device: DeviceCreate, current_user: TokenData = Depends(get_current_admin)):
    """Create a new device (admin only)"""
    # Check if zone exists
    zone_exists = await db.fetch_one("SELECT id FROM zones WHERE id = $1", device.zone_id)
    if not zone_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    
    # Check if device with same name already exists in this zone
    existing_device = await db.fetch_one(
        "SELECT id FROM devices WHERE zone_id = $1 AND name = $2",
        device.zone_id, device.name
    )
    
    if existing_device:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device with name '{device.name}' already exists in this zone"
        )
    
    try:
        result = await db.fetch_one(
            """
            INSERT INTO devices (name, zone_id, stream_url, device_type, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, zone_id, stream_url, device_type, status, created_at, updated_at
            """,
            device.name, device.zone_id, device.stream_url, device.device_type.value, device.status.value
        )
        
        return DeviceResponse(
            id=str(result["id"]),
            name=result["name"],
            zone_id=str(result["zone_id"]),
            stream_url=result["stream_url"],
            device_type=result["device_type"],
            status=result["status"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create device: {str(e)}"
        )

@router.get("/", response_model=List[DeviceResponse])
async def get_all_devices(zone_id: str = None, current_user: TokenData = Depends(get_current_user)):
    """Get all devices, optionally filter by zone_id"""
    if zone_id:
        devices = await db.fetch_all(
            """
            SELECT id, name, zone_id, stream_url, device_type, status, created_at, updated_at 
            FROM devices 
            WHERE zone_id = $1 
            ORDER BY created_at DESC
            """,
            zone_id
        )
    else:
        devices = await db.fetch_all(
            "SELECT id, name, zone_id, stream_url, device_type, status, created_at, updated_at FROM devices ORDER BY created_at DESC"
        )
    
    return [DeviceResponse(
        id=str(device["id"]),
        name=device["name"],
        zone_id=str(device["zone_id"]),
        stream_url=device["stream_url"],
        device_type=device["device_type"],
        status=device["status"],
        created_at=device["created_at"],
        updated_at=device["updated_at"]
    ) for device in devices]

@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device_by_id(device_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get device by ID"""
    device = await db.fetch_one(
        "SELECT id, name, zone_id, stream_url, device_type, status, created_at, updated_at FROM devices WHERE id = $1",
        device_id
    )
    
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    
    return DeviceResponse(
        id=str(device["id"]),
        name=device["name"],
        zone_id=str(device["zone_id"]),
        stream_url=device["stream_url"],
        device_type=device["device_type"],
        status=device["status"],
        created_at=device["created_at"],
        updated_at=device["updated_at"]
    )

@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: str,
    device_update: DeviceUpdate,
    current_user: TokenData = Depends(get_current_admin)
):
    """Update device (admin only)"""
    # Check if device name is being changed and if it conflicts with existing device in same zone
    if device_update.name is not None:
        # Get current device's zone_id
        current_device = await db.fetch_one("SELECT zone_id FROM devices WHERE id = $1", device_id)
        if not current_device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        
        # Check for name conflict in same zone
        existing_device = await db.fetch_one(
            "SELECT id FROM devices WHERE zone_id = $1 AND name = $2 AND id != $3",
            current_device["zone_id"], device_update.name, device_id
        )
        
        if existing_device:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Device with name '{device_update.name}' already exists in this zone"
            )
    
    updates = []
    values = []
    param_count = 1
    
    if device_update.name is not None:
        updates.append(f"name = ${param_count}")
        values.append(device_update.name)
        param_count += 1
    
    if device_update.stream_url is not None:
        updates.append(f"stream_url = ${param_count}")
        values.append(device_update.stream_url)
        param_count += 1
    
    if device_update.device_type is not None:
        updates.append(f"device_type = ${param_count}")
        values.append(device_update.device_type.value)
        param_count += 1
    
    if device_update.status is not None:
        updates.append(f"status = ${param_count}")
        values.append(device_update.status.value)
        param_count += 1
    
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    updates.append(f"updated_at = NOW()")
    values.append(device_id)
    
    query = f"""
        UPDATE devices
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING id, name, zone_id, stream_url, device_type, status, created_at, updated_at
    """
    
    try:
        result = await db.fetch_one(query, *values)
        
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
        
        return DeviceResponse(
            id=str(result["id"]),
            name=result["name"],
            zone_id=str(result["zone_id"]),
            stream_url=result["stream_url"],
            device_type=result["device_type"],
            status=result["status"],
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update device: {str(e)}"
        )

@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(device_id: str, current_user: TokenData = Depends(get_current_admin)):
    """Delete device (admin only)"""
    result = await db.execute("DELETE FROM devices WHERE id = $1", device_id)
    
    if result == "DELETE 0":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
