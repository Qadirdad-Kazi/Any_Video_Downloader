import os
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import yt_dlp
import os
import uuid
from typing import Dict, List, Optional

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
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'extract_flat': False,
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
    try:
        info = get_video_info(url)
        return JSONResponse(content=info)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/download")
async def download(
    url: str = Query(..., description="The URL of the video to download"),
    format_id: str = Query('best', description="The format ID to download")
):
    """Download the video in the specified format"""
    try:
        # Get video info first to get the title
        video_info = get_video_info(url)
        
        # Set up yt-dlp options
        ydl_opts = {
            'format': format_id,
            'outtmpl': os.path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s'),
            'merge_output_format': 'mp4',
            'quiet': True,
            'no_warnings': True,
        }
        
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

@app.get("/")
async def root():
    return {"message": "AnyDownloader API is running. Use the frontend to interact with the service."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
