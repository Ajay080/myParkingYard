#!/bin/bash
# Script to download sample parking lot videos for CCTV simulation

echo "📹 Downloading sample parking lot videos..."
echo ""

cd "$(dirname "$0")/app/videos"

# Download sample video 1 - Big Buck Bunny (for testing)
echo "1️⃣ Downloading sample1.mp4 (Big Buck Bunny - 10MB)..."
wget -O sample1.mp4 "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" 2>&1 | grep -E "saved|failed"

# Download sample video 2 - Elephant Dream
echo ""
echo "2️⃣ Downloading sample2.mp4 (Elephant Dream - 7MB)..."
wget -O sample2.mp4 "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" 2>&1 | grep -E "saved|failed"

# Download sample video 3 - For Bigger Blazes
echo ""
echo "3️⃣ Downloading sample3.mp4 (For Bigger Blazes - 9MB)..."
wget -O sample3.mp4 "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" 2>&1 | grep -E "saved|failed"

echo ""
echo "✅ Sample videos downloaded!"
echo ""
echo "📂 Videos stored in: $(pwd)"
echo ""
echo "💡 Usage:"
echo "   - Go to /admin/cctv → Manage Cameras"
echo "   - Add camera with Stream URL: sample1.mp4"
echo "   - Or use 'dummy' for simulated feed"
echo ""

ls -lh *.mp4 2>/dev/null || echo "Note: If download failed, you can manually place MP4 files here"
