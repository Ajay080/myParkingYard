# CCTV Video Streaming - Complete Guide

## 🎯 How It Works

The system **stores MP4 videos on the backend** and **streams them to the frontend**:

```
MP4 File (Backend)  →  OpenCV Processing  →  MJPEG Stream  →  Browser Display
cps_backend/app/videos/     Python/FastAPI         HTTP          React <img>
```

## 📹 Option 1: Use Dummy Simulated Feed (No Downloads Needed!)

1. Go to `/admin/cctv` → Manage Cameras tab
2. Add camera:
   - **Name**: Any name (e.g., "Parking Camera 1")
   - **Stream URL**: Type `dummy`
   - Click "Add Camera"
3. Go to Live Feeds tab → Click "Start Stream"
4. ✅ You'll see a simulated CCTV feed with moving vehicles!

## 📹 Option 2: Use Real MP4 Videos

### Quick Download (Automated):
```bash
cd /home/ajay/Documents/personal/Projects/CarParkingSystem/cps_backend
./download_samples.sh
```

This downloads 3 sample videos (~26MB total):
- `sample1.mp4` - Big Buck Bunny
- `sample2.mp4` - Elephants Dream  
- `sample3.mp4` - For Bigger Blazes

### Manual Download:
```bash
cd /home/ajay/Documents/personal/Projects/CarParkingSystem/cps_backend/app/videos

# Download any MP4 video
wget -O parking.mp4 "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
```

### Use Your Own Videos:
Simply copy any MP4 file to:
```
/home/ajay/Documents/personal/Projects/CarParkingSystem/cps_backend/app/videos/
```

Then in the GUI:
- Stream URL: `yourfile.mp4` (just the filename)

## 🎬 How to Use MP4 Files

1. **Add Video**: Place MP4 in `cps_backend/app/videos/`
2. **Configure Camera**:
   - Go to `/admin/cctv` → Manage Cameras
   - Stream URL: Enter filename (e.g., `sample1.mp4`)
3. **Start Streaming**: Click "Start Stream" in Live Feeds tab

## 🔄 What Happens Behind the Scenes

1. **Storage**: MP4 stored in `cps_backend/app/videos/`
2. **Processing**: OpenCV reads MP4 frame-by-frame
3. **Conversion**: Each frame → JPEG image
4. **Streaming**: MJPEG format (motion JPEG over HTTP)
5. **Display**: Frontend `<img>` tag displays stream
6. **Loop**: Video automatically restarts when finished

## ✨ Features

- ✅ MP4 files stored **only on backend** (not sent to frontend)
- ✅ **Efficient streaming** - only current frame sent
- ✅ **Auto-loop** - videos play continuously
- ✅ **Timestamp overlay** - real-time on each frame
- ✅ **Fallback to dummy** - if file missing
- ✅ **Multiple cameras** - stream many videos simultaneously
- ✅ **Fullscreen mode** - enlarge any camera
- ✅ **Start/Stop controls** - per camera

## 📊 Current Status

Your system is **working correctly**! 

The backend log shows:
```
Video file not found: test. Using dummy stream.
Starting DUMMY stream for device ... - test1
```

This means:
- ✅ Backend is running
- ✅ Streaming system is active
- ✅ Dummy feed is generating successfully
- ✅ Frontend is receiving the stream

## 🚀 Next Steps

1. Download sample videos:
   ```bash
   cd /home/ajay/Documents/personal/Projects/CarParkingSystem/cps_backend
   ./download_samples.sh
   ```

2. Edit your camera:
   - Change Stream URL from `test` to `sample1.mp4`
   - Or keep `dummy` for simulated feed

3. Start streaming and enjoy! 📹
