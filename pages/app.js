// DOM Elements
const form = document.getElementById('podcastForm');
const topicInput = document.getElementById('topic');
const generateBtn = document.getElementById('generateBtn');
const headlinesBtn = document.getElementById('headlinesBtn');
const statusDiv = document.getElementById('status');
const audioPlayer = document.getElementById('audioPlayer');
const audioElement = document.getElementById('audio');
const downloadBtn = document.getElementById('downloadBtn');
const downloadTranscriptBtn = document.getElementById('downloadTranscriptBtn');
const transcriptSidebar = document.getElementById('transcriptSidebar');
const transcriptContent = document.getElementById('transcriptContent');
const styleOptions = document.querySelectorAll('.style-option');
const alexVoiceDropdown = document.getElementById('alexVoice');
const jamieVoiceDropdown = document.getElementById('jamieVoice');

// Store current transcript data and selected style
let currentTranscript = [];
let selectedStyle = 'brief'; // default
let selectedAlexVoice = 'arcas'; // default
let selectedJamieVoice = 'harmonia'; // default

// Configure your worker URL here
const WORKER_URL = 'https://aipodcast-worker.eliperez0024.workers.dev'; // Change this to your deployed worker URL
const HEADLINES_URL = `https://api.thenewsapi.com/v1/news/all?api_token=gFRazLJ01XoJ5JDwBvrh56aSI1sGiRz2qh6qFZng&language=en&limit=3`;

// Initialize voice dropdown constraints on page load
updateVoiceDropdownConstraints();

/**
 * Set the topic input value
 * @param {string} topic - The topic to set
 */
function setTopic(topic) {
    topicInput.value = topic;
}

/**
 * Handle style option selection
 */
styleOptions.forEach(option => {
    option.addEventListener('click', () => {
        // Remove active class from all options
        styleOptions.forEach(opt => opt.classList.remove('active'));
        // Add active class to clicked option
        option.classList.add('active');
        // Update selected style
        selectedStyle = option.dataset.style;
    });
});

/**
 * Handle voice dropdown selection
 * Prevent the same voice from being selected for both hosts
 */
alexVoiceDropdown.addEventListener('change', () => {
    selectedAlexVoice = alexVoiceDropdown.value;
    updateVoiceDropdownConstraints();
});

jamieVoiceDropdown.addEventListener('change', () => {
    selectedJamieVoice = jamieVoiceDropdown.value;
    updateVoiceDropdownConstraints();
});

/**
 * Update voice dropdown constraints
 * Disable options that are already selected in the other dropdown
 */
function updateVoiceDropdownConstraints() {
    // For each option in Alex's dropdown
    Array.from(alexVoiceDropdown.options).forEach(option => {
        option.disabled = option.value === selectedJamieVoice && option.value !== selectedAlexVoice;
    });
    
    // For each option in Jamie's dropdown
    Array.from(jamieVoiceDropdown.options).forEach(option => {
        option.disabled = option.value === selectedAlexVoice && option.value !== selectedJamieVoice;
    });
}

/**
 * Show status message
 * @param {string} message - The message to display
 * @param {string} type - The type of status (loading, error, success)
 */
function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

/**
 * Hide status message
 */
function hideStatus() {
    statusDiv.className = 'status';
}

/**
 * Parse transcript from script text
 * @param {string} scriptText - The script text in format [Alex]:text\n[Jamie]:text
 * @returns {Array} Array of transcript objects with speaker and text
 */
function parseTranscript(scriptText) {
    // Parse the script format: [Alex]:text\n[Jamie]:text
    const lines = scriptText.split('\n').filter(line => line.trim());
    const transcript = [];
    
    for (const line of lines) {
        const match = line.match(/\[(Alex|Jamie)\]:(.*)/);
        if (match) {
            transcript.push({
                speaker: match[1],
                text: match[2].trim()
            });
        }
    }
    
    return transcript;
}

/**
 * Display transcript in the sidebar
 * @param {Array} transcript - Array of transcript objects
 */
function displayTranscript(transcript) {
    currentTranscript = transcript; // Store for download
    transcriptContent.innerHTML = '';
    
    transcript.forEach(line => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'transcript-line';
        
        const speakerDiv = document.createElement('div');
        speakerDiv.className = `speaker ${line.speaker.toLowerCase()}`;
        speakerDiv.textContent = line.speaker;
        
        const dialogueDiv = document.createElement('div');
        dialogueDiv.className = 'dialogue';
        dialogueDiv.textContent = line.text;
        
        lineDiv.appendChild(speakerDiv);
        lineDiv.appendChild(dialogueDiv);
        transcriptContent.appendChild(lineDiv);
    });
}

/**
 * Generate podcast from a topic
 * @param {string} topic - The topic to generate podcast from
 * @param {string} style - The podcast style ('brief' or 'deep')
 */
