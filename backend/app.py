import os
import uuid
import time
import asyncio
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import yt_dlp

app = FastAPI(title="AnyDownloader API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure downloads directory exists
DOWNLOADS_DIR = "downloads"
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

# Simple in-memory cache for video info
INFO_CACHE = {}
CACHE_TTL = 3600  # 1 hour in seconds

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_progress(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

def is_playlist(url: str) -> bool:
    """Check if URL is a playlist"""
    return 'playlist' in url.lower() or 'list=' in url.lower()

def get_playlist_info(url: str) -> dict:
    """Extract playlist information and all videos"""
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,  # Don't download, just get metadata
        'skip_download': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Check if it's actually a playlist
            if info.get('_type') != 'playlist':
                return None
            
            videos = []
            for entry in info.get('entries', [])[:50]:  # Limit to first 50 videos
                if entry:
                    videos.append({
                        'id': entry.get('id'),
                        'title': entry.get('title', 'Unknown'),
                        'url': entry.get('url') or entry.get('webpage_url') or f"https://www.youtube.com/watch?v={entry.get('id')}",
                        'duration': entry.get('duration', 0),
                        'thumbnail': entry.get('thumbnail') or entry.get('thumbnails', [{}])[-1].get('url'),
                    })
            
            return {
                'type': 'playlist',
                'title': info.get('title', 'Playlist'),
                'playlist_count': info.get('playlist_count', len(videos)),
                'uploader': info.get('uploader', 'Unknown'),
                'videos': videos
            }
    except Exception as e:
        print(f"Playlist extraction error: {str(e)}")
        return None

def get_video_info(url: str) -> dict:
    """Get information for a single video"""
    ydl_opts = {
        'quiet': False,
        'no_warnings': False,
        'skip_download': True,
        'extract_flat': False,
        'verbose': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # If it's a playlist, handle it differently
            if info.get('_type') == 'playlist':
                return get_playlist_info(url)
            
            return {
                'type': 'video',
                'title': info.get('title', 'video'),
                'thumbnail': info.get('thumbnail'),
                'duration': info.get('duration'),
                'webpage_url': info.get('webpage_url', url),
                'formats': [
                    {
                        'format_id': fmt.get('format_id'),
                        'ext': fmt.get('ext', 'mp4'),
                        'resolution': fmt.get('resolution', 'unknown'),
                        'filesize': fmt.get('filesize_approx', 0) or fmt.get('filesize', 0),
                        'format_note': fmt.get('format_note', 'unknown'),
                    }
                    for fmt in info.get('formats', [])
                    if fmt.get('vcodec') != 'none'  # Only video formats
                ],
                'audio_formats': [
                    {
                        'format_id': fmt.get('format_id'),
                        'ext': fmt.get('audio_ext', 'mp3'),
                        'filesize': fmt.get('filesize_approx', 0) or fmt.get('filesize', 0),
                        'format_note': 'audio only',
                    }
                    for fmt in info.get('formats', [])
                    if fmt.get('vcodec') == 'none' and fmt.get('acodec') != 'none'
                ]
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error getting video info: {str(e)}")

def download_video(url: str, format_id: str = 'best') -> str:
    filename = f"{uuid.uuid4()}.%(ext)s"
    filepath = os.path.join(DOWNLOADS_DIR, filename)
    
    ydl_opts = {
        'format': format_id,
        'outtmpl': filepath,
        'merge_output_format': 'mp4',
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            downloaded_file = ydl.prepare_filename(info).replace('.webm', '.mp4').replace('.m4a', '.mp3')
            return downloaded_file
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error downloading video: {str(e)}")

@app.get("/api/info")
async def get_info(url: str = Query(..., description="The URL of the video to download")):
    """Get information about the video including available formats"""
    # Check cache
    current_time = time.time()
    if url in INFO_CACHE:
        cached_data, timestamp = INFO_CACHE[url]
        if current_time - timestamp < CACHE_TTL:
            return JSONResponse(content=cached_data)
        else:
            del INFO_CACHE[url]
            
    try:
        info = get_video_info(url)
        INFO_CACHE[url] = (info, current_time)
        return JSONResponse(content=info)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/download")
async def download(
    url: str = Query(..., description="The URL of the video to download"),
    format_id: str = Query('best', description="The format ID to download"),
    client_id: str = Query(None, description="Client ID for WebSocket progress")
):
    """Download the video in the specified format"""
    try:
        # Get video info first to get the title
        video_info = get_video_info(url)
        
        # Smart format selection - merge video with audio if needed
        # If format_id is a video-only format, merge with best audio
        if format_id and format_id != 'best':
            format_string = f'{format_id}+bestaudio/best'
        else:
            format_string = 'bestvideo+bestaudio/best'
        
        # Set up yt-dlp options
        ydl_opts = {
            'format': format_string,
            'outtmpl': os.path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s'),
            'merge_output_format': 'mp4',
            'quiet': False,  # Show output for debugging
            'no_warnings': False,
            'postprocessors': [{
                'key': 'FFmpegVideoConvertor',
                'preferedformat': 'mp4',
            }],
        }
        
        # Add progress hook if client_id is provided
        if client_id:
            def progress_hook(d):
                if d['status'] == 'downloading':
                    try:
                        # Extract percentage safely
                        percent_str = d.get('_percent_str', '0.0%').strip('\x1b[0;94m').strip('\x1b[0m').replace('%', '').strip()
                        speed = d.get('_speed_str', 'N/A').strip('\x1b[0;92m').strip('\x1b[0m')
                        eta = d.get('_eta_str', 'N/A').strip('\x1b[0;93m').strip('\x1b[0m')
                        
                        try:
                            percent = float(percent_str)
                        except ValueError:
                            percent = 0.0

                        loop = asyncio.get_event_loop()
                        if loop.is_running():
                            loop.create_task(manager.send_progress({
                                "status": "downloading",
                                "percent": percent,
                                "speed": speed,
                                "eta": eta,
                                "filename": d.get('filename', '')
                            }, client_id))
                    except Exception as e:
                        print(f"Hook error: {e}")
                        
                elif d['status'] == 'finished':
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        loop.create_task(manager.send_progress({
                            "status": "converting",
                            "percent": 100,
                            "message": "Download finished, processing/converting..."
                        }, client_id))

            ydl_opts['progress_hooks'] = [progress_hook]
        
        # Download the video
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            
            # Clean up the filename for download
            safe_title = "".join(c if c.isalnum() or c in ' ._-' else '_' for c in info.get('title', 'video'))
            ext = os.path.splitext(filename)[1].replace('.webm', '.mp4').replace('.m4a', '.mp3')
            download_filename = f"{safe_title}{ext}"
            
            # Return the file with proper headers
            return FileResponse(
                filename,
                media_type="application/octet-stream",
                filename=download_filename,
                headers={
                    'Content-Disposition': f'attachment; filename="{download_filename}"',
                    'Access-Control-Expose-Headers': 'Content-Disposition'
                }
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/api/batch-download")
async def batch_download(request: dict):
    """Download multiple videos in batch"""
    try:
        videos = request.get('videos', [])
        format_id = request.get('format_id', 'best')
        
        if not videos:
            raise HTTPException(status_code=400, detail="No videos provided")
        
        results = []
        for video in videos:
            video_url = video.get('url')
            if not video_url:
                continue
                
            try:
                # Get video info
                video_info = get_video_info(video_url)
                if video_info.get('type') == 'playlist':
                    # Skip nested playlists
                    continue
                
                # Generate unique filename
                safe_title = "".join(c if c.isalnum() or c in ' ._-' else '_' for c in video_info.get('title', 'video'))
                
                results.append({
                    'url': video_url,
                    'title': video_info.get('title'),
                    'status': 'ready',
                    'filename': safe_title
                })
            except Exception as e:
                results.append({
                    'url': video_url,
                    'title': video.get('title', 'Unknown'),
                    'status': 'error',
                    'error': str(e)
                })
        
        return JSONResponse(content={'results': results})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch download error: {str(e)}")

@app.websocket("/ws/progress/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)

@app.get("/")
async def root():
    return {"message": "AnyDownloader API is running. Use the frontend to interact with the service."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
