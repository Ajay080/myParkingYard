#!/bin/bash
# Download actual parking lot footage from free sources

echo "🅿️ Downloading parking lot surveillance videos..."
echo ""

cd "$(dirname "$0")/app/videos"

# Remove old generic videos
rm -f sample1.mp4 sample2.mp4 sample3.mp4 2>/dev/null

# Download parking lot videos from Pexels (free stock videos)
echo "1️⃣ Downloading parking_lot_view1.mp4..."
wget --user-agent="Mozilla/5.0" -O parking_lot_view1.mp4 "https://videos.pexels.com/video-files/3843433/3843433-uhd_2560_1440_25fps.mp4" || echo "⚠️ Download 1 failed"

echo ""
echo "2️⃣ Downloading parking_lot_view2.mp4..."
wget --user-agent="Mozilla/5.0" -O parking_lot_view2.mp4 "https://videos.pexels.com/video-files/8251286/8251286-hd_1920_1080_30fps.mp4" || echo "⚠️ Download 2 failed"

echo ""
echo "3️⃣ Downloading parking_lot_view3.mp4..."
wget --user-agent="Mozilla/5.0" -O parking_lot_view3.mp4 "https://videos.pexels.com/video-files/6195254/6195254-hd_1280_720_25fps.mp4" || echo "⚠️ Download 3 failed"

echo ""
echo "✅ Download complete!"
echo ""
echo "📂 Location: $(pwd)"
echo ""
echo "💡 Use these filenames in /admin/cctv:"
echo "   - parking_lot_view1.mp4 (Aerial parking view)"
echo "   - parking_lot_view2.mp4 (Street parking)"  
echo "   - parking_lot_view3.mp4 (Parking entrance)"
echo ""

ls -lh parking_lot_*.mp4 2>/dev/null || echo "No files found"
