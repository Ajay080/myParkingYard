#!/bin/bash
# Download actual parking lot surveillance videos

echo "🅿️ Downloading real parking lot surveillance footage..."
echo ""

cd "$(dirname "$0")/app/videos"

# Check if yt-dlp is installed
if ! command -v yt-dlp &> /dev/null; then
    echo "📦 Installing yt-dlp for video downloads..."
    pip install yt-dlp
fi

echo "1️⃣ Downloading Parking Lot Video 1..."
yt-dlp -f "best[height<=480]" --output "parking_lot_1.mp4" "https://www.youtube.com/watch?v=MNn9qKG2UFI" 2>&1 | tail -5

echo ""
echo "2️⃣ Downloading Parking Lot Video 2..."
yt-dlp -f "best[height<=480]" --output "parking_lot_2.mp4" "https://www.youtube.com/watch?v=Fi_GN1pHCVc" 2>&1 | tail -5

echo ""
echo "3️⃣ Downloading Parking Lot Video 3..."
yt-dlp -f "best[height<=480]" --output "parking_lot_3.mp4" "https://www.youtube.com/watch?v=vw_3J2EDh30" 2>&1 | tail -5

echo ""
echo "✅ Parking lot videos downloaded!"
echo ""
echo "📂 Videos stored in: $(pwd)"
echo ""
echo "💡 Usage in /admin/cctv:"
echo "   - parking_lot_1.mp4 (Outdoor parking)"
echo "   - parking_lot_2.mp4 (Mall parking)"
echo "   - parking_lot_3.mp4 (Street parking)"
echo ""

ls -lh parking_lot_*.mp4 2>/dev/null || echo "Note: If download failed, check internet connection"
