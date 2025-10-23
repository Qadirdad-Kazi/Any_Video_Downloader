// Version check - if you see a different version in console, clear cache!
console.log('%c✅ AnyDownloader v2.1 Loaded', 'color: #00f7ff; font-size: 16px; font-weight: bold');

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const videoUrlInput = document.getElementById('videoUrl');
    const fetchBtn = document.getElementById('fetchBtn');
    const pasteBtn = document.getElementById('pasteBtn');
    const clearBtn = document.getElementById('clearBtn');
    const loader = document.getElementById('loader');
    const backendStatus = document.getElementById('backendStatus');
    const backendStatusText = document.getElementById('backendStatusText');
    const videoInfo = document.getElementById('videoInfo');
    const playlistInfo = document.getElementById('playlistInfo');
    const playlistTitle = document.getElementById('playlistTitle');
    const playlistCount = document.getElementById('playlistCount');
    const playlistUploader = document.getElementById('playlistUploader');
    const playlistVideos = document.getElementById('playlistVideos');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const batchDownloadBtn = document.getElementById('batchDownloadBtn');
    const selectedCount = document.getElementById('selectedCount');
    const playlistFormatSelect = document.getElementById('playlistFormatSelect');
    const batchProgress = document.getElementById('batchProgress');
    const batchProgressList = document.getElementById('batchProgressList');
    const listViewBtn = document.getElementById('listViewBtn');
    const gridViewBtn = document.getElementById('gridViewBtn');
    const videoPreviewModal = document.getElementById('videoPreviewModal');
    const closePreviewModal = document.getElementById('closePreviewModal');
    const previewTitle = document.getElementById('previewTitle');
    const previewDuration = document.getElementById('previewDuration');
    const previewUrl = document.getElementById('previewUrl');
    const videoPlayerContainer = document.getElementById('videoPlayerContainer');
    const previewDownloadBtn = document.getElementById('previewDownloadBtn');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    const errorSolution = document.getElementById('errorSolution');
    const errorActions = document.getElementById('errorActions');
    const retryBtn = document.getElementById('retryBtn');
    const dismissErrorBtn = document.getElementById('dismissErrorBtn');
    const networkStatus = document.getElementById('networkStatus');
    const themeToggle = document.getElementById('themeToggle');
    const skeletonLoader = document.getElementById('skeletonLoader');
    const skeletonPlaylist = document.getElementById('skeletonPlaylist');
    const installPrompt = document.getElementById('installPrompt');
    const installBtn = document.getElementById('installBtn');
    const dismissInstallBtn = document.getElementById('dismissInstallBtn');
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

    // Store the current video URL and playlist data
    let currentVideoUrl = '';
    let currentPlaylistData = null;
    let selectedVideos = new Set();
    let currentPreviewVideo = null;
    let playlistViewMode = 'list'; // 'list' or 'grid'
    let lastFailedAction = null; // Store last failed action for retry
    let retryCount = 0;
    const MAX_RETRIES = 3;
    let isOnline = navigator.onLine;
    let deferredInstallPrompt = null;
    
    // Helper function to validate URL
    function isValidVideoUrl(text) {
        if (!text || typeof text !== 'string') return false;
        
        // Remove whitespace
        text = text.trim();
        
        // Must contain http:// or https://
        if (!text.includes('http://') && !text.includes('https://')) return false;
        
        // Should not be too long (error messages can be very long)
        if (text.length > 500) return false;
        
        // Should not contain error indicators
        const errorIndicators = ['error', 'failed', 'TypeError', 'cannot read', '404', 'ServiceWorker'];
        if (errorIndicators.some(indicator => text.toLowerCase().includes(indicator.toLowerCase()))) {
            return false;
        }
        
        // Try to create URL object to validate
        try {
            const url = new URL(text);
            return true;
        } catch {
            return false;
        }
    }

    // Check backend connection
    async function checkBackendConnection() {
        try {
            const response = await fetch(`${API_BASE_URL}/`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            
            if (response.ok) {
                backendStatus.classList.add('connected');
                backendStatus.classList.remove('disconnected');
                backendStatusText.textContent = 'Backend Connected';
                return true;
            } else {
                throw new Error('Backend returned error');
            }
        } catch (error) {
            backendStatus.classList.add('disconnected');
            backendStatus.classList.remove('connected');
            backendStatusText.textContent = 'Backend Disconnected';
            console.error('Backend connection failed:', error);
            
            showError('Cannot connect to backend server. Please make sure the backend is running on port 8000.', {
                solution: 'Start the backend by running: python backend/app.py',
                type: 'warning',
                autoHide: false
            });
            
            return false;
        }
    }

    // Periodic backend health check
    function startBackendHealthCheck() {
        checkBackendConnection();
        setInterval(checkBackendConnection, 30000); // Check every 30 seconds
    }

    // Event Listeners
    
    // Input field changes
    videoUrlInput.addEventListener('input', () => {
        if (videoUrlInput.value.trim()) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    });
    
    // Allow Enter key to fetch
    videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            fetchBtn.click();
        }
    });
    
    // Clear button
    clearBtn.addEventListener('click', () => {
        videoUrlInput.value = '';
        clearBtn.classList.add('hidden');
        videoUrlInput.focus();
        currentVideoUrl = '';
    });
    
    // Paste button
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (isValidVideoUrl(text)) {
                videoUrlInput.value = text.trim();
                clearBtn.classList.remove('hidden');
                videoUrlInput.focus();
            } else {
                showError('No valid video URL found in clipboard.', {
                    solution: 'Copy a video URL first (e.g., from YouTube, TikTok, Instagram), then click the Paste button. Or paste directly into the input field with Ctrl+V.',
                    type: 'info',
                    autoHide: true
                });
            }
        } catch (err) {
            console.log('Could not read clipboard contents:', err);
            showError('Could not access clipboard.', {
                solution: 'Allow clipboard access when prompted, or paste directly into the input field using Ctrl+V (Cmd+V on Mac).',
                type: 'warning',
                autoHide: false
            });
        }
    });
    
    // Fetch button
    fetchBtn.addEventListener('click', () => {
        const url = videoUrlInput.value.trim();
        if (isValidVideoUrl(url)) {
            currentVideoUrl = url;
            handleFetchClick();
        } else if (url) {
            showError('Please enter a valid video URL.');
        } else {
            showError('Please enter a video URL to continue.');
        }
    });
    
    // Make the input field a drop target for URLs
    videoUrlInput.addEventListener('dragover', (e) => {
        e.preventDefault();
        videoUrlInput.classList.add('drag-over');
    });
    
    videoUrlInput.addEventListener('dragleave', () => {
        videoUrlInput.classList.remove('drag-over');
    });
    
    videoUrlInput.addEventListener('drop', async (e) => {
        e.preventDefault();
        videoUrlInput.classList.remove('drag-over');
        
        // Handle dropped text/URL
        const text = e.dataTransfer.getData('text/plain');
        if (isValidVideoUrl(text)) {
            videoUrlInput.value = text.trim();
            clearBtn.classList.remove('hidden');
            currentVideoUrl = text.trim();
            handleFetchClick();
        } else {
            showError('Please drop a valid video URL');
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
    
    // Playlist actions
    selectAllBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.video-select-checkbox');
        checkboxes.forEach(cb => cb.checked = true);
        updateSelectedCount();
    });
    
    deselectAllBtn.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.video-select-checkbox');
        checkboxes.forEach(cb => cb.checked = false);
        updateSelectedCount();
    });
    
    // Batch download
    batchDownloadBtn.addEventListener('click', handleBatchDownload);
    
    // View toggle
    listViewBtn.addEventListener('click', () => switchView('list'));
    gridViewBtn.addEventListener('click', () => switchView('grid'));
    
    // Preview modal
    closePreviewModal.addEventListener('click', closeVideoPreview);
    videoPreviewModal.querySelector('.modal-overlay').addEventListener('click', closeVideoPreview);
    previewDownloadBtn.addEventListener('click', () => {
        if (currentPreviewVideo) {
            handleDownloadFromPreview(currentPreviewVideo.url);
        }
    });
    
    // Error handling
    retryBtn.addEventListener('click', handleRetry);
    dismissErrorBtn.addEventListener('click', hideError);
    
    // Network status monitoring
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check initial network status
    if (!navigator.onLine) {
        handleOffline();
    }
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Initialize theme from localStorage or system preference
    initializeTheme();
    
    // Start backend health check
    startBackendHealthCheck();
    
    // PWA Install prompt
    installBtn.addEventListener('click', handleInstall);
    dismissInstallBtn.addEventListener('click', dismissInstallPrompt);
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        // Save the event so it can be triggered later
        deferredInstallPrompt = e;
        // Show custom install prompt
        showInstallPrompt();
    });
    
    // Listen for app installed
    window.addEventListener('appinstalled', () => {
        console.log('PWA installed successfully');
        deferredInstallPrompt = null;
        hideInstallPrompt();
        
        // Show success notification
        const notification = document.createElement('div');
        notification.className = 'network-notification online';
        notification.innerHTML = '<i class="fas fa-check-circle"></i> App installed successfully!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    });

    // Functions
    async function handleFetchClick() {
        const url = currentVideoUrl.trim();
        if (!url) {
            showError('No URL provided. Please copy a video URL and click the button.');
            return;
        }

        // Show appropriate loader and hide any previous results/errors
        hideError();
        hideVideoInfo();
        hidePlaylistInfo();

        try {
            // Show loader (will determine type after fetch)
            showLoader('video');
            
            // Fetch video info from the backend
            const videoData = await fetchVideoInfo(url);
            
            // Update loader type if it's a playlist
            if (videoData.type === 'playlist') {
                hideLoader();
                showLoader('playlist');
                // Add small delay for skeleton animation
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            displayVideoInfo(videoData);
            retryCount = 0; // Reset retry count on success
        } catch (error) {
            console.error('Error fetching video info:', error);
            showError(error.message || 'Failed to fetch video information. Please check the URL and try again.', {
                retryable: true,
                action: handleFetchClick
            });
        } finally {
            hideLoader();
        }
    }

    async function fetchVideoInfo(url) {
        try {
            const response = await fetchWithRetry(`${API_BASE_URL}/api/info?url=${encodeURIComponent(url)}`);
            return await response.json();
        } catch (error) {
            throw new Error(error.message || 'Failed to fetch video information');
        }
    }

    function displayVideoInfo(data) {
        // Check if it's a playlist or single video
        if (data.type === 'playlist') {
            displayPlaylistInfo(data);
            return;
        }
        
        // Hide playlist info if visible
        playlistInfo.classList.add('hidden');
        
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
        
        // Add preview button for single video
        addSingleVideoPreview(data);
        
        // Show the video info section
        videoInfo.classList.remove('hidden');
    }
    
    function addSingleVideoPreview(data) {
        // Check if preview button already exists
        let previewBtn = document.querySelector('.single-video-preview-btn');
        if (!previewBtn) {
            previewBtn = document.createElement('button');
            previewBtn.className = 'single-video-preview-btn';
            previewBtn.innerHTML = '<i class="fas fa-play-circle"></i> Preview Video';
            
            // Insert after thumbnail container
            const thumbnailContainer = document.querySelector('.thumbnail-container');
            if (thumbnailContainer) {
                thumbnailContainer.insertAdjacentElement('afterend', previewBtn);
            }
        }
        
        // Update click handler
        previewBtn.onclick = () => {
            openVideoPreview({
                title: data.title,
                url: data.webpage_url || currentVideoUrl,
                duration: data.duration,
                thumbnail: data.thumbnail
            });
        };
    }
    
    function displayPlaylistInfo(data) {
        // Hide single video info
        videoInfo.classList.add('hidden');
        
        // Store playlist data
        currentPlaylistData = data;
        selectedVideos.clear();
        
        // Set playlist details
        playlistTitle.textContent = data.title || 'Untitled Playlist';
        playlistCount.textContent = data.playlist_count || data.videos.length;
        playlistUploader.textContent = data.uploader || 'Unknown';
        
        // Display playlist videos
        playlistVideos.innerHTML = '';
        data.videos.forEach((video, index) => {
            const videoCard = document.createElement('div');
            videoCard.className = 'playlist-video-card';
            videoCard.dataset.videoId = video.id;
            videoCard.dataset.videoUrl = video.url;
            videoCard.dataset.videoIndex = index;
            
            const duration = video.duration ? formatDuration(video.duration) : 'N/A';
            
            videoCard.innerHTML = `
                <div class="video-checkbox">
                    <input type="checkbox" id="video-${index}" class="video-select-checkbox" data-video-url="${video.url}">
                    <label for="video-${index}"></label>
                </div>
                <div class="video-thumbnail" data-video-preview>
                    ${video.thumbnail ? `<img src="${video.thumbnail}" alt="${video.title}">` : '<div class="no-thumbnail"><i class="fas fa-video"></i></div>'}
                    <div class="preview-overlay">
                        <i class="fas fa-play-circle"></i>
                        <span>Preview</span>
                    </div>
                </div>
                <div class="video-info-text">
                    <h4 class="video-title">${video.title}</h4>
                    <p class="video-meta">Duration: ${duration}</p>
                </div>
                <div class="video-number">#${index + 1}</div>
                <button class="video-preview-btn" data-video-preview>
                    <i class="fas fa-eye"></i>
                </button>
            `;
            
            // Add event listener to checkbox
            const checkbox = videoCard.querySelector('.video-select-checkbox');
            checkbox.addEventListener('change', updateSelectedCount);
            
            // Add preview functionality
            const previewElements = videoCard.querySelectorAll('[data-video-preview]');
            previewElements.forEach(element => {
                element.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openVideoPreview(video);
                });
            });
            
            playlistVideos.appendChild(videoCard);
        });
        
        // Show playlist info
        playlistInfo.classList.remove('hidden');
        updateSelectedCount();
    }
    
    function formatDuration(seconds) {
        if (!seconds) return 'N/A';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    function updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.video-select-checkbox:checked');
        const count = checkboxes.length;
        selectedCount.textContent = count;
        batchDownloadBtn.disabled = count === 0;
        
        // Update selected videos set
        selectedVideos.clear();
        checkboxes.forEach(cb => {
            selectedVideos.add(cb.dataset.videoUrl);
        });
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
        console.log('handleDownload called with formatId:', formatId);
        const url = currentVideoUrl;
        console.log('URL:', url);
        
        if (!url || !formatId) {
            console.error('Missing URL or formatId');
            showError('Missing URL or format. Please try again.');
            return;
        }
        
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
            showProgress('Starting download...');
            
            // Use fetch API for better progress tracking
            const response = await fetchWithRetry(downloadUrl);
            
            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }
            
            const contentLength = response.headers.get('content-length');
            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;
            const startTime = Date.now();
            
            while (true) {
                const {done, value} = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                
                if (contentLength) {
                    const percentComplete = Math.round((receivedLength / contentLength) * 100);
                    const stats = calculateDownloadStats(receivedLength, contentLength, startTime);
                    updateProgress(percentComplete, `Downloading...`, stats);
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
    function showLoader(type = 'video') {
        // Hide old loader
        loader.classList.add('hidden');
        
        // Show appropriate skeleton
        if (type === 'playlist') {
            skeletonPlaylist.classList.remove('hidden');
            skeletonLoader.classList.add('hidden');
        } else {
            skeletonLoader.classList.remove('hidden');
            skeletonPlaylist.classList.add('hidden');
        }
        
        fetchBtn.disabled = true;
        fetchBtn.classList.add('loading');
        fetchBtn.querySelector('i').className = 'fas fa-spinner';
        fetchBtn.querySelector('span').textContent = 'Fetching...';
    }

    function hideLoader() {
        loader.classList.add('hidden');
        skeletonLoader.classList.add('hidden');
        skeletonPlaylist.classList.add('hidden');
        fetchBtn.disabled = false;
        fetchBtn.classList.remove('loading');
        fetchBtn.querySelector('i').className = 'fas fa-play';
        fetchBtn.querySelector('span').textContent = 'Paste or Drop URL';
    }

    function showError(message, options = {}) {
        const { 
            solution = null, 
            retryable = false, 
            action = null,
            autoHide = true,
            type = 'error' 
        } = options;
        
        // Store action for retry
        if (retryable && action) {
            lastFailedAction = action;
        }
        
        // Get helpful error message
        const errorInfo = getErrorInfo(message);
        errorText.textContent = errorInfo.message;
        
        // Show solution if available
        if (solution || errorInfo.solution) {
            errorSolution.innerHTML = `
                <i class="fas fa-lightbulb"></i>
                <div class="solution-text">
                    <strong>Suggested Solution:</strong>
                    <p>${solution || errorInfo.solution}</p>
                </div>
            `;
            errorSolution.classList.remove('hidden');
        } else {
            errorSolution.classList.add('hidden');
        }
        
        // Show/hide retry button
        if (retryable && retryCount < MAX_RETRIES) {
            errorActions.classList.remove('hidden');
            retryBtn.style.display = 'flex';
        } else {
            retryBtn.style.display = 'none';
        }
        
        // Always show dismiss button
        errorActions.classList.remove('hidden');
        
        // Update error styling based on type
        errorMessage.className = 'error-message';
        if (type === 'warning') {
            errorMessage.classList.add('warning');
        } else if (type === 'info') {
            errorMessage.classList.add('info');
        }
        
        errorMessage.classList.remove('hidden');
        
        // Auto-hide after delay (except for retryable errors)
        if (autoHide && !retryable) {
            setTimeout(hideError, 8000);
        }
    }
    
    function getErrorInfo(message) {
        // Parse error message and provide helpful solutions
        const errorPatterns = [
            {
                pattern: /network|fetch|connection|offline/i,
                message: 'Network connection error',
                solution: 'Check your internet connection and try again. If the problem persists, the server might be temporarily unavailable.'
            },
            {
                pattern: /404|not found/i,
                message: 'Video not found',
                solution: 'The video may have been removed, made private, or the URL is incorrect. Please verify the URL and try again.'
            },
            {
                pattern: /403|forbidden|unauthorized/i,
                message: 'Access denied',
                solution: 'This video may be age-restricted, geo-blocked, or requires authentication. Try a different video.'
            },
            {
                pattern: /timeout/i,
                message: 'Request timed out',
                solution: 'The server took too long to respond. This might be due to a slow connection or a large file. Please try again.'
            },
            {
                pattern: /invalid|unsupported/i,
                message: 'Invalid or unsupported URL',
                solution: 'Please ensure you\'re using a valid video URL from a supported platform (YouTube, Facebook, Instagram, etc.).'
            },
            {
                pattern: /rate limit|too many requests/i,
                message: 'Too many requests',
                solution: 'You\'ve made too many requests. Please wait a few minutes before trying again.'
            },
            {
                pattern: /copyright|dmca/i,
                message: 'Copyright restriction',
                solution: 'This video is protected by copyright and cannot be downloaded. Please respect content creators\' rights.'
            },
            {
                pattern: /no.*format/i,
                message: 'No suitable format available',
                solution: 'No downloadable formats were found for this video. It may be a live stream or have restricted access.'
            }
        ];
        
        for (const pattern of errorPatterns) {
            if (pattern.pattern.test(message)) {
                return {
                    message: pattern.message,
                    solution: pattern.solution
                };
            }
        }
        
        // Default error
        return {
            message: message || 'An unexpected error occurred',
            solution: 'Please try again. If the problem persists, try refreshing the page or using a different browser.'
        };
    }

    function hideError() {
        errorMessage.classList.add('hidden');
        errorSolution.classList.add('hidden');
        errorActions.classList.add('hidden');
        lastFailedAction = null;
        retryCount = 0;
    }
    
    async function handleRetry() {
        if (!lastFailedAction || retryCount >= MAX_RETRIES) {
            showError('Maximum retry attempts reached. Please try again later.', { retryable: false });
            return;
        }
        
        retryCount++;
        hideError();
        
        // Update retry button to show attempt
        retryBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Retrying (${retryCount}/${MAX_RETRIES})...`;
        
        try {
            await lastFailedAction();
            retryCount = 0; // Reset on success
        } catch (error) {
            console.error('Retry failed:', error);
            showError(error.message, {
                retryable: retryCount < MAX_RETRIES,
                action: lastFailedAction
            });
        } finally {
            retryBtn.innerHTML = '<i class="fas fa-redo"></i> Retry';
        }
    }
    
    function handleOnline() {
        isOnline = true;
        networkStatus.classList.add('hidden');
        
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'network-notification online';
        notification.innerHTML = '<i class="fas fa-wifi"></i> Back online!';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    function handleOffline() {
        isOnline = false;
        networkStatus.classList.remove('hidden');
    }
    
    async function fetchWithRetry(url, options = {}, maxRetries = 3) {
        let lastError;
        
        for (let i = 0; i < maxRetries; i++) {
            try {
                // Check network status first
                if (!isOnline) {
                    throw new Error('No internet connection. Please check your network and try again.');
                }
                
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Video not found. Please check the URL and try again.');
                    } else if (response.status === 403) {
                        throw new Error('Access forbidden. This video may be private or restricted.');
                    } else if (response.status === 429) {
                        throw new Error('Rate limit exceeded. Please wait a moment before trying again.');
                    } else {
                        throw new Error(`Server error (${response.status}). Please try again later.`);
                    }
                }
                
                return response;
            } catch (error) {
                lastError = error;
                
                // Don't retry on certain errors
                if (error.name === 'AbortError') {
                    throw new Error('Request timeout. The server took too long to respond.');
                }
                
                if (error.message.includes('forbidden') || 
                    error.message.includes('not found') || 
                    error.message.includes('No internet connection')) {
                    throw error;
                }
                
                // Wait before retrying (exponential backoff)
                if (i < maxRetries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
            }
        }
        
        throw lastError || new Error('Request failed after multiple attempts');
    }

    function hideVideoInfo() {
        videoInfo.classList.add('hidden');
    }
    
    function hidePlaylistInfo() {
        playlistInfo.classList.add('hidden');
    }
    
    async function handleBatchDownload() {
        if (selectedVideos.size === 0) {
            showError('Please select at least one video to download');
            return;
        }
        
        const formatId = playlistFormatSelect.value;
        const videosToDownload = Array.from(selectedVideos);
        
        // Show batch progress container
        batchProgress.classList.remove('hidden');
        batchProgressList.innerHTML = '';
        
        // Disable batch download button
        batchDownloadBtn.disabled = true;
        batchDownloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
        
        // Create progress items for each video
        const progressItems = new Map();
        videosToDownload.forEach((videoUrl, index) => {
            const video = currentPlaylistData.videos.find(v => v.url === videoUrl);
            const progressItem = createBatchProgressItem(video, index);
            batchProgressList.appendChild(progressItem);
            progressItems.set(videoUrl, progressItem);
        });
        
        // Download videos sequentially
        let successCount = 0;
        let failCount = 0;
        
        for (const videoUrl of videosToDownload) {
            const progressItem = progressItems.get(videoUrl);
            const statusElement = progressItem.querySelector('.batch-item-status');
            const progressBar = progressItem.querySelector('.batch-item-progress-bar');
            
            try {
                // Update status to downloading
                statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
                progressItem.classList.add('downloading');
                
                // Start download
                const response = await fetchWithRetry(`${API_BASE_URL}/api/download?url=${encodeURIComponent(videoUrl)}&format_id=${formatId}`);
                
                if (!response.ok) {
                    throw new Error('Download failed');
                }
                
                // Get content length for progress
                const contentLength = response.headers.get('content-length');
                const reader = response.body.getReader();
                const chunks = [];
                let receivedLength = 0;
                const startTime = Date.now();
                
                while (true) {
                    const {done, value} = await reader.read();
                    
                    if (done) break;
                    
                    chunks.push(value);
                    receivedLength += value.length;
                    
                    if (contentLength) {
                        const percentComplete = Math.round((receivedLength / contentLength) * 100);
                        progressBar.style.width = `${percentComplete}%`;
                        
                        // Update progress stats if elements exist
                        const percentElement = progressBar.parentElement.parentElement.querySelector('.progress-percentage');
                        if (percentElement) {
                            percentElement.textContent = `${percentComplete}%`;
                        }
                    }
                }
                
                // Combine chunks and download
                const blob = new Blob(chunks);
                const blobUrl = window.URL.createObjectURL(blob);
                
                // Get filename from Content-Disposition header
                const contentDisposition = response.headers.get('content-disposition');
                let filename = 'video.mp4';
                if (contentDisposition) {
                    const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                    if (matches && matches[1]) {
                        filename = matches[1].replace(/['"]/g, '');
                    }
                }
                
                // Trigger download
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
                
                // Update status to completed
                statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Completed';
                progressItem.classList.remove('downloading');
                progressItem.classList.add('completed');
                progressBar.style.width = '100%';
                successCount++;
                
                // Small delay between downloads to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`Error downloading video ${videoUrl}:`, error);
                statusElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Failed';
                progressItem.classList.remove('downloading');
                progressItem.classList.add('failed');
                failCount++;
            }
        }
        
        // Show summary
        const summaryText = `Batch download completed: ${successCount} successful, ${failCount} failed`;
        const summaryType = failCount > 0 ? (successCount > 0 ? 'warning' : 'error') : 'info';
        showError(summaryText, { type: summaryType, autoHide: true });
        
        // Re-enable batch download button
        batchDownloadBtn.disabled = false;
        batchDownloadBtn.innerHTML = '<i class="fas fa-download"></i> <span>Download Selected (<span id="selectedCount">' + selectedVideos.size + '</span>)</span>';
        
        // Auto-hide batch progress after a delay
        setTimeout(() => {
            batchProgress.classList.add('hidden');
        }, 5000);
    }
    
    function createBatchProgressItem(video, index) {
        const item = document.createElement('div');
        item.className = 'batch-progress-item';
        item.innerHTML = `
            <div class="batch-item-header">
                <span class="batch-item-number">#${index + 1}</span>
                <span class="batch-item-title">${video.title}</span>
                <span class="batch-item-status"><i class="fas fa-clock"></i> Waiting...</span>
            </div>
            <div class="batch-item-progress">
                <div class="batch-item-progress-bar"></div>
            </div>
        `;
        return item;
    }
    
    function switchView(mode) {
        playlistViewMode = mode;
        
        if (mode === 'list') {
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
            playlistVideos.classList.remove('grid-view');
            playlistVideos.classList.add('list-view');
        } else {
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            playlistVideos.classList.add('grid-view');
            playlistVideos.classList.remove('list-view');
        }
    }
    
    function openVideoPreview(video) {
        currentPreviewVideo = video;
        
        // Set modal content
        previewTitle.textContent = video.title;
        previewDuration.textContent = video.duration ? `Duration: ${formatDuration(video.duration)}` : '';
        previewUrl.textContent = video.url;
        
        // Create video player
        videoPlayerContainer.innerHTML = '';
        
        // Check if it's a YouTube video
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const youtubeMatch = video.url.match(youtubeRegex);
        
        if (youtubeMatch && youtubeMatch[1]) {
            // Create YouTube iframe
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
            iframe.width = '100%';
            iframe.height = '100%';
            iframe.frameBorder = '0';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            videoPlayerContainer.appendChild(iframe);
        } else {
            // For non-YouTube videos, show thumbnail with play button
            const previewContent = document.createElement('div');
            previewContent.className = 'preview-content';
            previewContent.innerHTML = `
                ${video.thumbnail ? `<img src="${video.thumbnail}" alt="${video.title}" class="preview-thumbnail">` : '<div class="no-preview"><i class="fas fa-video"></i><p>Preview not available</p></div>'}
                <div class="preview-note">
                    <i class="fas fa-info-circle"></i>
                    <p>Full video preview is only available for YouTube videos. Download to view.</p>
                </div>
            `;
            videoPlayerContainer.appendChild(previewContent);
        }
        
        // Show modal
        videoPreviewModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
    
    function closeVideoPreview() {
        videoPreviewModal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // Clear player
        videoPlayerContainer.innerHTML = '';
        currentPreviewVideo = null;
    }
    
    async function handleDownloadFromPreview(videoUrl) {
        // Close preview modal
        closeVideoPreview();
        
        // Show progress
        showProgress('Preparing download...');
        
        // Get format (use best quality by default)
        const formatId = playlistFormatSelect.value || 'best';
        
        try {
            const response = await fetchWithRetry(`${API_BASE_URL}/api/download?url=${encodeURIComponent(videoUrl)}&format_id=${formatId}`);
            
            if (!response.ok) {
                throw new Error('Download failed');
            }
            
            // Get content length for progress
            const contentLength = response.headers.get('content-length');
            const reader = response.body.getReader();
            const chunks = [];
            let receivedLength = 0;
            const startTime = Date.now();
            
            while (true) {
                const {done, value} = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                
                if (contentLength) {
                    const percentComplete = Math.round((receivedLength / contentLength) * 100);
                    const stats = calculateDownloadStats(receivedLength, contentLength, startTime);
                    updateProgress(percentComplete, `Downloading...`, stats);
                }
            }
            
            // Combine chunks and download
            const blob = new Blob(chunks);
            const blobUrl = window.URL.createObjectURL(blob);
            
            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'video.mp4';
            if (contentDisposition) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
                if (matches && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            
            // Trigger download
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            
            updateProgress(100, 'Download complete!');
            setTimeout(hideProgress, 2000);
            
        } catch (error) {
            console.error('Download error:', error);
            showError('Failed to download video. Please try again.');
            hideProgress();
        }
    }

    function showProgress(message) {
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        document.querySelector('.progress-percentage').textContent = '0%';
        document.querySelector('.progress-speed').textContent = 'Speed: -- MB/s';
        document.querySelector('.progress-eta').textContent = 'ETA: Calculating...';
        progressText.textContent = message;
    }

    function updateProgress(percent, message, stats = {}) {
        progressBar.style.width = `${percent}%`;
        document.querySelector('.progress-percentage').textContent = `${percent}%`;
        
        if (stats.speed) {
            document.querySelector('.progress-speed').textContent = `Speed: ${stats.speed}`;
        }
        
        if (stats.eta) {
            document.querySelector('.progress-eta').textContent = `ETA: ${stats.eta}`;
        }
        
        if (message) {
            progressText.textContent = message;
        }
    }

    function hideProgress() {
        progressContainer.classList.add('hidden');
    }
    
    function calculateDownloadStats(receivedLength, contentLength, startTime) {
        const elapsedTime = (Date.now() - startTime) / 1000; // seconds
        const speed = receivedLength / elapsedTime; // bytes per second
        const speedMB = (speed / (1024 * 1024)).toFixed(2);
        
        const remainingBytes = contentLength - receivedLength;
        const etaSeconds = remainingBytes / speed;
        
        let eta;
        if (etaSeconds < 60) {
            eta = `${Math.round(etaSeconds)}s`;
        } else if (etaSeconds < 3600) {
            const minutes = Math.floor(etaSeconds / 60);
            const seconds = Math.round(etaSeconds % 60);
            eta = `${minutes}m ${seconds}s`;
        } else {
            const hours = Math.floor(etaSeconds / 3600);
            const minutes = Math.floor((etaSeconds % 3600) / 60);
            eta = `${hours}h ${minutes}m`;
        }
        
        return {
            speed: `${speedMB} MB/s`,
            eta: eta
        };
    }

    // Initialize tabs
    document.querySelector('.tab-btn[data-tab="video"]').classList.add('active');
    document.getElementById('videoFormats').classList.remove('hidden');
    
    // Theme Functions
    function initializeTheme() {
        // Check localStorage first
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'dark' : 'light');
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Add animation class
        themeToggle.classList.add('theme-switching');
        setTimeout(() => {
            themeToggle.classList.remove('theme-switching');
        }, 300);
    }
    
    function setTheme(theme) {
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }
    
    // PWA Install Functions
    function showInstallPrompt() {
        // Don't show if already installed or dismissed
        if (localStorage.getItem('installPromptDismissed') === 'true') {
            return;
        }
        
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            return;
        }
        
        // Show prompt after 3 seconds
        setTimeout(() => {
            installPrompt.classList.remove('hidden');
        }, 3000);
    }
    
    function hideInstallPrompt() {
        installPrompt.classList.add('hidden');
    }
    
    function dismissInstallPrompt() {
        hideInstallPrompt();
        localStorage.setItem('installPromptDismissed', 'true');
    }
    
    async function handleInstall() {
        if (!deferredInstallPrompt) {
            // Already installed or not available
            alert('App is already installed or installation is not available on this device.');
            return;
        }
        
        // Show the install prompt
        deferredInstallPrompt.prompt();
        
        // Wait for the user's response
        const { outcome } = await deferredInstallPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        // Clear the deferred prompt
        deferredInstallPrompt = null;
        hideInstallPrompt();
    }
    
    // Check if running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('Running as installed PWA');
        document.body.classList.add('pwa-installed');
    }
});