async function generatePodcast(topic, style = 'brief') {
    // Hide previous audio player and reset transcript
    audioPlayer.classList.remove('show');
    transcriptContent.innerHTML = '<div class="transcript-empty">Generating transcript... this may take 30-60 seconds</div>';
    
    // Show loading state
    generateBtn.disabled = true;
    headlinesBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span> Creating podcast...';
    showStatus('Alex is writing the script for the podcast... this typically takes 30-60 seconds', 'loading');

    try {
        // First, fetch the transcript
        const estimatedTime = style === 'deep' ? '30-60 seconds' : '15-30 seconds';
        showStatus(`Alex is writing the script...this typically takes ${estimatedTime}`, 'loading');
        
        // Create an AbortController with timeout for transcript (2 minutes should be enough)
        const transcriptController = new AbortController();
        const transcriptTimeoutId = setTimeout(() => transcriptController.abort(), 120000); // 2 minutes
        
        const transcriptResponse = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic, transcript: true, style, alexVoice: selectedAlexVoice, jamieVoice: selectedJamieVoice }),
            signal: transcriptController.signal
        });
        
        clearTimeout(transcriptTimeoutId);

        if (!transcriptResponse.ok) {
            throw new Error(`Server error: ${transcriptResponse.status}`);
        }

        const transcriptData = await transcriptResponse.json();
        const transcript = parseTranscript(transcriptData.transcript);
        displayTranscript(transcript);

        // Then, fetch the audio using the same script
        const audioEstimatedTime = style === 'deep' ? '60-90 seconds' : '30-60 seconds';
        showStatus(`Alex and Jamie are now recording the podcast...this may take another ${audioEstimatedTime}`, 'loading');
        
        // Create an AbortController with a longer timeout (3 minutes for brief, 5 minutes for deep)
        const controller = new AbortController();
        const timeoutMs = style === 'deep' ? 300000 : 180000; // 5 min for deep, 3 min for brief
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        try {
            const audioResponse = await fetch(WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ topic, script: transcriptData.transcript, style, alexVoice: selectedAlexVoice, jamieVoice: selectedJamieVoice }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!audioResponse.ok) {
                throw new Error(`Server error: ${audioResponse.status}`);
            }
            
            // Get the audio blob
            const audioBlob = await audioResponse.blob();
            
            // Create a URL for the audio blob
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Set up audio player
            audioElement.src = audioUrl;
            downloadBtn.href = audioUrl;
            downloadBtn.download = `podcast-${Date.now()}.mp3`;
            
            // Show success
            showStatus('Podcast created successfully', 'success');
            audioPlayer.classList.add('show');
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('Request timed out after 3 minutes. The podcast may be too long.');
            }
            throw fetchError;
        }
        
    } catch (error) {
        console.error('Error:', error);
        showStatus(`Error: ${error.message}. Please check your connection and try again.`, 'error');
    } finally {
        // Reset buttons
        generateBtn.disabled = false;
        headlinesBtn.disabled = false;
        generateBtn.textContent = 'Create Podcast';
        headlinesBtn.innerHTML = '📰 Generate Podcast from Today\'s Headlines';
    }
}

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const topic = topicInput.value.trim();
    if (!topic) {
        showStatus('Please enter a topic', 'error');
        return;
    }

    await generatePodcast(topic, selectedStyle);
});

// Headlines button handler
headlinesBtn.addEventListener('click', async () => {
    try {
        // Disable buttons and show loading state
        generateBtn.disabled = true;
        headlinesBtn.disabled = true;
        headlinesBtn.innerHTML = '<span class="spinner"></span> Fetching headlines...';
        showStatus('Fetching today\'s headlines...', 'loading');

        // Fetch headlines from worker endpoint (which proxies to News API)
        const newsResponse = await fetch(HEADLINES_URL);
        
        if (!newsResponse.ok) {
            throw new Error(`Failed to fetch headlines: ${newsResponse.status}`);
        }

        const newsData = await newsResponse.json();
        
        // Format the headlines data as a JSON string
        const headlinesJson = JSON.stringify(newsData, null, 2);
        
        // Create the topic with instructions prefixed
        const topic = `Generate a podcast going over top stoires today. Here is the news data in JSON format:\n\n${headlinesJson}`;
        
        // Generate the podcast with selected style
        await generatePodcast(topic, selectedStyle);
        
    } catch (error) {
        console.error('Error fetching headlines:', error);
        showStatus(`Error: ${error.message}. Please try again.`, 'error');
        generateBtn.disabled = false;
        headlinesBtn.disabled = false;
        headlinesBtn.innerHTML = '📰 Generate Podcast from Today\'s Headlines';
    }
});

// Auto-hide success message after 3 seconds
const observer = new MutationObserver(() => {
    if (statusDiv.classList.contains('success')) {
        setTimeout(() => {
            if (statusDiv.classList.contains('success')) {
                hideStatus();
            }
        }, 3000);
    }
});
observer.observe(statusDiv, { attributes: true, attributeFilter: ['class'] });

// Download transcript button handler
downloadTranscriptBtn.addEventListener('click', () => {
    if (currentTranscript.length === 0) {
        showStatus('No transcript available to download', 'error');
        return;
    }
    
    // Format transcript as text
    let transcriptText = 'AI Roundtable Podcast Transcript\n';
    
    currentTranscript.forEach(line => {
        transcriptText += `${line.speaker}:\n${line.text}\n\n`;
    });
    
    // Create blob and download
    const blob = new Blob([transcriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `podcast-transcript-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('Transcript downloaded successfully', 'success');
});