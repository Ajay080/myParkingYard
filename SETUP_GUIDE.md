# Car Parking System - Complete Setup Guide

This guide will help you set up and run the complete car parking system with both the Python FastAPI backend and React frontend.

## 🏗️ Project Structure

```
CarParkingSystem/
├── cps_backend/          # Python FastAPI Backend
├── cps_gui/              # React Frontend (Vite)
└── SETUP_GUIDE.md        # This file
```

## 📋 Prerequisites

### Backend Requirements
- Python 3.8 or higher
- PostgreSQL database
- pip (Python package manager)

### Frontend Requirements
- Node.js 16+ and npm
- Modern web browser

## 🚀 Quick Start Guide

### Step 1: Database Setup

1. **Install PostgreSQL** (if not already installed)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   
   # macOS (using Homebrew)
   brew install postgresql
   ```

2. **Create Database**
   ```bash
   # Login to PostgreSQL
   sudo -u postgres psql
   
   # Create database and user
   CREATE DATABASE car_parking_db;
   CREATE USER parking_admin WITH PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE car_parking_db TO parking_admin;
   \q
   ```

3. **Run Database Schema**
   ```bash
   cd cps_backend
   psql -U parking_admin -d car_parking_db -f postgre_db_schema.sql
   ```

### Step 2: Backend Setup (FastAPI)

1. **Navigate to backend directory**
   ```bash
   cd cps_backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Activate virtual environment
   # On Linux/macOS:
   source venv/bin/activate
   
   # On Windows:
   venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install fastapi uvicorn asyncpg python-jose passlib python-multipart python-dotenv bcrypt
   ```

4. **Configure environment variables**
   
   Create a `.env` file in `cps_backend/app/` directory:
   ```env
   DATABASE_URL=postgresql://parking_admin:your_secure_password@localhost:5432/car_parking_db
   JWT_SECRET=your-very-secure-jwt-secret-key-change-this-in-production
   JWT_ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   CORS_ORIGINS=http://localhost:5173,http://localhost:3000
   ```

5. **Start the backend server**
   ```bash
   # From cps_backend directory
   python -m app.main
   
   # Or using uvicorn directly
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The backend will run at: **http://localhost:8000**
   
   API docs available at: **http://localhost:8000/docs**

### Step 3: Frontend Setup (React + Vite)

1. **Navigate to frontend directory**
   ```bash
   cd cps_gui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify environment configuration**
   
   Check `.env` file in `cps_gui/` directory:
   ```env
   VITE_API_BASE_URL="http://localhost:8000"
   JWT_SECRET=your-very-secure-secret-key-here
   ```

4. **Start the frontend development server**
   ```bash
   npm run dev
   ```

   The frontend will run at: **http://localhost:5173**

## 🔑 Default Users

After setting up the database, you can register new users through the application. The first user you create with role `admin` will have admin privileges.

### Creating Admin User:
1. Go to http://localhost:5173
2. Click "Sign up"
3. Fill in details and select "Admin" role
4. Complete registration

### Creating Regular User:
1. Go to http://localhost:5173
2. Click "Sign up"
3. Fill in details and keep "User" role
4. Complete registration

## 📱 Application Features

### Admin Dashboard
- View parking zone statistics
- Manage parking spots
- View all bookings
- User management
- Analytics and reports
- Device management

### User Dashboard
- Book parking spots
- View booking history
- Manage vehicles
- Make payments
- View account details

## 🔧 API Endpoints

### Authentication
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/me` - Get current user info

### Zones
- `GET /api/zones` - Get all zones
- `GET /api/zones/{id}` - Get zone by ID
- `POST /api/zones` - Create zone (admin)
- `PUT /api/zones/{id}` - Update zone (admin)
- `DELETE /api/zones/{id}` - Delete zone (admin)

### Spots
- `GET /api/spots` - Get all spots
- `GET /api/spots/{id}` - Get spot by ID
- `POST /api/spots` - Create spot (admin)
- `PUT /api/spots/{id}` - Update spot (admin)
- `DELETE /api/spots/{id}` - Delete spot (admin)

### Bookings
- `GET /api/bookings` - Get bookings
- `GET /api/bookings/{id}` - Get booking by ID
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/{id}` - Update booking
- `DELETE /api/bookings/{id}` - Delete booking (admin)

### Vehicles
- `GET /api/vehicles` - Get vehicles
- `POST /api/vehicles` - Add vehicle
- `PUT /api/vehicles/{id}` - Update vehicle
- `DELETE /api/vehicles/{id}` - Delete vehicle

### Analytics
- `GET /api/analytics/dashboard/summary` - Get dashboard stats
- `GET /api/analytics/bookings/report` - Get booking reports
- `GET /api/analytics/spots/stats` - Get spot statistics

## 🛠️ Troubleshooting

### Backend Issues

**Database Connection Error:**
```
Check DATABASE_URL in .env file
Verify PostgreSQL is running: sudo systemctl status postgresql
Check database credentials
```

**Port 8000 Already in Use:**
```bash
# Find process using port 8000
lsof -i :8000  # On Linux/macOS
netstat -ano | findstr :8000  # On Windows

# Kill the process or change port in startup command
uvicorn app.main:app --reload --port 8001
```

### Frontend Issues

**Module Not Found Error:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**API Connection Error:**
```
Verify backend is running on port 8000
Check VITE_API_BASE_URL in .env file
Check browser console for CORS errors
```

**Port 5173 Already in Use:**
```bash
# Vite will automatically try next available port
# Or specify custom port:
npm run dev -- --port 3000
```

## 📦 Production Deployment

### Backend Deployment

1. **Update environment variables for production**
2. **Use production-grade WSGI server**
   ```bash
   pip install gunicorn
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

### Frontend Deployment

1. **Build production bundle**
   ```bash
   npm run build
   ```

2. **Serve static files**
   ```bash
   # Using simple HTTP server
   npm install -g serve
   serve -s dist -p 3000
   
   # Or deploy to Vercel, Netlify, etc.
   ```

## 🔐 Security Notes

1. **Change all default secrets** in production
2. **Use HTTPS** in production environment
3. **Enable rate limiting** on API endpoints
4. **Implement proper session management**
5. **Regular security updates** for dependencies

## 📞 Support

For issues or questions:
- Check the API documentation at http://localhost:8000/docs
- Review error logs in terminal/console
- Ensure all dependencies are installed correctly

## 🎉 Success!

If both servers are running without errors:
- Backend: ✅ http://localhost:8000
- Frontend: ✅ http://localhost:5173
- API Docs: ✅ http://localhost:8000/docs

You're ready to use the Car Parking System!
