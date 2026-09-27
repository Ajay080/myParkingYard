# 🚗 Car Parking System - Clean Project Structure

**Last Updated:** December 1, 2025

## 📁 Project Structure

```
CarParkingSystem/
├── cps_gui/                    # ⚛️ Frontend Application (React + Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   │   ├── DashboardNew.jsx      # ✨ Beautiful admin dashboard with ECharts
│   │   │   │   ├── Zones.jsx             # Zone and spot management
│   │   │   │   ├── Bookings_new.jsx      # Booking management
│   │   │   │   ├── Reports.jsx           # Analytics and reports
│   │   │   │   ├── ManageCCTV.jsx        # CCTV device management
│   │   │   │   ├── AccountPage.jsx       # Admin account settings
│   │   │   │   ├── SpotManager.jsx       # Spot CRUD operations
│   │   │   │   ├── ZoneModal.jsx         # Zone modal component
│   │   │   │   └── CanvasDesigner.jsx    # Visual spot designer
│   │   │   └── user/
│   │   │       ├── UserDashboardNew.jsx  # ✨ User dashboard with charts
│   │   │       ├── EnhancedDashboard.jsx # Create new booking
│   │   │       ├── NewBooking.jsx        # View my bookings
│   │   │       └── AccountPage.jsx       # User account settings
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── app-sidebar.jsx       # Clean sidebar navigation
│   │   │   │   ├── nav-main.jsx
│   │   │   │   ├── nav-user.jsx
│   │   │   │   └── team-switcher.jsx
│   │   │   └── ui/                       # Shadcn UI components
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx           # Authentication context
│   │   ├── services/
│   │   │   └── api.js                    # API service layer
│   │   └── utils/
│   │       └── routes.jsx                # Clean route definitions
│   ├── package.json
│   └── vite.config.js
│
├── cps_backend/                # 🐍 Backend Application (FastAPI + PostgreSQL)
│   ├── app/
│   │   ├── main.py            # FastAPI application entry
│   │   ├── models.py          # Pydantic models
│   │   ├── database.py        # Database connection
│   │   ├── auth.py            # Authentication utilities
│   │   ├── config.py          # Configuration
│   │   ├── routes/
│   │   │   ├── users.py       # User management + password change
│   │   │   ├── bookings.py    # Booking operations
│   │   │   ├── spots.py       # Parking spot management
│   │   │   ├── zones.py       # Zone management
│   │   │   ├── devices.py     # CCTV device management
│   │   │   ├── payments.py    # Payment processing
│   │   │   ├── pricing.py     # Dynamic pricing
│   │   │   ├── analytics.py   # Analytics and reports
│   │   │   └── video_stream.py # CCTV video streaming
│   │   └── videos/            # MP4 files for CCTV simulation
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── Dockerfile
│
├── DASHBOARD_UPDATE.md        # Dashboard update documentation
├── CCTV_STREAMING_GUIDE.md    # CCTV setup guide
├── PROJECT_STRUCTURE.md        # This file
├── start_services.sh          # Start both frontend & backend
├── stop_services.sh           # Stop all services
├── cleanup.sh                 # Remove old duplicate folders
└── render.yaml                # Deployment configuration
```

## 🗑️ Removed (Cleaned Up)

The following have been removed or are no longer referenced:

### ❌ Removed Routes
- `/admin/livefeed` - Old live feed page (replaced by CCTV management)
- `/admin/logs` - Car detection logs (not needed)
- `/api-test` - API tester (development only)

### ❌ Old Folders (Run cleanup.sh to remove)
- `car_parking_system/` - Old duplicate frontend
- `car_parking_system_backend/` - Old duplicate backend

### ❌ Old Dashboard Files
- Old `Dashboard.jsx` files (replaced by `DashboardNew.jsx`)
- Old `UserDashboard.jsx` (replaced by `UserDashboardNew.jsx`)

## ✨ Active Features

### 👨‍💼 Admin Features
1. **Dashboard** - Beautiful analytics with ECharts
   - Revenue trends
   - Booking statistics
   - Zone performance
   - Occupancy gauge
   - Time range selector (week/month/year)

2. **Zone & Spot Management**
   - Create/edit/delete zones
   - Manage parking spots per zone
   - Set pricing per zone
   - Visual canvas designer

