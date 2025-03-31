// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const toastContainer = document.getElementById('toastContainer');

// Supported video formats
const supportedFormats = [
    'video/mp4', 
    'video/webm', 
    'video/ogg',
    'video/x-matroska', // .mkv
    'video/MP2T'        // .ts
];

// Event Listeners
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFiles);

// Drag and Drop Events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
});

dropZone.addEventListener('drop', handleDrop, false);

// Functions
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    dropZone.classList.add('drop-zone--over');
}

function unhighlight() {
    dropZone.classList.remove('drop-zone--over');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles({ target: { files } });
}

function handleFiles(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    const file = files[0];
    
    // Validate file type (check extension if type not detected)
    const validExtensions = ['.mp4','.mkv','.ts','.webm','.ogg'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!supportedFormats.includes(file.type) && !validExtensions.includes(fileExt)) {
        showToast(`Unsupported format. Please use: ${validExtensions.join(', ')}`, 'error');
        return;
    }

    // Validate file size (4GB max)
    if (file.size > 4 * 1024 * 1024 * 1024) {
        showToast('File is too large. Maximum size is 4GB.', 'error');
        return;
    }

    // Process the file
    processFile(file);
}

async function processFile(file) {
    uploadProgress.classList.remove('hidden');
    
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(async () => {
        progress += Math.random() * 10;
        updateProgress(progress);
        
        if (progress >= 100) {
            clearInterval(interval);
            try {
                await saveVideo(file);
            } catch (error) {
                console.error('Error processing file:', error);
                showToast('Error processing video', 'error');
                uploadProgress.classList.add('hidden');
            }
        }
    }, 200);
}

function updateProgress(percent) {
    progressBar.style.width = `${percent}%`;
    progressPercent.textContent = `${Math.round(percent)}%`;
}

async function saveVideo(file) {
    // Handle cases where file.type might be empty
    const fileType = file.type || 
                   file.name.endsWith('.mkv') ? 'video/x-matroska' :
                   file.name.endsWith('.ts') ? 'video/MP2T' :
                   file.type;
    
    const videoUrl = URL.createObjectURL(file);
    try {
        const thumbnail = await generateThumbnail(file);
        // Convert file to ArrayBuffer for storage
        const arrayBuffer = await file.arrayBuffer();
        const videoData = {
            id: Date.now(),
            name: file.name,
            size: file.size,
            type: fileType,
            lastModified: file.lastModified,
            data: Array.from(new Uint8Array(arrayBuffer)), // Store raw video data
            thumbnail: thumbnail,
            timestamp: new Date().toISOString(),
            extension: file.name.split('.').pop().toLowerCase()
        };

        // Save to localStorage
        const videos = JSON.parse(localStorage.getItem('videos') || '[]');
        videos.push(videoData);
        localStorage.setItem('videos', JSON.stringify(videos));

        // Show success message
        showToast('Video uploaded successfully!', 'success');
        uploadProgress.classList.add('hidden');
        updateProgress(0);

        // Redirect to gallery after 1.5 seconds
        setTimeout(() => {
            window.location.href = 'gallery.html';
        }, 1500);
    } catch (error) {
        console.error('Error saving video:', error);
        showToast('Error uploading video', 'error');
        URL.revokeObjectURL(videoUrl);
    }
}

async function generateThumbnail(videoFile) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.src = URL.createObjectURL(videoFile);
        video.addEventListener('loadeddata', () => {
            // Seek to 25% of duration for thumbnail
            video.currentTime = Math.min(1, video.duration * 0.25);
        });

        video.addEventListener('seeked', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbnailUrl = canvas.toDataURL('image/jpeg');
            URL.revokeObjectURL(video.src);
            resolve(thumbnailUrl);
        });

        video.addEventListener('error', () => {
            // Fallback to black frame if thumbnail generation fails
            canvas.width = 320;
            canvas.height = 180;
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No Preview', canvas.width/2, canvas.height/2);
            resolve(canvas.toDataURL('image/jpeg'));
        });
    });
}

// Check if videos exist in localStorage
function checkVideosAvailable() {
    const videos = JSON.parse(localStorage.getItem('videos') || '[]');
    if (videos.length === 0) {
        showToast('No videos found. Please upload videos first.', 'error');
        return false;
    }
    return true;
}

function handleOfflineStatus() {
    if (!navigator.onLine) {
        showToast('Working in offline mode', 'info');
    }
}

// Initialize offline checks
handleOfflineStatus();
window.addEventListener('online', handleOfflineStatus);
window.addEventListener('offline', handleOfflineStatus);

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast px-4 py-3 rounded-md shadow-md text-white ${
        type === 'error' ? 'bg-red-500' : 
        type === 'success' ? 'bg-green-500' : 'bg-blue-500'
    }`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 5000);
}