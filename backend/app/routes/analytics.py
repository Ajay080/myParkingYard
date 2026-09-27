from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime
from app.dependencies import get_current_user
from app.database import db
from app.models import TokenData

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/bookings/report")
async def get_bookings_report(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    current_user: TokenData = Depends(get_current_user)
):
    """Get booking analytics report with stats and charts data"""
    
    # Build query conditions
    conditions = []
    params = []
    
    if from_date:
        # Parse datetime string to datetime object
        try:
            from_dt = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
        except:
            from_dt = datetime.strptime(from_date, '%Y-%m-%dT%H:%M')
        conditions.append(f"start_time >= ${len(params) + 1}")
        params.append(from_dt)
    
    if to_date:
        # Parse datetime string to datetime object
        try:
            to_dt = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
        except:
            to_dt = datetime.strptime(to_date, '%Y-%m-%dT%H:%M')
        conditions.append(f"end_time <= ${len(params) + 1}")
        params.append(to_dt)
    
    if zone_id:
        conditions.append(f"zone_id = ${len(params) + 1}")
        params.append(zone_id)
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    # For queries with JOINs involving spots table (which also has zone_id), we need table-qualified version
    where_clause_qualified = where_clause.replace("zone_id", "b.zone_id") if "zone_id" in where_clause else where_clause
    where_clause_qualified = where_clause_qualified.replace("start_time", "b.start_time").replace("end_time", "b.end_time")
    
    # Total bookings
    total_bookings_query = f"SELECT COUNT(*) as count FROM bookings WHERE {where_clause}"
    total_bookings_result = await db.fetch_one(total_bookings_query, *params)
    total_bookings = total_bookings_result['count'] if total_bookings_result else 0
    
    # Total revenue
    revenue_query = f"SELECT COALESCE(SUM(amount), 0) as total FROM bookings WHERE {where_clause}"
    revenue_result = await db.fetch_one(revenue_query, *params)
    total_revenue = float(revenue_result['total']) if revenue_result else 0
    
    # Bookings by status
    status_query = f"""
        SELECT booking_status, COUNT(*) as count 
        FROM bookings 
        WHERE {where_clause}
        GROUP BY booking_status
    """
    status_stats = await db.fetch_all(status_query, *params)
    
    # Bookings by hour
    hour_query = f"""
        SELECT 
            EXTRACT(HOUR FROM start_time) as hour,
            COUNT(*) as count
        FROM bookings 
        WHERE {where_clause}
        GROUP BY EXTRACT(HOUR FROM start_time)
        ORDER BY hour
    """
    hour_stats = await db.fetch_all(hour_query, *params)
    hour_stats_dict = {f"{int(row['hour']):02d}:00": row['count'] for row in hour_stats}
    
    # Zone stats (bookings per zone)
    # To avoid ambiguous column reference, we need to reconstruct where clause with table prefix
    zone_where_conditions = []
    zone_params = []
    if from_date:
        zone_where_conditions.append(f"b.start_time >= ${len(zone_params) + 1}")
        zone_params.append(from_dt)
    if to_date:
        zone_where_conditions.append(f"b.end_time <= ${len(zone_params) + 1}")
        zone_params.append(to_dt)
    if zone_id:
        zone_where_conditions.append(f"b.zone_id = ${len(zone_params) + 1}")
        zone_params.append(zone_id)
    
    zone_where_clause = " AND ".join(zone_where_conditions) if zone_where_conditions else "1=1"
    
    zone_stats_query = f"""
        SELECT 
            z.name as zone_name,
            COUNT(b.id) as booking_count
        FROM zones z
        LEFT JOIN bookings b ON b.zone_id = z.id AND {zone_where_clause}
        GROUP BY z.id, z.name
        ORDER BY booking_count DESC
    """
    zone_stats = await db.fetch_all(zone_stats_query, *zone_params)
    zone_stats_dict = {row['zone_name']: row['booking_count'] for row in zone_stats}
    
    # Revenue by hour
    revenue_by_hour_query = f"""
        SELECT 
            EXTRACT(HOUR FROM start_time) as hour,
            COALESCE(SUM(amount), 0) as revenue
        FROM bookings 
        WHERE {where_clause}
        GROUP BY EXTRACT(HOUR FROM start_time)
        ORDER BY hour
    """
    revenue_by_hour = await db.fetch_all(revenue_by_hour_query, *params)
    revenue_by_hour_dict = {f"{int(row['hour']):02d}:00": float(row['revenue']) for row in revenue_by_hour}
    
    # Top users
    top_users_query = f"""
        SELECT 
            u.name,
            COUNT(b.id) as booking_count
        FROM users u
        INNER JOIN bookings b ON b.user_id = u.id
        WHERE {where_clause}
        GROUP BY u.id, u.name
        ORDER BY booking_count DESC
        LIMIT 10
    """
    top_users = await db.fetch_all(top_users_query, *params)
    top_users_list = [{"user": row['name'], "count": row['booking_count']} for row in top_users]
    
    # Booking status breakdown
    status_breakdown_query = f"""
        SELECT 
            booking_status,
            COUNT(*) as count
        FROM bookings 
        WHERE {where_clause}
        GROUP BY booking_status
    """
    status_breakdown = await db.fetch_all(status_breakdown_query, *params)
    status_breakdown_dict = {row['booking_status']: row['count'] for row in status_breakdown}
    
    # Revenue by date (for time series chart)
    revenue_by_date_query = f"""
        SELECT 
            DATE(start_time) as booking_date,
            COALESCE(SUM(amount), 0) as revenue,
            COUNT(*) as booking_count
        FROM bookings 
        WHERE {where_clause}
        GROUP BY DATE(start_time)
        ORDER BY booking_date
    """
    revenue_by_date = await db.fetch_all(revenue_by_date_query, *params)
    revenue_by_date_list = [
        {
            "date": row['booking_date'].isoformat() if row['booking_date'] else "",
            "revenue": float(row['revenue']),
            "bookings": row['booking_count']
        } for row in revenue_by_date
    ]
    
    # Slot stats (top 10 most booked spots)
    # Use INNER JOIN to only get spots with bookings matching the filter
    slot_stats_query = f"""
        SELECT 
            s.name as spot_name,
            COUNT(b.id) as booking_count
        FROM bookings b
        INNER JOIN spots s ON b.spot_id = s.id
        WHERE {where_clause_qualified}
        GROUP BY s.id, s.name
        ORDER BY booking_count DESC
        LIMIT 10
    """
    slot_stats = await db.fetch_all(slot_stats_query, *params)
    slot_stats_dict = {row['spot_name']: row['booking_count'] for row in slot_stats}
    
    # User stats (bookings per user count)
    # Use INNER JOIN to only get users with bookings matching the filter
    user_stats_query = f"""
        SELECT 
            u.name as user_name,
            COUNT(b.id) as booking_count
        FROM bookings b
        INNER JOIN users u ON b.user_id = u.id
        WHERE {where_clause_qualified}
        GROUP BY u.id, u.name
        ORDER BY booking_count DESC
    """
    user_stats = await db.fetch_all(user_stats_query, *params)
    user_stats_dict = {row['user_name']: row['booking_count'] for row in user_stats}
    
    # Average booking duration in minutes
    duration_query = f"""
        SELECT 
            AVG(EXTRACT(EPOCH FROM (end_time - start_time))/60) as avg_minutes
        FROM bookings 
        WHERE {where_clause}
    """
    duration_result = await db.fetch_one(duration_query, *params)
    avg_duration = float(duration_result['avg_minutes']) if duration_result and duration_result['avg_minutes'] else 0
    
    # Total revenue
    total_revenue = sum(item['revenue'] for item in revenue_by_date_list)
    
    return {
        "totalBookings": total_bookings,
        "totalRevenue": round(total_revenue, 2),
        "avgDuration": round(avg_duration, 2),
        "zoneStats": zone_stats_dict,
        "statusBreakdown": status_breakdown_dict,
        "revenueByHour": revenue_by_hour_dict,
        "revenueByDate": revenue_by_date_list,
        "hourStats": hour_stats_dict,
        "userStats": user_stats_dict,
        "slotStats": slot_stats_dict,
        "topUsers": top_users_list
    }