3. **Booking Management**
   - View all bookings
   - Approve/reject pending bookings
   - Cancel bookings
   - Filter by status, date, zone

4. **CCTV Management**
   - Add/edit/delete CCTV devices
   - Live stream preview (MP4 or dummy feed)
   - Multi-camera grid view
   - Fullscreen mode

5. **Reports & Analytics**
   - Revenue reports
   - Booking trends
   - Zone analytics
   - Export capabilities

6. **Account Management**
   - Update profile
   - Change password ✅
   - View account details

### 👤 User Features
1. **Dashboard** - Personal analytics
   - Total bookings
   - Total spent (₹)
   - Active bookings
   - Favorite zones
   - Spending trends (6 months)
   - Booking status charts

2. **Create Booking**
   - Select zone and spot
   - Choose date and time
   - Real-time availability check
   - Dynamic pricing calculation
   - Conflict detection

3. **My Bookings**
   - View all personal bookings
   - Filter by status
   - Download booking details
   - Cancel bookings

4. **Account Management**
   - Update profile
   - Change password ✅
   - View booking history

## 💰 Currency

All amounts display in **Indian Rupees (₹)** with proper formatting:
- Example: ₹1,00,000 (not $100,000)
- Format: `toLocaleString('en-IN')`

## 🎨 Design System

- **Color Scheme:**
  - Green (#22C55E) - Success, Confirmed, Revenue
  - Blue (#3B82F6) - Info, Primary, Bookings
  - Yellow (#F59E0B) - Warning, Pending
  - Red (#EF4444) - Error, Cancelled
  - Purple (#8B5CF6) - Admin features
  - Orange (#F97316) - Occupancy, Alerts

- **Icons:** Lucide React + React Icons
- **Charts:** Apache ECharts 5.6.0
- **UI Framework:** Tailwind CSS + Shadcn UI

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Backend
cd cps_backend
pip install -r requirements.txt

# Frontend
cd cps_gui
npm install
```

### 2. Start Services

```bash
# Option 1: Manual
cd cps_backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

cd cps_gui
npm run dev

# Option 2: Automated
./start_services.sh
```

### 3. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### 4. Default Credentials

**Admin:**
- Email: admin@example.com
- Password: admin123

**User:**
- Email: user@example.com
- Password: user123

## 🧹 Cleanup

To remove old duplicate folders and files:

```bash
./cleanup.sh
```

This will remove:
- `car_parking_system/` folder
- `car_parking_system_backend/` folder
- Old log files

## 📊 Database Schema

PostgreSQL database with tables:
- `users` - User accounts
- `zones` - Parking zones
- `spots` - Parking spots
- `bookings` - Booking records
- `payments` - Payment transactions
- `devices` - CCTV devices
- `vehicles` - User vehicles

## 🔒 Security

- JWT token authentication
- Password hashing (bcrypt)
- Role-based access control (Admin/User)
- CORS configured
- Environment variables for sensitive data

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Users
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update profile
- `PUT /api/users/me/password` - Change password ✅

### Bookings
- `GET /api/bookings/` - Get all bookings
- `POST /api/bookings/` - Create booking
- `PUT /api/bookings/{id}` - Update booking
- `DELETE /api/bookings/{id}` - Cancel booking

### Zones & Spots
- `GET /api/zones/` - Get all zones
- `GET /api/spots/` - Get all spots
- `POST /api/zones/` - Create zone (admin)
- `POST /api/spots/` - Create spot (admin)

### Analytics
- `GET /api/analytics/dashboard/summary` - Dashboard stats
- `GET /api/analytics/bookings/report` - Booking reports

### CCTV
- `GET /api/devices/` - Get all devices
- `POST /api/devices/` - Add device
- `GET /api/video/stream/{device_id}` - Stream video

## 🎯 Next Steps

1. **Run cleanup.sh** to remove old folders
2. **Test all features** in both admin and user panels
3. **Configure PostgreSQL** connection string
4. **Set up environment variables**
5. **Deploy to production** (Render/Vercel recommended)

## 📞 Support

For issues:
1. Check backend logs: `cps_backend/` terminal
2. Check frontend console: Browser DevTools
3. Verify database connection
4. Check API endpoints: http://localhost:8000/docs

---

**Status:** ✅ Clean and Production-Ready!
