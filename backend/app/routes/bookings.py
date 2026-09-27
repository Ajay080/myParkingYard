from fastapi import APIRouter, HTTPException, status, Depends
from app.models import BookingCreate, BookingUpdate, BookingResponse, TokenData
from app.database import db
from app.dependencies import get_current_user, get_current_admin
from typing import List

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(booking: BookingCreate, current_user: TokenData = Depends(get_current_user)):
    """Create a new booking"""
    # Validate user exists
    user_exists = await db.fetch_one("SELECT id FROM users WHERE id = $1", booking.user_id)
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate zone exists
    zone_exists = await db.fetch_one("SELECT id FROM zones WHERE id = $1", booking.zone_id)
    if not zone_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Zone not found"
        )
    
    # Validate spot exists
    spot_exists = await db.fetch_one("SELECT id FROM spots WHERE id = $1", booking.spot_id)
    if not spot_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Spot not found"
        )
    
    # Validate vehicle exists if provided
    if booking.vehicle_id:
        vehicle_exists = await db.fetch_one("SELECT id FROM vehicles WHERE id = $1", booking.vehicle_id)
        if not vehicle_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vehicle not found"
            )
    
    # Validate time range
    if booking.start_time >= booking.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be after start time"
        )
    
    # Check if spot is available for the requested time
    # Only check for CONFIRMED bookings - pending bookings should not block availability
    # Proper time overlap check: Two time ranges overlap if start1 < end2 AND start2 < end1
    print(f"DEBUG: Checking availability for spot_id={booking.spot_id}, start_time={booking.start_time}, end_time={booking.end_time}")
    conflicting_booking = await db.fetch_one(
        """
        SELECT id, start_time, end_time, booking_status FROM bookings
        WHERE spot_id = $1
        AND booking_status = 'Confirmed'
        AND start_time < $3
        AND end_time > $2
        """,
        booking.spot_id, booking.start_time, booking.end_time
    )
    print(f"DEBUG: Conflicting booking found: {conflicting_booking}")
    
    if conflicting_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Spot is not available for the requested time. Conflicting booking exists (ID: {conflicting_booking['id']}, Status: {conflicting_booking['booking_status']}, Time: {conflicting_booking['start_time']} to {conflicting_booking['end_time']})"
        )
    
    try:
        result = await db.fetch_one(
            """
            INSERT INTO bookings (user_id, vehicle_id, number_plate, spot_id, zone_id, start_time, end_time, amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, user_id, vehicle_id, number_plate, spot_id, zone_id, start_time, end_time, booking_status, amount, payment_id, created_at, updated_at
            """,
            booking.user_id, booking.vehicle_id, booking.number_plate, booking.spot_id, 
            booking.zone_id, booking.start_time, booking.end_time, booking.amount
        )
        
        return BookingResponse(
            id=str(result["id"]),
            user_id=str(result["user_id"]),
            vehicle_id=str(result["vehicle_id"]) if result["vehicle_id"] else None,
            number_plate=result["number_plate"],
            spot_id=str(result["spot_id"]),
            zone_id=str(result["zone_id"]),
            start_time=result["start_time"],
            end_time=result["end_time"],
            booking_status=result["booking_status"],
            amount=float(result["amount"]),
            payment_id=str(result["payment_id"]) if result["payment_id"] else None,
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create booking: {str(e)}"
        )

@router.get("/", response_model=List[BookingResponse])
async def get_all_bookings(
    user_id: str = None,
    zone_id: str = None,
    spot_id: str = None,
    current_user: TokenData = Depends(get_current_user)
):
    """Get all bookings with populated user, zone, and spot data"""
    # Build WHERE clause dynamically
    where_conditions = []
    params = []
    param_count = 1
    
    if user_id:
        where_conditions.append(f"b.user_id = ${param_count}")
        params.append(user_id)
        param_count += 1
    
    if zone_id:
        where_conditions.append(f"b.zone_id = ${param_count}")
        params.append(zone_id)
        param_count += 1
    
    if spot_id:
        where_conditions.append(f"b.spot_id = ${param_count}")
        params.append(spot_id)
        param_count += 1
    
    where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
    
    query = f"""
        SELECT 
            b.id, b.user_id, b.vehicle_id, b.number_plate, b.spot_id, b.zone_id, 
            b.start_time, b.end_time, b.booking_status, b.amount, b.payment_id, 
            b.created_at, b.updated_at,
            u.name as user_name, u.email as user_email,
            z.name as zone_name,
            s.name as spot_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN zones z ON b.zone_id = z.id
        LEFT JOIN spots s ON b.spot_id = s.id
        {where_clause}
        ORDER BY b.created_at DESC
    """
    
    bookings = await db.fetch_all(query, *params)
    
    return [BookingResponse(
        id=str(booking["id"]),
        user_id=str(booking["user_id"]),
        vehicle_id=str(booking["vehicle_id"]) if booking["vehicle_id"] else None,
        number_plate=booking["number_plate"],
        spot_id=str(booking["spot_id"]),
        zone_id=str(booking["zone_id"]),
        start_time=booking["start_time"],
        end_time=booking["end_time"],
        booking_status=booking["booking_status"],
        amount=float(booking["amount"]),
        payment_id=str(booking["payment_id"]) if booking["payment_id"] else None,
        created_at=booking["created_at"],
        updated_at=booking["updated_at"],
        user_name=booking["user_name"],
        user_email=booking["user_email"],
        zone_name=booking["zone_name"],
        spot_name=booking["spot_name"]
    ) for booking in bookings]

