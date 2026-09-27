from fastapi import APIRouter, HTTPException, status, Depends
from app.models import PaymentCreate, PaymentUpdate, PaymentResponse, TokenData
from app.database import db
from app.dependencies import get_current_user, get_current_admin
from typing import List
import json

router = APIRouter(prefix="/api/payments", tags=["payments"])

@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(payment: PaymentCreate, current_user: TokenData = Depends(get_current_user)):
    """Create a new payment"""
    # Validate user exists
    user_exists = await db.fetch_one("SELECT id FROM users WHERE id = $1", payment.user_id)
    if not user_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate booking exists
    booking_exists = await db.fetch_one("SELECT id FROM bookings WHERE id = $1", payment.booking_id)
    if not booking_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Validate amount is positive
    if payment.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero"
        )
    
    try:
        result = await db.fetch_one(
            """
            INSERT INTO payments (booking_id, user_id, amount, payment_gateway, transaction_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, booking_id, user_id, amount, payment_status, payment_gateway, transaction_id, raw_response, created_at, updated_at
            """,
            payment.booking_id, payment.user_id, payment.amount, payment.payment_gateway, payment.transaction_id
        )
        
        return PaymentResponse(
            id=str(result["id"]),
            booking_id=str(result["booking_id"]),
            user_id=str(result["user_id"]),
            amount=float(result["amount"]),
            payment_status=result["payment_status"],
            payment_gateway=result["payment_gateway"],
            transaction_id=result["transaction_id"],
            raw_response=json.loads(result["raw_response"]) if result["raw_response"] else None,
            created_at=result["created_at"],
            updated_at=result["updated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment: {str(e)}"
        )

@router.get("/", response_model=List[PaymentResponse])
async def get_all_payments(
    user_id: str = None,
    booking_id: str = None,
    current_user: TokenData = Depends(get_current_user)
):
    """Get all payments, optionally filter by user_id or booking_id"""
    if user_id and booking_id:
        payments = await db.fetch_all(
            """
            SELECT id, booking_id, user_id, amount, payment_status, payment_gateway, 
                   transaction_id, raw_response, created_at, updated_at 
            FROM payments 
            WHERE user_id = $1 AND booking_id = $2 
            ORDER BY created_at DESC
            """,
            user_id, booking_id
        )
    elif user_id:
        payments = await db.fetch_all(
            """
            SELECT id, booking_id, user_id, amount, payment_status, payment_gateway, 
                   transaction_id, raw_response, created_at, updated_at 
            FROM payments 
            WHERE user_id = $1 
            ORDER BY created_at DESC
            """,
            user_id
        )
    elif booking_id:
        payments = await db.fetch_all(
            """
            SELECT id, booking_id, user_id, amount, payment_status, payment_gateway, 
                   transaction_id, raw_response, created_at, updated_at 
            FROM payments 
            WHERE booking_id = $1 
            ORDER BY created_at DESC
            """,
            booking_id
        )
    else:
        payments = await db.fetch_all(
            """
            SELECT id, booking_id, user_id, amount, payment_status, payment_gateway, 
                   transaction_id, raw_response, created_at, updated_at 
            FROM payments 
            ORDER BY created_at DESC
            """
        )
    
    return [PaymentResponse(
        id=str(payment["id"]),
        booking_id=str(payment["booking_id"]),
        user_id=str(payment["user_id"]),
        amount=float(payment["amount"]),
        payment_status=payment["payment_status"],
        payment_gateway=payment["payment_gateway"],
        transaction_id=payment["transaction_id"],
        raw_response=json.loads(payment["raw_response"]) if payment["raw_response"] else None,
        created_at=payment["created_at"],
        updated_at=payment["updated_at"]
    ) for payment in payments]

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment_by_id(payment_id: str, current_user: TokenData = Depends(get_current_user)):
    """Get payment by ID"""
    payment = await db.fetch_one(
        """
        SELECT id, booking_id, user_id, amount, payment_status, payment_gateway, 
               transaction_id, raw_response, created_at, updated_at 
        FROM payments 
        WHERE id = $1
        """,
        payment_id
    )
    
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    
    return PaymentResponse(
        id=str(payment["id"]),
        booking_id=str(payment["booking_id"]),
        user_id=str(payment["user_id"]),
        amount=float(payment["amount"]),
        payment_status=payment["payment_status"],
        payment_gateway=payment["payment_gateway"],
        transaction_id=payment["transaction_id"],
        raw_response=json.loads(payment["raw_response"]) if payment["raw_response"] else None,
        created_at=payment["created_at"],
        updated_at=payment["updated_at"]
    )

@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: str,
    payment_update: PaymentUpdate,
    current_user: TokenData = Depends(get_current_user)
):
    """Update payment"""
    updates = []
    values = []
    param_count = 1
    
    updates.append(f"payment_status = ${param_count}")
    values.append(payment_update.payment_status.value)
    param_count += 1
    
    if payment_update.transaction_id is not None:
        updates.append(f"transaction_id = ${param_count}")
        values.append(payment_update.transaction_id)
        param_count += 1
    
    if payment_update.raw_response is not None:
        updates.append(f"raw_response = ${param_count}")
        values.append(json.dumps(payment_update.raw_response))
        param_count += 1
    
    updates.append(f"updated_at = NOW()")
    values.append(payment_id)
    
    query = f"""
        UPDATE payments
        SET {', '.join(updates)}
        WHERE id = ${param_count}
        RETURNING id, booking_id, user_id, amount, payment_status, payment_gateway, 
                  transaction_id, raw_response, created_at, updated_at
    """
    
    result = await db.fetch_one(query, *values)
    
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    
    return PaymentResponse(
        id=str(result["id"]),
        booking_id=str(result["booking_id"]),
        user_id=str(result["user_id"]),
        amount=float(result["amount"]),
        payment_status=result["payment_status"],
        payment_gateway=result["payment_gateway"],
        transaction_id=result["transaction_id"],
        raw_response=json.loads(result["raw_response"]) if result["raw_response"] else None,
        created_at=result["created_at"],
        updated_at=result["updated_at"]
    )

@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_payment(payment_id: str, current_user: TokenData = Depends(get_current_admin)):
    """Delete payment (admin only)"""
    result = await db.execute("DELETE FROM payments WHERE id = $1", payment_id)
    
    if result == "DELETE 0":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
