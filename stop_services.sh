#!/bin/bash

# Car Parking System - Stop Services Script

echo "🛑 Stopping Car Parking System Services..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Function to kill process on port
kill_port() {
    PORT=$1
    NAME=$2
    PID=$(lsof -ti:$PORT)
    if [ ! -z "$PID" ]; then
        kill -9 $PID 2>/dev/null
        echo -e "${GREEN}✓ Stopped $NAME (Port $PORT, PID: $PID)${NC}"
    else
        echo -e "${RED}✗ No process found on port $PORT${NC}"
    fi
}

# Stop backend (port 8000)
kill_port 8000 "Backend"

# Stop frontend (port 5173)
kill_port 5173 "Frontend"

echo ""
echo -e "${GREEN}All services stopped${NC}"