@router.get("/spots/stats")
async def get_spots_stats(
    zone_id: Optional[str] = Query(None),
    current_user: TokenData = Depends(get_current_user)
):
    """Get parking spot statistics"""
    
    conditions = []
    params = []
    
    if zone_id:
        conditions.append(f"zone_id = ${len(params) + 1}")
        params.append(zone_id)
    
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    query = f"""
        SELECT 
            COUNT(*) as total_spots,
            SUM(CASE WHEN status = 'Available' THEN 1 ELSE 0 END) as available_spots,
            SUM(CASE WHEN status = 'Occupied' THEN 1 ELSE 0 END) as occupied_spots,
            SUM(CASE WHEN status = 'Blocked' THEN 1 ELSE 0 END) as blocked_spots,
            SUM(CASE WHEN status = 'UnderMaintenance' THEN 1 ELSE 0 END) as maintenance_spots
        FROM spots
        WHERE {where_clause}
    """
    
    result = await db.fetch_one(query, *params)
    
    if not result:
        return {
            "totalSpots": 0,
            "availableSpots": 0,
            "occupiedSpots": 0,
            "reservedSpots": 0,
            "blockedSpots": 0,
            "maintenanceSpots": 0
        }
    
    # Calculate reserved spots from active bookings
    if zone_id:
        reserved_query = """
            SELECT COUNT(DISTINCT spot_id) as reserved_count
            FROM bookings
            WHERE booking_status IN ('Pending', 'Confirmed')
            AND start_time <= NOW()
            AND end_time >= NOW()
            AND zone_id = $1
        """
        reserved_result = await db.fetch_one(reserved_query, zone_id)
    else:
        reserved_query = """
            SELECT COUNT(DISTINCT spot_id) as reserved_count
            FROM bookings
            WHERE booking_status IN ('Pending', 'Confirmed')
            AND start_time <= NOW()
            AND end_time >= NOW()
        """
        reserved_result = await db.fetch_one(reserved_query)
    
    reserved_spots = reserved_result['reserved_count'] if reserved_result else 0
    
    return {
        "totalSpots": result['total_spots'] or 0,
        "availableSpots": result['available_spots'] or 0,
        "occupiedSpots": result['occupied_spots'] or 0,
        "reservedSpots": reserved_spots,
        "blockedSpots": result['blocked_spots'] or 0,
        "maintenanceSpots": result['maintenance_spots'] or 0
    }

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    current_user: TokenData = Depends(get_current_user)
):
    """Get dashboard summary statistics - overall system stats"""
    
    # Total zones
    zones_query = "SELECT COUNT(*) as count FROM zones"
    zones_result = await db.fetch_one(zones_query)
    total_zones = zones_result['count'] if zones_result else 0
    
    # Total spots
    spots_query = "SELECT COUNT(*) as count FROM spots"
    spots_result = await db.fetch_one(spots_query)
    total_spots = spots_result['count'] if spots_result else 0
    
    # Available spots (currently not occupied/blocked/maintenance)
    available_query = "SELECT COUNT(*) as count FROM spots WHERE status = 'Available'"
    available_result = await db.fetch_one(available_query)
    available_spots = available_result['count'] if available_result else 0
    
    # Pending booking requests
    pending_bookings_query = """
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE booking_status = 'Pending'
    """
    pending_result = await db.fetch_one(pending_bookings_query)
    pending_bookings = pending_result['count'] if pending_result else 0
    
    return {
        "totalZones": total_zones,
        "totalSpots": total_spots,
        "availableSpots": available_spots,
        "pendingBookings": pending_bookings
    }
