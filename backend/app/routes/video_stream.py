from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
import cv2
import os
from pathlib import Path
import asyncio
from typing import Dict
import threading
import numpy as np
import datetime
import time

router = APIRouter(prefix="/api/video", tags=["video"])

# Store active streams
active_streams: Dict[str, dict] = {}
stream_locks = {}

# Video directory
VIDEO_DIR = Path("app/videos")
VIDEO_DIR.mkdir(parents=True, exist_ok=True)

def generate_dummy_frame(width=1280, height=720, device_name="CCTV Camera"):
    """Generate a realistic parking lot CCTV frame with cars, spots, and timestamp"""
    # Create asphalt-like background
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    frame[:] = (50, 50, 50)  # Dark gray for asphalt
    
    # Add texture/noise for realistic asphalt
    noise = np.random.randint(-10, 10, (height, width, 3), dtype=np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Add camera name and border
    cv2.rectangle(frame, (0, 0), (width, 80), (20, 20, 20), -1)
    cv2.putText(frame, device_name, (20, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2)
    
    # Add timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(frame, timestamp, (width - 300, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
    
    # Add "LIVE" indicator
    cv2.circle(frame, (width//2 - 50, 50), 8, (0, 0, 255), -1)
    cv2.putText(frame, "LIVE", (width//2 - 30, 55), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
    
    # Draw parking lot layout
    start_y = 150
    spot_width = 140
    spot_height = 200
    spots_per_row = 7
    rows = 2
    
    # Animation variables
    t = time.time()
    car_moving = int(t * 30) % (width + 200) - 200  # Car entering/leaving
    
    # Draw parking spots and cars
    spot_num = 1
    for row in range(rows):
        y_pos = start_y + row * (spot_height + 60)
        for col in range(spots_per_row):
            x_pos = 80 + col * (spot_width + 20)
            
            # Draw parking spot lines
            cv2.rectangle(frame, (x_pos, y_pos), 
                         (x_pos + spot_width, y_pos + spot_height), 
                         (255, 255, 255), 2)
            
            # Draw spot number
            cv2.putText(frame, f"{spot_num}", (x_pos + 55, y_pos + 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            # Randomly place "parked" cars (some spots occupied)
            is_occupied = (spot_num + int(t / 5)) % 3 != 0  # Changes slowly over time
            
            if is_occupied:
                # Draw parked car
                car_colors = [(180, 180, 200), (120, 120, 180), (100, 150, 200), 
                             (80, 100, 180), (200, 200, 220)]
                color = car_colors[spot_num % len(car_colors)]
                
                # Car body
                cv2.rectangle(frame, (x_pos + 20, y_pos + 40), 
                            (x_pos + spot_width - 20, y_pos + spot_height - 40), 
                            color, -1)
                cv2.rectangle(frame, (x_pos + 20, y_pos + 40), 
                            (x_pos + spot_width - 20, y_pos + spot_height - 40), 
                            (200, 200, 200), 2)
                
                # Windshield
                cv2.rectangle(frame, (x_pos + 30, y_pos + 60), 
                            (x_pos + spot_width - 30, y_pos + 110), 
                            (100, 150, 180), -1)
                
                # Status indicator
                cv2.circle(frame, (x_pos + spot_width - 15, y_pos + 15), 6, (0, 0, 255), -1)
            else:
                # Empty spot indicator
                cv2.circle(frame, (x_pos + spot_width - 15, y_pos + 15), 6, (0, 255, 0), -1)
            
            spot_num += 1
    
    # Draw car entering/leaving (animated)
    if 0 < car_moving < width:
        car_y = 100
        cv2.rectangle(frame, (car_moving, car_y), 
                     (car_moving + 120, car_y + 80), (150, 200, 100), -1)
        cv2.rectangle(frame, (car_moving, car_y), 
                     (car_moving + 120, car_y + 80), (200, 200, 200), 2)
        cv2.putText(frame, "→", (car_moving + 40, car_y + 50), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3)
    
    # Add road markings
    for i in range(0, width, 60):
        cv2.rectangle(frame, (i, height - 120), (i + 30, height - 110), 
                     (255, 255, 255), -1)
    
    # Add status footer
    cv2.rectangle(frame, (0, height - 60), (width, height), (20, 20, 20), -1)
    occupied = sum(1 for i in range(1, 15) if (i + int(t / 5)) % 3 != 0)
    cv2.putText(frame, f"Occupied: {occupied}/14", (20, height - 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
    cv2.putText(frame, f"Available: {14 - occupied}/14", (250, height - 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    cv2.putText(frame, "FPS: 30", (width - 150, height - 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    return frame

def generate_frames(video_path: str, device_id: str, device_name: str = "CCTV Camera", use_dummy: bool = False):
    """Generate video frames from MP4 file in a loop, or use dummy generator"""
    
    if use_dummy or not os.path.exists(video_path):
        # Use dummy video generator
        print(f"Starting DUMMY stream for device {device_id} - {device_name}")
        fps = 30
        frame_delay = 1.0 / fps
        
        try:
            while True:
                # Check if stream should stop
                if device_id in active_streams and not active_streams[device_id].get('active', False):
                    print(f"Stream stopped for device {device_id}")
                    break
                
                # Generate dummy frame
                frame = generate_dummy_frame(device_name=device_name)
                
                # Encode frame as JPEG
                ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                
                if not ret:
                    continue
                
                frame_bytes = buffer.tobytes()
                
                # Yield frame in multipart format
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                
                # Control frame rate
                time.sleep(frame_delay)
                
        except Exception as e:
            print(f"Error in dummy stream: {e}")
        finally:
            print(f"Stopped dummy stream for device {device_id}")
    
    else:
        # Use actual video file
        cap = cv2.VideoCapture(str(video_path))
        
        if not cap.isOpened():
            print(f"Error: Could not open video {video_path}, falling back to dummy")
            # Fallback to dummy
            yield from generate_frames(video_path, device_id, device_name, use_dummy=True)
            return
        
        # Get original FPS
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        frame_delay = 1.0 / fps
        
        print(f"Starting VIDEO stream for device {device_id} - FPS: {fps}")
        
        try:
            while True:
                # Check if stream should stop
                if device_id in active_streams and not active_streams[device_id].get('active', False):
                    print(f"Stream stopped for device {device_id}")
                    break
                
                ret, frame = cap.read()
                
                # Loop video if end reached
                if not ret:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                
                # Resize for better performance
                frame = cv2.resize(frame, (1280, 720))
                
                # Add timestamp overlay
                timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                cv2.putText(frame, timestamp, (10, 30), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                # Encode frame as JPEG
                ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                
                if not ret:
                    continue
                
                frame_bytes = buffer.tobytes()
                
                # Yield frame in multipart format
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                
                # Control frame rate
                time.sleep(frame_delay)
                
        finally:
            cap.release()
            print(f"Released video capture for device {device_id}")


@router.get("/stream/{device_id}")
async def stream_video(device_id: str):
    """Stream video for a specific device"""
    from app.database import db
    
    # Get device info
    device = await db.fetch_one(
        "SELECT id, name, stream_url FROM devices WHERE id = $1",
        device_id
    )
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    device_name = device['name']
    stream_url = device['stream_url']
    use_dummy = False
    
    # Check if stream_url is "dummy" or empty or invalid
    if not stream_url or stream_url.lower() == 'dummy':
        use_dummy = True
        video_path = ""
    elif not stream_url.startswith(('http://', 'https://', 'rtsp://')):
        # Assume it's a local file
        video_path = VIDEO_DIR / stream_url
        
        # If file doesn't exist, use dummy
        if not video_path.exists():
            print(f"Video file not found: {stream_url}. Using dummy stream.")
            use_dummy = True
            video_path = ""
    else:
        # External stream URL
        video_path = stream_url
    
    # Mark stream as active
    active_streams[device_id] = {'active': True, 'video_path': str(video_path)}
    
    return StreamingResponse(
        generate_frames(str(video_path), device_id, device_name, use_dummy),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.post("/start/{device_id}")
async def start_stream(device_id: str):
    """Start streaming for a device"""
    from app.database import db
    
    device = await db.fetch_one(
        "SELECT id, name, stream_url FROM devices WHERE id = $1",
        device_id
    )
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    active_streams[device_id] = {'active': True}
    
    return {
        "message": "Stream started",
        "device_id": device_id,
        "stream_url": f"/api/video/stream/{device_id}"
    }


@router.post("/stop/{device_id}")
async def stop_stream(device_id: str):
    """Stop streaming for a device"""
    if device_id in active_streams:
        active_streams[device_id]['active'] = False
        del active_streams[device_id]
    
    return {"message": "Stream stopped", "device_id": device_id}


@router.get("/status/{device_id}")
async def get_stream_status(device_id: str):
    """Get stream status for a device"""
    is_active = device_id in active_streams and active_streams[device_id].get('active', False)
    
    return {
        "device_id": device_id,
        "is_active": is_active,
        "stream_url": f"/api/video/stream/{device_id}" if is_active else None
    }


@router.get("/list-available")
async def list_available_videos():
    """List all available video files in the videos directory"""
    if not VIDEO_DIR.exists():
        return {"videos": []}
    
    videos = []
    for video_file in VIDEO_DIR.glob("*.mp4"):
        videos.append({
            "filename": video_file.name,
            "path": str(video_file.relative_to(VIDEO_DIR)),
            "size_mb": round(video_file.stat().st_size / (1024 * 1024), 2)
        })
    
    return {"videos": videos, "video_directory": str(VIDEO_DIR)}
