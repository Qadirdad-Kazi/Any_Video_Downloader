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

def get_video_info(url: str) -> dict:
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'skip_download': True,
        'extract_flat': False,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                'title': info.get('title', 'video'),
                'thumbnail': info.get('thumbnail'),
                'duration': info.get('duration'),
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

@app.get("/")
async def root():
    return {"message": "AnyDownloader API is running. Use the frontend to interact with the service."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