@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking_by_id(booking_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get booking by ID with populated data"""
    booking = await db.fetch_one(
        """
        SELECT 
            b.id, b.user_id, b.vehicle_id, b.number_plate, b.spot_id, b.zone_id, 
            b.start_time, b.end_time, b.booking_status, b.amount, b.payment_id, 
            b.created_at, b.updated_at,
            u.name as user_name, u.email as user_email,
            z.name as zone_name,
            s.name as spot_name
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN zones z ON b.zone_id = z.id
        LEFT JOIN spots s ON b.spot_id = s.id
        WHERE b.id = $1
        """,
        booking_id
    )
    
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    
    return BookingResponse(
        id=str(booking["id"]),
        user_id=str(booking["user_id"]),
        vehicle_id=str(booking["vehicle_id"]) if booking["vehicle_id"] else None,
        number_plate=booking["number_plate"],
        spot_id=str(booking["spot_id"]),
        zone_id=str(booking["zone_id"]),
        start_time=booking["start_time"],
        end_time=booking["end_time"],
        booking_status=booking["booking_status"],
        amount=float(booking["amount"]),
        payment_id=str(booking["payment_id"]) if booking["payment_id"] else None,
        created_at=booking["created_at"],
        updated_at=booking["updated_at"],
        user_name=booking["user_name"],
        user_email=booking["user_email"],
        zone_name=booking["zone_name"],
        spot_name=booking["spot_name"]
    )

@router.put("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: str,
    booking_update: BookingUpdate,
    current_user: TokenData = Depends(get_current_user)
):
    """Update booking"""
    # First, get the existing booking
    existing_booking = await db.fetch_one(
        "SELECT id, spot_id, start_time, end_time, booking_status FROM bookings WHERE id = $1",
        booking_id
    )
    
    if not existing_booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    
    # Determine the final time range after update
    final_start_time = booking_update.start_time if booking_update.start_time is not None else existing_booking["start_time"]
    final_end_time = booking_update.end_time if booking_update.end_time is not None else existing_booking["end_time"]
    final_status = booking_update.booking_status.value if booking_update.booking_status is not None else existing_booking["booking_status"]
    
    # If approving a booking (changing to Confirmed) or updating time, check for conflicts
    # Only check against OTHER Confirmed bookings - pending bookings should not block
    if (booking_update.booking_status is not None and booking_update.booking_status.value.lower() == 'confirmed') or \
       (booking_update.start_time is not None or booking_update.end_time is not None):
        
        # Check if spot is available for the time range (excluding current booking, only check Confirmed bookings)
        conflicting_booking = await db.fetch_one(
            """
            SELECT id, start_time, end_time, booking_status FROM bookings
            WHERE spot_id = $1
            AND id != $2
            AND booking_status = 'Confirmed'
            AND start_time < $4
            AND end_time > $3
            """,
            existing_booking["spot_id"], booking_id, final_start_time, final_end_time
        )
        
        if conflicting_booking:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve/update booking. Spot is not available for the requested time. Conflicting booking exists (ID: {conflicting_booking['id']}, Status: {conflicting_booking['booking_status']}, Time: {conflicting_booking['start_time']} to {conflicting_booking['end_time']})"
            )
    
    updates = []
    values = []
    param_count = 1
    
    if booking_update.start_time is not None:
        updates.append(f"start_time = ${param_count}")
        values.append(booking_update.start_time)
        param_count += 1
    
    if booking_update.end_time is not None:
        updates.append(f"end_time = ${param_count}")
        values.append(booking_update.end_time)
        param_count += 1
    
    if booking_update.booking_status is not None:
        updates.append(f"booking_status = ${param_count}")
        values.append(booking_update.booking_status.value)
        param_count += 1
    
    if booking_update.amount is not None:
        updates.append(f"amount = ${param_count}")
        values.append(booking_update.amount)
        param_count += 1
    
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    
    updates.append(f"updated_at = NOW()")
    values.append(booking_id)
    
    query = f"""
        UPDATE bookings
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING id, user_id, vehicle_id, number_plate, spot_id, zone_id, start_time, end_time, 
                  booking_status, amount, payment_id, created_at, updated_at
    """
    
    result = await db.fetch_one(query, *values)
    
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    
    return BookingResponse(
        id=str(result["id"]),
        user_id=str(result["user_id"]),
        vehicle_id=str(result["vehicle_id"]) if result["vehicle_id"] else None,
        number_plate=result["number_plate"],
        spot_id=str(result["spot_id"]),
        zone_id=str(result["zone_id"]),
        start_time=result["start_time"],
        end_time=result["end_time"],
        booking_status=result["booking_status"],
        amount=float(result["amount"]),
        payment_id=str(result["payment_id"]) if result["payment_id"] else None,
        created_at=result["created_at"],
        updated_at=result["updated_at"]
    )

@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_booking(booking_id: str, current_user: TokenData = Depends(get_current_admin)):
    """Delete booking (admin only)"""
    result = await db.execute("DELETE FROM bookings WHERE id = $1", booking_id)
    
    if result == "DELETE 0":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
