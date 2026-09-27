from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.models import PricingCreate, PricingUpdate, PricingResponse, TokenData
from app.database import db
from app.dependencies import get_current_user, get_current_admin
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/api/pricing", tags=["pricing"])

class PricingCalculationResponse(BaseModel):
    totalCost: float
    duration: float
    costPerMinute: float
    pricePerHour: float
    breakdown: dict

@router.get("/calculate", response_model=PricingCalculationResponse)
async def calculate_pricing(
    zone_id: str = Query(..., description="Zone ID"),
    start_time: str = Query(..., description="Start time in ISO format"),
    end_time: str = Query(..., description="End time in ISO format"),
    vehicle_type: Optional[str] = Query("car", description="Vehicle type"),
    current_user: TokenData = Depends(get_current_user)
):
    """Calculate pricing for a booking"""
    # Parse datetime strings
    try:
        start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid datetime format. Use ISO format (YYYY-MM-DDTHH:MM)"
        )
    
    # Calculate duration in hours
    duration_seconds = (end_dt - start_dt).total_seconds()
    if duration_seconds <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time"
        )
    
    duration_hours = duration_seconds / 3600
    duration_minutes = duration_seconds / 60
    
    # Get pricing for the zone
    pricing = await db.fetch_one(
        "SELECT price_per_hour FROM pricing WHERE zone_id = $1 AND vehicle_type = $2",
        zone_id, vehicle_type
    )
    
    if not pricing:
        # Default pricing if not configured
        price_per_hour = 10.0
    else:
        price_per_hour = float(pricing["price_per_hour"])
    
    # Calculate total cost
    total_cost = price_per_hour * duration_hours
    cost_per_minute = price_per_hour / 60
    
    return PricingCalculationResponse(
        totalCost=round(total_cost, 2),
        duration=round(duration_minutes, 2),
        costPerMinute=round(cost_per_minute, 2),
        pricePerHour=price_per_hour,
        breakdown={
            "baseRate": price_per_hour,
            "duration_hours": round(duration_hours, 2),
            "duration_minutes": round(duration_minutes, 2),
            "vehicleType": vehicle_type
        }
    )

@router.post("/", response_model=PricingResponse, status_code=status.HTTP_201_CREATED)
async def create_pricing(pricing: PricingCreate, current_user: TokenData = Depends(get_current_admin)):
    """Create a new pricing rule (admin only)"""
    # Check if zone exists
    zone_exists = await db.fetch_one("SELECT id FROM zones WHERE id = $1", pricing.zone_id)
    if not zone_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    
    # Validate price is positive
    if pricing.price_per_hour <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Price per hour must be greater than zero"
        )
    
    # Check if pricing already exists for this zone and vehicle type
    existing = await db.fetch_one(
        "SELECT id FROM pricing WHERE zone_id = $1 AND vehicle_type = $2",
        pricing.zone_id, pricing.vehicle_type.value
    )
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pricing for zone and vehicle type '{pricing.vehicle_type.value}' already exists"
        )
    
    try:
        result = await db.fetch_one(
            """
            INSERT INTO pricing (zone_id, vehicle_type, price_per_hour)
            VALUES ($1, $2, $3)
            RETURNING id, zone_id, vehicle_type, price_per_hour, created_at, updated_at
            """,
            pricing.zone_id, pricing.vehicle_type.value, pricing.price_per_hour
        )
        
        return PricingResponse(
            id=str(result["id"]),
            zone_id=str(result["zone_id"]),
            vehicle_type=result["vehicle_type"],
            price_per_hour=float(result["price_per_hour"]),
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create pricing: {str(e)}"
        )

@router.get("/", response_model=List[PricingResponse])
async def get_all_pricing(zone_id: str = None, current_user: TokenData = Depends(get_current_user)):
    """Get all pricing rules, optionally filter by zone_id"""
    if zone_id:
        pricing_list = await db.fetch_all(
            """
            SELECT id, zone_id, vehicle_type, price_per_hour, created_at, updated_at 
            FROM pricing 
            WHERE zone_id = $1 
            ORDER BY vehicle_type
            """,
            zone_id
        )
    else:
        pricing_list = await db.fetch_all(
            "SELECT id, zone_id, vehicle_type, price_per_hour, created_at, updated_at FROM pricing ORDER BY created_at DESC"
        )
    
    return [PricingResponse(
        id=str(pricing["id"]),
        zone_id=str(pricing["zone_id"]),
        vehicle_type=pricing["vehicle_type"],
        price_per_hour=float(pricing["price_per_hour"]),
        created_at=pricing["created_at"],
        updated_at=pricing["updated_at"]
    ) for pricing in pricing_list]

@router.get("/{pricing_id}", response_model=PricingResponse)
async def get_pricing_by_id(pricing_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get pricing by ID"""
    pricing = await db.fetch_one(
        "SELECT id, zone_id, vehicle_type, price_per_hour, created_at, updated_at FROM pricing WHERE id = $1",
        pricing_id
    )
    
    if not pricing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pricing not found")
    
    return PricingResponse(
        id=str(pricing["id"]),
        zone_id=str(pricing["zone_id"]),
        vehicle_type=pricing["vehicle_type"],
        price_per_hour=float(pricing["price_per_hour"]),
        created_at=pricing["created_at"],
        updated_at=pricing["updated_at"]
    )

@router.put("/{pricing_id}", response_model=PricingResponse)
async def update_pricing(
    pricing_id: str,
    pricing_update: PricingUpdate,
    current_user: TokenData = Depends(get_current_admin)
):
    """Update pricing (admin only)"""
    # Validate price is positive
    if pricing_update.price_per_hour <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Price per hour must be greater than zero"
        )
    
    try:
        result = await db.fetch_one(
            """
            UPDATE pricing
            SET price_per_hour = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, zone_id, vehicle_type, price_per_hour, created_at, updated_at
            """,
            pricing_update.price_per_hour, pricing_id
        )
        
        if not result:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pricing not found")
        
        return PricingResponse(
            id=str(result["id"]),
            zone_id=str(result["zone_id"]),
            vehicle_type=result["vehicle_type"],
            price_per_hour=float(result["price_per_hour"]),
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update pricing: {str(e)}"
        )

@router.delete("/{pricing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pricing(pricing_id: str, current_user: TokenData = Depends(get_current_admin)):
    """Delete pricing (admin only)"""
    result = await db.execute("DELETE FROM pricing WHERE id = $1", pricing_id)
    
    if result == "DELETE 0":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pricing not found")
