from fastapi import APIRouter, HTTPException, status, Depends
from app.models import SpotCreate, SpotUpdate, SpotResponse, TokenData
from app.database import db
from app.dependencies import get_current_user, get_current_admin
from typing import List
import json

router = APIRouter(prefix="/api/spots", tags=["spots"])

@router.post("/", response_model=SpotResponse, status_code=status.HTTP_201_CREATED)
async def create_spot(spot: SpotCreate, current_user: TokenData = Depends(get_current_admin)):
    # Check if zone exists
    zone_exists = await db.fetch_one("SELECT id FROM zones WHERE id = $1", spot.zone_id)
    if not zone_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    
    # Check if spot with same name already exists in this zone
    existing_spot = await db.fetch_one(
        "SELECT id FROM spots WHERE zone_id = $1 AND name = $2",
        spot.zone_id, spot.name
    )
    
    if existing_spot:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Spot with name '{spot.name}' already exists in this zone"
        )
    
    try:
        # Convert vertices dict to JSON string for PostgreSQL JSONB
        vertices_json = json.dumps(spot.vertices) if spot.vertices else None

        result = await db.fetch_one(
            """
            INSERT INTO spots (zone_id, name, status, vertices)
            VALUES ($1, $2, $3, $4::jsonb)
            RETURNING id, zone_id, name, status, vertices, created_at, updated_at
            """,
            spot.zone_id, spot.name, spot.status.value, vertices_json
        )

        return SpotResponse(
            id=str(result["id"]),
            zone_id=str(result["zone_id"]),
            name=result["name"],
            status=result["status"],
            vertices=json.loads(result["vertices"]) if result["vertices"] else None,
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create spot: {str(e)}"
        )

@router.get("/", response_model=List[SpotResponse])
async def get_all_spots(zone_id: str = None, current_user: TokenData = Depends(get_current_user)):
    """Get all spots, optionally filter by zone_id"""
    if zone_id:
        spots = await db.fetch_all(
            "SELECT id, zone_id, name, status, vertices, created_at, updated_at FROM spots WHERE zone_id = $1 ORDER BY name",
            zone_id
        )
    else:
        spots = await db.fetch_all(
            "SELECT id, zone_id, name, status, vertices, created_at, updated_at FROM spots ORDER BY created_at DESC"
        )
    
    return [
        SpotResponse(
            id=str(spot["id"]),
            zone_id=str(spot["zone_id"]),
            name=spot["name"],
            status=spot["status"],
            vertices=json.loads(spot["vertices"]) if spot["vertices"] else None,
            created_at=spot["created_at"],
            updated_at=spot["updated_at"]
        )
        for spot in spots
    ]




@router.get("/{spot_id}", response_model=SpotResponse)
async def get_spot_by_id(spot_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get spot by ID"""
    spot = await db.fetch_one(
        "SELECT id, zone_id, name, status, vertices, created_at, updated_at FROM spots WHERE id = $1",
        spot_id
    )
    
    if not spot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")
    
    return SpotResponse(
        id=str(spot["id"]),
        zone_id=str(spot["zone_id"]),
        name=spot["name"],
        status=spot["status"],
        vertices=json.loads(spot["vertices"]) if spot["vertices"] else None,
        created_at=spot["created_at"],
        updated_at=spot["updated_at"]
    )

@router.put("/{spot_id}", response_model=SpotResponse)
async def update_spot(
    spot_id: str,
    spot_update: SpotUpdate,
    current_user: TokenData = Depends(get_current_admin)
):
    """Update spot (admin only)"""
    # Check if spot name is being changed and if it conflicts with existing spot in same zone
    if spot_update.name is not None:
        # Get current spot's zone_id
        current_spot = await db.fetch_one("SELECT zone_id FROM spots WHERE id = $1", spot_id)
        if not current_spot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")
        
        # Check for name conflict in same zone
        existing_spot = await db.fetch_one(
            "SELECT id FROM spots WHERE zone_id = $1 AND name = $2 AND id != $3",
            current_spot["zone_id"], spot_update.name, spot_id
        )
        
        if existing_spot:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Spot with name '{spot_update.name}' already exists in this zone"
            )
    
    updates = []
    values = []
    param_count = 1
    
    if spot_update.name is not None:
        updates.append(f"name = ${param_count}")
        values.append(spot_update.name)
        param_count += 1
    
    if spot_update.status is not None:
        updates.append(f"status = ${param_count}")
        values.append(spot_update.status.value)
        param_count += 1
    
    if spot_update.vertices is not None:
        updates.append(f"vertices = ${param_count}::jsonb")
        values.append(json.dumps(spot_update.vertices))
        param_count += 1
    
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    updates.append(f"updated_at = NOW()")
    values.append(spot_id)
    
    query = f"""
        UPDATE spots
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING id, zone_id, name, status, vertices, created_at, updated_at
    """
    
    try:
        result = await db.fetch_one(query, *values)
        
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")
        
        return SpotResponse(
            id=str(result["id"]),
            zone_id=str(result["zone_id"]),
            name=result["name"],
            status=result["status"],
            vertices=json.loads(result["vertices"]) if result["vertices"] else None,
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update spot: {str(e)}"
        )

@router.delete("/{spot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_spot(spot_id: str, current_user: TokenData = Depends(get_current_admin)):
    """Delete spot (admin only)"""
    result = await db.execute("DELETE FROM spots WHERE id = $1", spot_id)
    
    if result == "DELETE 0":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")
