# Sample Videos Directory

Place your MP4 video files here to use them as CCTV streams.

## Quick Test

Download a sample video:
```bash
# Using wget
wget https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4 -O sample.mp4

# Or using curl
curl -o sample.mp4 https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
```

## Supported Formats
- MP4 (.mp4)
- AVI (.avi)
- MOV (.mov)
- MKV (.mkv)
- Any format supported by OpenCV

## Recommendations
- Resolution: 720p or 1080p
- FPS: 25-30 fps
- File size: < 100MB for smooth streaming
- Duration: Any (will loop automatically)

## Real Camera Streams
You can also use RTSP camera URLs directly:
```
rtsp://username:password@192.168.1.100:554/stream
```
