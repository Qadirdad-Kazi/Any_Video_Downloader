document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const videoUrlInput = document.getElementById('videoUrl');
    const fetchBtn = document.getElementById('fetchBtn');
    const loader = document.getElementById('loader');
    const videoInfo = document.getElementById('videoInfo');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const videoTitle = document.getElementById('videoTitle');
    const videoThumbnail = document.getElementById('thumbnail');
    const videoDuration = document.getElementById('videoDuration');
    const videoFormats = document.getElementById('videoFormats');
    const audioFormats = document.getElementById('audioFormats');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.format-options');
    const progressContainer = document.getElementById('downloadProgress');
    const progressBar = document.querySelector('.progress');
    const progressText = document.querySelector('.progress-text');

    // API Configuration
    const API_BASE_URL = 'http://localhost:8000';
    
    // Detect user's OS and browser
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    let userOS = 'other';
    
    // Map of OS codes to display names
    const osDisplayNames = {
        'windows': 'Windows',
        'mac': 'macOS',
        'ios': 'iOS',
        'android': 'Android',
        'linux': 'Linux',
        'other': 'your device'
    };

    // Detect OS
    if (/windows phone/i.test(userAgent)) {
        userOS = 'windows';
    } else if (/android/i.test(userAgent)) {
        userOS = 'android';
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        userOS = 'ios';
    } else if (/mac/i.test(userAgent)) {
        userOS = 'mac';
    } else if (/win/i.test(userAgent)) {
        userOS = 'windows';
    } else if (/linux/i.test(userAgent)) {
        userOS = 'linux';
    }
    
    // Preferred formats by OS
    const preferredFormats = {
        'mac': ['mp4', 'mov', 'm4v'],
        'windows': ['mp4', 'avi', 'wmv'],
        'ios': ['mp4', 'mov', 'm4v'],
        'android': ['mp4', '3gp', 'webm'],
        'linux': ['mp4', 'webm', 'mkv'],
        'other': ['mp4', 'webm', 'mkv']
    };

    // Store the current video URL
    let currentVideoUrl = '';
    
    // Event Listeners
    fetchBtn.addEventListener('click', async () => {
        try {
            // Try to read URL from clipboard
            const text = await navigator.clipboard.readText();
            if (text && (text.includes('http://') || text.includes('https://'))) {
                currentVideoUrl = text;
                handleFetchClick();
            } else {
                showError('No valid URL found in clipboard. Please copy a video URL first.');
            }
        } catch (err) {
            console.log('Could not read clipboard contents:', err);
            showError('Could not access clipboard. Please make sure to allow clipboard access.');
        }
    });
    
    // Make the button a drop target for URLs
    fetchBtn.addEventListener('dragover', (e) => {
        e.preventDefault();
        fetchBtn.classList.add('pulse');
    });
    
    fetchBtn.addEventListener('dragleave', () => {
        fetchBtn.classList.remove('pulse');
    });
    
    fetchBtn.addEventListener('drop', async (e) => {
        e.preventDefault();
        fetchBtn.classList.remove('pulse');
        
        // Handle dropped text/URL
        const text = e.dataTransfer.getData('text/plain');
        if (text && (text.includes('http://') || text.includes('https://'))) {
            currentVideoUrl = text;
            handleFetchClick();
        } else {
            showError('Please drop a valid URL');
        }
    });
    
    // Make the entire document a drop target for URLs
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
    });

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.add('hidden'));
            
            // Add active class to clicked button and show corresponding content
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}Formats`).classList.remove('hidden');
        });
    });

    // Functions
    async function handleFetchClick() {
        const url = currentVideoUrl.trim();
        if (!url) {
            showError('No URL provided. Please copy a video URL and click the button.');
            return;
        }

        // Show loader and hide any previous results/errors
        showLoader();
        hideError();
        hideVideoInfo();

        try {
            // Fetch video info from the backend
            const videoData = await fetchVideoInfo(url);
            displayVideoInfo(videoData);
        } catch (error) {
            console.error('Error fetching video info:', error);
            showError(error.message || 'Failed to fetch video information. Please check the URL and try again.');
        } finally {
            hideLoader();
        }
    }

    async function fetchVideoInfo(url) {
        const response = await fetch(`${API_BASE_URL}/api/info?url=${encodeURIComponent(url)}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Failed to fetch video information');
        }
        
        return await response.json();
    }

    function displayVideoInfo(data) {
        // Set video details
        videoTitle.textContent = data.title || 'Untitled Video';
        
        if (data.thumbnail) {
            videoThumbnail.src = data.thumbnail;
            videoThumbnail.style.display = 'block';
        } else {
            videoThumbnail.style.display = 'none';
        }
        
        if (data.duration) {
            const minutes = Math.floor(data.duration / 60);
            const seconds = data.duration % 60;
            videoDuration.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            videoDuration.textContent = 'Duration not available';
        }
        
        // Display video formats
        displayFormats(data.formats, videoFormats, 'video');
        
        // Display audio formats
        if (data.audio_formats && data.audio_formats.length > 0) {
            displayFormats(data.audio_formats, audioFormats, 'audio');
        } else {
            // If no audio formats, hide the audio tab
            document.querySelector('.tab-btn[data-tab="audio"]').style.display = 'none';
        }
        
        // Show the video info section
        videoInfo.classList.remove('hidden');
    }

    function getFormatScore(format, os) {
        const ext = format.ext || '';
        const osPrefs = preferredFormats[os] || [];
        
        // Higher score for preferred formats
        const formatIndex = osPrefs.findIndex(pref => ext.includes(pref));
        if (formatIndex !== -1) {
            return 100 - formatIndex; // Higher score for earlier in the preferred list
        }
        
        // Prefer higher quality
        const qualityScore = format.height ? parseInt(format.height) : 0;
        
        // Prefer mp4 as a fallback
        const extensionScore = ext === 'mp4' ? 50 : 0;
        
        return qualityScore + extensionScore;
    }
    
    function displayFormats(formats, container, type) {
        // Clear previous formats
        container.innerHTML = '';
        
        if (!formats || formats.length === 0) {
            container.innerHTML = '<p>No formats available for this type.</p>';
            return;
        }
        
        // Sort formats based on OS preference and quality
        // Sort formats by OS preference and quality
        const sortedFormats = [...formats].sort((a, b) => {
            // First, sort by OS preference score
            const scoreA = getFormatScore(a, userOS);
            const scoreB = getFormatScore(b, userOS);
            
            // If there's a significant difference in OS preference, use that
            if (Math.abs(scoreA - scoreB) > 50) {
                return scoreB - scoreA;
            }
            
            // Otherwise, sort by quality/resolution for videos
            if (type === 'video') {
                const resA = a.resolution ? parseInt(a.resolution) : 0;
                const resB = b.resolution ? parseInt(b.resolution) : 0;
                if (resA !== resB) {
                    return resB - resA;
                }
            }
            
            // For audio or if resolution is the same, sort by filesize
            const sizeA = a.filesize || 0;
            const sizeB = b.filesize || 0;
            return sizeB - sizeA;
        });
        
        // Get the best format for this OS
        const bestFormat = sortedFormats[0];
        const bestFormatExt = (bestFormat.ext || '').toUpperCase();
        
        // Create format options
        sortedFormats.forEach((format, index) => {
            const formatEl = document.createElement('div');
            const isRecommended = index === 0;
            formatEl.className = `format-option ${isRecommended ? 'recommended' : ''}`;
            
            // Format details
            let formatDetails = '';
            let formatName = '';
            
            if (type === 'video') {
                const resolution = format.resolution || 'Unknown';
                const quality = format.format_note ? ` (${format.format_note})` : '';
                formatName = `${resolution}${quality}`;
                formatDetails = `Format: ${format.ext.toUpperCase()}`;
                
                if (format.filesize) {
                    const sizeMB = (format.filesize / (1024 * 1024)).toFixed(1);
                    formatDetails += ` • ${sizeMB} MB`;
                }
            } else {
                formatName = 'Audio Only';
                formatDetails = `Format: ${format.ext.toUpperCase()}`;
                
                if (format.filesize) {
                    const sizeMB = (format.filesize / (1024 * 1024)).toFixed(1);
                    formatDetails += ` • ${sizeMB} MB`;
                }
            }
            
            formatEl.innerHTML = `
                <div class="format-header">
                    <h4>${formatName}</h4>
                    ${isRecommended ? `<span class="recommended-tag"><i class="fas fa-star"></i> Best for ${osDisplayNames[userOS]}</span>` : ''}
                </div>
                <p>${formatDetails}</p>
                <button class="download-btn" data-format-id="${format.format_id}" ${isRecommended ? 'data-recommended="true"' : ''}>
                    <i class="fas fa-download"></i> ${isRecommended ? 'Download' : 'Download ' + (format.ext || '').toUpperCase()}
                </button>
            `;
            
            // Add click event to download button
            const downloadBtn = formatEl.querySelector('.download-btn');
            downloadBtn.addEventListener('click', () => handleDownload(format.format_id));
            
            container.appendChild(formatEl);
        });
    }

    async function handleDownload(formatId) {
        const url = videoUrlInput.value.trim();
        if (!url || !formatId) return;
        
        try {
            showProgress('Preparing download...');
            
            // Get the video info to get the title for the filename
            const videoInfo = await fetchVideoInfo(url);
            const title = videoInfo.title || 'video';
            
            // Ensure the format is compatible with QuickTime
            const formatInfo = [...videoInfo.formats, ...(videoInfo.requested_formats || [])]
                .find(f => f.format_id === formatId);
            
            // Determine the best file extension
            let fileExt = 'mp4'; // Default to mp4 for better compatibility
            if (formatInfo) {
                if (formatInfo.vcodec === 'none') {
                    fileExt = 'm4a'; // Audio only
                } else if (formatInfo.ext) {
                    fileExt = formatInfo.ext === 'webm' ? 'mp4' : formatInfo.ext; // Convert webm to mp4 for better compatibility
                }
            }
            
            // Clean up the filename
            const cleanTitle = title.replace(/[^\w\s-]/gi, '_').replace(/\s+/g, '_');
            const filename = `${cleanTitle}.${fileExt}`;
            
            // Create a temporary anchor element for the download
            const a = document.createElement('a');
            
            // Set up the download URL with proper parameters
            const downloadUrl = `${API_BASE_URL}/api/download?url=${encodeURIComponent(url)}&format_id=${formatId}`;
            
            // Set the download attributes
            a.href = downloadUrl;
            a.download = filename;
            a.style.display = 'none';
            
            // Show better progress for larger files
            showProgress(0, 'Starting download...');
            
            // Use fetch API for better progress tracking
            const response = await fetch(downloadUrl);
            const contentLength = response.headers.get('content-length');
            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;
            
            while (true) {
                const {done, value} = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                
                if (contentLength) {
                    const percentComplete = Math.round((receivedLength / contentLength) * 100);
                    showProgress(percentComplete, `Downloading: ${percentComplete}%`);
                }
            }
            
            // Combine chunks into a single blob
            const blob = new Blob(chunks);
            const blobUrl = window.URL.createObjectURL(blob);
            
            // Create and trigger the download
            a.href = blobUrl;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
                showProgress(100, 'Download complete!');
                setTimeout(hideProgress, 2000);
            }, 100);
            
        } catch (error) {
            console.error('Download error:', error);
            showError(error.message || 'Failed to download video. Please try again.');
            hideProgress();
        }
    }

    // UI Helper Functions
    function showLoader() {
        loader.classList.remove('hidden');
        fetchBtn.disabled = true;
        fetchBtn.classList.add('loading');
        fetchBtn.querySelector('i').className = 'fas fa-spinner';
        fetchBtn.querySelector('span').textContent = 'Fetching...';
    }

    function hideLoader() {
        loader.classList.add('hidden');
        fetchBtn.disabled = false;
        fetchBtn.classList.remove('loading');
        fetchBtn.querySelector('i').className = 'fas fa-play';
        fetchBtn.querySelector('span').textContent = 'Fetch Video';
    }

    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        // Auto-hide error after 5 seconds
        setTimeout(hideError, 5000);
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    function hideVideoInfo() {
        videoInfo.classList.add('hidden');
    }

    function showProgress(message) {
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = message;
    }

    function updateProgress(percent, message) {
        progressBar.style.width = `${percent}%`;
        if (message) progressText.textContent = message;
    }

    function hideProgress() {
        progressContainer.classList.add('hidden');
    }

    // Initialize tabs
    document.querySelector('.tab-btn[data-tab="video"]').classList.add('active');
    document.getElementById('videoFormats').classList.remove('hidden');
});
