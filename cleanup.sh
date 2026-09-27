#!/bin/bash
# Cleanup script to remove unnecessary folders and files

echo "🧹 Cleaning up Car Parking System project..."
echo ""

cd "$(dirname "$0")"

# Remove old duplicate folders
echo "📁 Removing old duplicate folders..."
if [ -d "car_parking_system" ]; then
    rm -rf car_parking_system
    echo "  ✅ Removed car_parking_system/"
fi

if [ -d "car_parking_system_backend" ]; then
    rm -rf car_parking_system_backend
    echo "  ✅ Removed car_parking_system_backend/"
fi

# Remove log files
echo ""
echo "📄 Removing log files..."
if [ -f "backend.log" ]; then
    rm backend.log
    echo "  ✅ Removed backend.log"
fi

if [ -f "frontend.log" ]; then
    rm frontend.log
    echo "  ✅ Removed frontend.log"
fi

echo ""
echo "✨ Cleanup complete!"
echo ""
echo "📊 Current project structure:"
echo "  ├── cps_gui/          (Frontend - React + Vite)"
echo "  ├── cps_backend/      (Backend - FastAPI + PostgreSQL)"
echo "  ├── *.md              (Documentation files)"
echo "  └── *.sh              (Shell scripts)"
echo ""
echo "🚀 Ready to use! Run:"
echo "  • Backend: cd cps_backend && uvicorn app.main:app --reload"
echo "  • Frontend: cd cps_gui && npm run dev"
