# 🚗 Car Parking System - Quick Start

## 🎯 One-Command Start

```bash
cd /home/ajay/Documents/personal/Projects/CarParkingSystem
./start_services.sh
```

## 🌐 Access Points

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | React Application |
| Backend | http://localhost:8000 | FastAPI Server |
| API Docs | http://localhost:8000/docs | Interactive API Documentation |

## 🔐 First Time Setup

### 1. Create Admin Account
- Go to http://localhost:5173
- Click **"Sign up"**
- Fill details:
  - Name: Your Name
  - Email: admin@example.com
  - Phone: Your Phone
  - Password: (secure password)
  - **Role: Admin** ← Important!
- Click "Sign up"

### 2. Login
- Use the credentials you just created
- You'll be redirected to Admin Dashboard

### 3. Create Zones & Spots
1. Go to "Zone Management"
2. Create parking zones
3. Add spots to each zone

## 📚 Common Commands

```bash
# Start services
./start_services.sh

# Stop services
./stop_services.sh

# View backend logs
tail -f backend.log

# View frontend logs
tail -f frontend.log

# Restart backend only
cd cps_backend
source venv/bin/activate
python -m app.main

# Restart frontend only
cd cps_gui
npm run dev
```

## 🔧 Environment Files

### Backend (cps_backend/app/.env)
```env
DATABASE_URL=postgresql://parking_admin:password@localhost:5432/car_parking_db
JWT_SECRET=your-secret-key
CORS_ORIGINS=http://localhost:5173
```

### Frontend (cps_gui/.env)
```env
VITE_API_BASE_URL="http://localhost:8000"
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database connection
psql -U parking_admin -d car_parking_db
```

### Frontend won't start
```bash
# Reinstall dependencies
cd cps_gui
rm -rf node_modules
npm install
```

### CORS Errors
- Check CORS_ORIGINS in backend/.env
- Should include: http://localhost:5173

## 📊 Default Test Data

After first login, you can:
1. Create zones (e.g., "Zone A", "Zone B")
2. Add spots per zone (e.g., "A1", "A2", "B1", "B2")
3. Test booking flow as user
4. View analytics as admin

## 🎯 Key Features

✅ User & Admin Authentication
✅ Zone & Spot Management  
✅ Real-time Booking System
✅ Vehicle Management
✅ Payment Tracking
✅ Analytics Dashboard
✅ Booking History
✅ Profile Management

## 📞 Quick Help

**Problem**: Can't login
- **Solution**: Check credentials, verify backend is running

**Problem**: API errors
- **Solution**: Check backend logs, verify database connection

**Problem**: Blank screen
- **Solution**: Check frontend logs, clear browser cache

## 🎉 You're All Set!

Everything is configured and ready to use. Happy parking! 🚗✨
