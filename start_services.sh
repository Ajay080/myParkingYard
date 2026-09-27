#!/bin/bash

# Car Parking System - Quick Start Script
# This script starts both backend and frontend servers

echo "🚗 Car Parking System - Starting Services..."
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "cps_backend" ] || [ ! -d "cps_gui" ]; then
    echo -e "${RED}Error: Please run this script from the CarParkingSystem root directory${NC}"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if backend port is available
if check_port 8000; then
    echo -e "${YELLOW}Warning: Port 8000 is already in use${NC}"
    echo "Backend may already be running or another service is using the port"
    read -p "Kill existing process on port 8000? (y/n): " kill_backend
    if [ "$kill_backend" = "y" ]; then
        lsof -ti:8000 | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✓ Cleared port 8000${NC}"
        sleep 1
    fi
fi

# Check if frontend port is available
if check_port 5173; then
    echo -e "${YELLOW}Warning: Port 5173 is already in use${NC}"
    echo "Frontend may already be running"
    read -p "Kill existing process on port 5173? (y/n): " kill_frontend
    if [ "$kill_frontend" = "y" ]; then
        lsof -ti:5173 | xargs kill -9 2>/dev/null
        echo -e "${GREEN}✓ Cleared port 5173${NC}"
        sleep 1
    fi
fi

echo ""
echo -e "${YELLOW}Starting Backend Server...${NC}"
echo "=============================================="

# Start backend in background
cd cps_backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment and start server
source venv/bin/activate
echo -e "${GREEN}✓ Virtual environment activated${NC}"

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    pip install fastapi uvicorn asyncpg python-jose passlib python-multipart python-dotenv bcrypt > /dev/null 2>&1
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Start backend server
echo "Starting FastAPI server on http://localhost:8000..."
nohup python -m app.main > ../backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo "  Logs: backend.log"

cd ..

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 3

# Start frontend
echo ""
echo -e "${YELLOW}Starting Frontend Server...${NC}"
echo "=============================================="
cd cps_gui

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install > /dev/null 2>&1
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Start frontend server
echo "Starting Vite dev server on http://localhost:5173..."
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo "  Logs: frontend.log"

cd ..

# Wait for frontend to start
echo "Waiting for frontend to initialize..."
sleep 3

echo ""
echo "=============================================="
echo -e "${GREEN}✓ All services started successfully!${NC}"
echo "=============================================="
echo ""
echo "📱 Application URLs:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo ""
echo "📊 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📝 Log Files:"
echo "   Backend:  backend.log"
echo "   Frontend: frontend.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   or run: ./stop_services.sh"
echo ""
echo -e "${GREEN}Happy parking! 🚗${NC}"
