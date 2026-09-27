from fastapi import APIRouter, HTTPException, status, Depends
from app.models import ZoneCreate, ZoneUpdate, ZoneResponse, TokenData
from app.database import db
from app.dependencies import get_current_user, get_current_admin
from typing import List
import json

router = APIRouter(prefix="/api/zones", tags=["zones"])

@router.post("/", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_zone(zone: ZoneCreate, current_user: TokenData = Depends(get_current_admin)):
    """Create a new zone (admin only)"""
    # Check if zone with same name already exists
    existing_zone = await db.fetch_one(
        "SELECT id FROM zones WHERE name = $1",
        zone.name
    )
    
    if existing_zone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Zone with name '{zone.name}' already exists"
        )
    
    try:
        vertices_json = json.dumps(zone.vertices) if zone.vertices else None
        
        result = await db.fetch_one(
            """
            INSERT INTO zones (name, description, vertices)
            VALUES ($1, $2, $3)
            RETURNING id, name, description, vertices, created_at, updated_at
            """,
            zone.name, zone.description, vertices_json
        )
        
        return ZoneResponse(
            id=str(result["id"]),
            name=result["name"],
            description=result["description"],
            vertices=json.loads(result["vertices"]) if result["vertices"] else None,
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create zone: {str(e)}"
        )

    
@router.get("/", response_model=List[ZoneResponse])
async def get_all_zones(current_user: TokenData = Depends(get_current_user)):
    zones = await db.fetch_all(
        "SELECT id, name, description, vertices, created_at, updated_at FROM zones ORDER BY created_at DESC"
    )

    result = []

    for zone in zones:
        raw_vertices = zone["vertices"]

        # Step 1: Parse JSON string if stored as string
        # if isinstance(raw_vertices, str):
        #     try:
        #         raw_vertices = json.loads(raw_vertices)
        #     except:
        #         raw_vertices = None

        # # Step 2: If it's a LIST → Convert to DICT
        # if isinstance(raw_vertices, list):
        #     # Convert list → dict like {"p1": [...], "p2": [...], ...}
        #     raw_vertices = {
        #         f"p{i+1}": coord for i, coord in enumerate(raw_vertices)
        #     }

        result.append(
            ZoneResponse(
                id=str(zone["id"]),
                name=zone["name"],
                description=zone["description"],
                vertices=json.loads(zone["vertices"]) if zone["vertices"] else None,
                created_at=zone["created_at"],
                updated_at=zone["updated_at"],
            )
        )

    return result


@router.get("/{zone_id}", response_model=ZoneResponse)
async def get_zone_by_id(zone_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get zone by ID"""
    zone = await db.fetch_one(
        "SELECT id, name, description, vertices, created_at, updated_at FROM zones WHERE id = $1",
        zone_id
    )
    
    if not zone:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
    
    return ZoneResponse(
        id=str(zone["id"]),
        name=zone["name"],
        description=zone["description"],
        vertices=json.loads(zone["vertices"]) if zone["vertices"] else None,
        created_at=zone["created_at"],
        updated_at=zone["updated_at"]
    )

@router.put("/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: str,
    zone_update: ZoneUpdate,
    current_user: TokenData = Depends(get_current_admin)
):
    """Update zone (admin only)"""
    # Check if zone name is being changed and if it conflicts with existing zone
    if zone_update.name is not None:
        existing_zone = await db.fetch_one(
            "SELECT id FROM zones WHERE name = $1 AND id != $2",
            zone_update.name, zone_id
        )
        
        if existing_zone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Zone with name '{zone_update.name}' already exists"
            )
    
    updates = []
    values = []
    param_count = 1
    
    if zone_update.name is not None:
        updates.append(f"name = ${param_count}")
        values.append(zone_update.name)
        param_count += 1
    
    if zone_update.description is not None:
        updates.append(f"description = ${param_count}")
        values.append(zone_update.description)
        param_count += 1
    
    if zone_update.vertices is not None:
        updates.append(f"vertices = ${param_count}")
        values.append(json.dumps(zone_update.vertices))
        param_count += 1
    
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    updates.append(f"updated_at = NOW()")
    values.append(zone_id)
    
    query = f"""
        UPDATE zones
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING id, name, description, vertices, created_at, updated_at
    """
    
    try:
        result = await db.fetch_one(query, *values)
        
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
        
        return ZoneResponse(
            id=str(result["id"]),
            name=result["name"],
            description=result["description"],
            vertices=json.loads(result["vertices"]) if result["vertices"] else None,
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update zone: {str(e)}"
        )

@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone(zone_id: str, current_user: TokenData = Depends(get_current_admin)):
    """Delete zone (admin only)"""
    result = await db.execute("DELETE FROM zones WHERE id = $1", zone_id)
    
    if result == "DELETE 0":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Zone not found")
