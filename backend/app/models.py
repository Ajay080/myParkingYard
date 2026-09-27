from pydantic import BaseModel, EmailStr, Field, UUID4
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

# Enums
class UserRole(str, Enum):
    user = "user"
    admin = "admin"
    superadmin = "superadmin"
    staff = "staff"

class VehicleType(str, Enum):
    Car = "Car"
    Bike = "Bike"
    EV = "EV"
    Other = "Other"

class BookingStatus(str, Enum):
    Pending = "Pending"
    Confirmed = "Confirmed"
    Cancelled = "Cancelled"
    Completed = "Completed"

class SpotStatus(str, Enum):
    Available = "Available"
    Occupied = "Occupied"
    Blocked = "Blocked"
    UnderMaintenance = "UnderMaintenance"

class DeviceStatus(str, Enum):
    Active = "Active"
    Inactive = "Inactive"
    Disconnected = "Disconnected"

class DeviceType(str, Enum):
    CCTV = "CCTV"
    ANPR = "ANPR"
    OccupancySensor = "OccupancySensor"

class PaymentStatus(str, Enum):
    Pending = "Pending"
    Success = "Success"
    Failed = "Failed"
    Refunded = "Refunded"

# User Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    role: UserRole = UserRole.user

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    role: str
    created_at: datetime
    updated_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: str
    email: str
    role: str

# Vehicle Models
class VehicleCreate(BaseModel):
    user_id: str
    number_plate: str
    type: VehicleType = VehicleType.Car
    model: Optional[str] = None

class VehicleUpdate(BaseModel):
    number_plate: Optional[str] = None
    type: Optional[VehicleType] = None
    model: Optional[str] = None

class VehicleResponse(BaseModel):
    id: str
    user_id: str
    number_plate: str
    type: str
    model: Optional[str]
    created_at: datetime
    updated_at: datetime

# Zone Models
class ZoneCreate(BaseModel):
    name: str
    description: Optional[str] = None
    vertices: Optional[Any] = None  # Accept both list and dict

class ZoneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    vertices: Optional[Any] = None  # Accept both list and dict

class ZoneResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    vertices: Optional[Any] = None  # Accept both list and dict
    created_at: datetime
    updated_at: datetime


# Spot Models
class SpotCreate(BaseModel):
    zone_id: str
    name: str
    status: SpotStatus = SpotStatus.Available
    vertices: Optional[Any] = None  # Accept both list and dict

class SpotUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[SpotStatus] = None
    vertices: Optional[Any] = None  # Accept both list and dict

class SpotResponse(BaseModel):
    id: str
    zone_id: str
    name: str
    status: str
    vertices: Optional[Any] = None  # Accept both list and dict
    created_at: datetime
    updated_at: datetime

# Device Models
class DeviceCreate(BaseModel):
    name: str
    zone_id: str
    stream_url: Optional[str] = None
    device_type: DeviceType = DeviceType.CCTV
    status: DeviceStatus = DeviceStatus.Active

class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    stream_url: Optional[str] = None
    device_type: Optional[DeviceType] = None
    status: Optional[DeviceStatus] = None

class DeviceResponse(BaseModel):
    id: str
    name: str
    zone_id: str
    stream_url: Optional[str]
    device_type: str
    status: str
    created_at: datetime
    updated_at: datetime

# Pricing Models
class PricingCreate(BaseModel):
    zone_id: str
    vehicle_type: VehicleType
    price_per_hour: float

class PricingUpdate(BaseModel):
    price_per_hour: float

class PricingResponse(BaseModel):
    id: str
    zone_id: str
    vehicle_type: str
    price_per_hour: float
    created_at: datetime
    updated_at: datetime

# Booking Models
class BookingCreate(BaseModel):
    user_id: str
    vehicle_id: Optional[str] = None
    number_plate: str
    spot_id: str
    zone_id: str
    start_time: datetime
    end_time: datetime
    amount: float = 0

class BookingUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    booking_status: Optional[BookingStatus] = None
    amount: Optional[float] = None

class BookingResponse(BaseModel):
    id: str
    user_id: str
    vehicle_id: Optional[str]
    number_plate: str
    spot_id: str
    zone_id: str
    start_time: datetime
    end_time: datetime
    booking_status: str
    amount: float
    payment_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    # Populated fields for frontend display
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    zone_name: Optional[str] = None
    spot_name: Optional[str] = None

# Payment Models
class PaymentCreate(BaseModel):
    booking_id: str
    user_id: str
    amount: float
    payment_gateway: Optional[str] = None
    transaction_id: Optional[str] = None

class PaymentUpdate(BaseModel):
    payment_status: PaymentStatus
    transaction_id: Optional[str] = None
    raw_response: Optional[Dict[str, Any]] = None

class PaymentResponse(BaseModel):
    id: str
    booking_id: str
    user_id: str
    amount: float
    payment_status: str
    payment_gateway: Optional[str]
    transaction_id: Optional[str]
    raw_response: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
