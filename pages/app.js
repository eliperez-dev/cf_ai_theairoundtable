// DOM Elements
const form = document.getElementById('podcastForm');
const topicInput = document.getElementById('topic');
const generateBtn = document.getElementById('generateBtn');
const statusDiv = document.getElementById('status');
const audioPlayer = document.getElementById('audioPlayer');
const audioElement = document.getElementById('audio');
const downloadBtn = document.getElementById('downloadBtn');
const transcriptSidebar = document.getElementById('transcriptSidebar');
const transcriptContent = document.getElementById('transcriptContent');

// Configure your worker URL here
const WORKER_URL = 'https://aipodcast-worker.eliperez0024.workers.dev'; // Change this to your deployed worker URL

/**
 * Set the topic input value
 * @param {string} topic - The topic to set
 */
function setTopic(topic) {
    topicInput.value = topic;
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

// Form submission handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const topic = topicInput.value.trim();
    if (!topic) {
        showStatus('Please enter a topic', 'error');
        return;
    }

    // Hide previous audio player and reset transcript
    audioPlayer.classList.remove('show');
    transcriptContent.innerHTML = '<div class="transcript-empty">Generating transcript... this may take 30-60 seconds</div>';
    
    // Show loading state
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span> Creating podcast...';
    showStatus('Generating conversation... this typically takes 30-60 seconds', 'loading');

    try {
        // First, fetch the transcript
        showStatus('Generating script...', 'loading');
        const transcriptResponse = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic, transcript: true })
        });

        if (!transcriptResponse.ok) {
            throw new Error(`Server error: ${transcriptResponse.status}`);
        }

        const transcriptData = await transcriptResponse.json();
        const transcript = parseTranscript(transcriptData.transcript);
        displayTranscript(transcript);

        // Then, fetch the audio using the same script
        showStatus('Generating audio... this may take 30-60 seconds', 'loading');
        const audioResponse = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic, script: transcriptData.transcript })
        });

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
        
    } catch (error) {
        console.error('Error:', error);
        showStatus(`Error: ${error.message}. Please check your connection and try again.`, 'error');
    } finally {
        // Reset button
        generateBtn.disabled = false;
        generateBtn.textContent = 'Create Podcast';
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