# AnyDownloader

A modern web application that allows users to download videos from various platforms including YouTube, Facebook, Instagram, Twitter/X, TikTok, and more with a beautiful, responsive interface.

![AnyDownloader Screenshot](screenshot.png)

## ✨ Features

- 🎥 Download videos from 1000+ platforms
- 🎚️ Choose from multiple video/audio qualities
- 🎧 Extract audio-only (MP3) versions
- 🖥️ Responsive design works on all devices
- 🌓 Dark/Light mode support
- ⚡ Fast and efficient downloads
- 🔍 Smart format recommendations based on your OS
- 📱 Mobile-friendly interface
- 🔄 Real-time download progress
- 🛡️ Secure and private (no data stored)

## 🚀 Quick Start

### Prerequisites

- Python 3.7 or higher
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone the repository**:
   ```bash
   git clone (https://github.com/Qadirdad-Kazi/Any_Video_Downloader)
   cd AnyDownloader
   ```

2. **Set up the backend**:
   ```bash
   # Navigate to backend directory
   cd backend
   
   # Create and activate virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Start the backend server**:
   ```bash
   uvicorn app:app --reload
   ```
   The backend will be available at `http://localhost:8000`

4. **Open the frontend**:
   - Open `frontend/index.html` in your web browser
   - Or start a simple HTTP server:
     ```bash
     # From the project root
     python -m http.server 3000
     ```
     Then visit `http://localhost:3000/frontend`

## 🛠️ Usage

1. Enter a video URL in the input field
2. Click "Get Info" to fetch available formats
3. Select your preferred format (or use the recommended one)
4. Click "Download" to save the video/audio

## 🌐 Supported Platforms

- YouTube
- Facebook
- Instagram
- Twitter/X
- TikTok
- Vimeo
- Dailymotion
- And 1000+ more via yt-dlp

## 🛡️ Privacy

- All processing happens in your browser
- No video data is stored on any server
- No tracking or analytics

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Powered by [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- Icons by [Font Awesome](https://fontawesome.com/)

## Running the Application

1. Start the backend server:
   ```bash
   cd backend
   python app.py
   ```
   The backend will start on `http://localhost:8000`

2. Open the frontend:
   - For development: Open `frontend/index.html` directly in your browser
   - For production: Serve the frontend using a web server (e.g., Python's built-in server):
     ```bash
     cd frontend
     python -m http.server 3000
     ```
     Then open `http://localhost:3000` in your browser

## Usage

1. Paste a video URL from a supported platform into the input field
2. Click "Fetch Video" to get available formats
3. Select your preferred format (video or audio)
4. Click "Download" to start the download

## Supported Platforms

- YouTube
- Facebook
- Instagram
- Twitter/X
- TikTok
- And many more (powered by yt-dlp)

## Configuration

You can configure the application by creating a `.env` file in the `backend` directory with the following variables:

```
# Server configuration
HOST=0.0.0.0
PORT=8000

# Download settings
DOWNLOAD_DIR=downloads
MAX_CONCURRENT_DOWNLOADS=3
```

## Security Notes

- The application runs locally by default
- Video processing happens on the server
- No video content is stored permanently on the server
- Be cautious when deploying publicly due to potential abuse

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - Video download library
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [Font Awesome](https://fontawesome.com/) - Icons
