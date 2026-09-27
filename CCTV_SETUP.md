# CCTV Live Streaming Setup

This system streams MP4 video files as live CCTV footage using OpenCV.

## Quick Setup

### 1. Add Video Files

Place your MP4 video files in:
```
cps_backend/app/videos/
```

Example videos you can use for testing:
- Download any sample MP4 from: https://sample-videos.com/
- Or use your own parking lot footage

### 2. Start Backend
```bash
cd cps_backend
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Configure Cameras

1. Login as Admin
2. Go to `/admin/cctv`
3. Click "Manage Cameras" tab
4. Add a new camera:
   - **Name**: e.g., "Parking Entrance"
   - **Video File**: Select from dropdown or enter filename (e.g., `sample.mp4`)
   - **Zone**: Optional - link to a parking zone

### 4. View Live Feeds

1. Go to "Live Feeds" tab
2. Click "Start Stream" on any camera
3. Video will stream continuously in a loop
4. Use fullscreen button for enlarged view

## Features

- ✅ **Live Streaming**: MP4 files stream as live footage
- ✅ **Loop Playback**: Videos automatically loop
- ✅ **Timestamp Overlay**: Real-time timestamp on video
- ✅ **Multi-Camera View**: Grid layout for multiple cameras
- ✅ **Fullscreen Mode**: Expand any camera feed
- ✅ **Start/Stop Controls**: Control streaming per camera
- ✅ **Zone Integration**: Link cameras to parking zones

## API Endpoints

- `GET /api/video/stream/{device_id}` - Video stream (MJPEG)
- `POST /api/video/start/{device_id}` - Start streaming
- `POST /api/video/stop/{device_id}` - Stop streaming
- `GET /api/video/status/{device_id}` - Get stream status
- `GET /api/video/list-available` - List available video files

## Technical Details

- **Backend**: FastAPI + OpenCV
- **Format**: MJPEG stream (motion JPEG)
- **Resolution**: Auto-resized to 1280x720 for performance
- **FPS**: Matches source video FPS
- **Codec**: JPEG compression at 85% quality

## Troubleshooting

### Video not streaming?
- Check video file exists in `cps_backend/app/videos/`
- Check backend terminal for errors
- Verify OpenCV is installed: `poetry show opencv-python`

### Stream keeps stopping?
- Check backend server is running
- Look for errors in browser console
- Verify camera is started (green "Live" badge)

### Adding Real RTSP Cameras
Edit device and set stream URL to:
```
rtsp://username:password@camera-ip:554/stream
```

OpenCV supports RTSP streams natively!
