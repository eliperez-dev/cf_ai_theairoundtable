// DOM Elements
const form = document.getElementById('podcastForm');
const topicInput = document.getElementById('topic');
const generateBtn = document.getElementById('generateBtn');
const headlinesBtn = document.getElementById('headlinesBtn');
const statusDiv = document.getElementById('status');
const audioPlayer = document.getElementById('audioPlayer');
const audioElement = document.getElementById('audio');
const downloadBtn = document.getElementById('downloadBtn');
const transcriptSidebar = document.getElementById('transcriptSidebar');
const transcriptContent = document.getElementById('transcriptContent');

// Configure your worker URL here
const WORKER_URL = 'https://aipodcast-worker.eliperez0024.workers.dev'; // Change this to your deployed worker URL
const HEADLINES_URL = `https://api.thenewsapi.com/v1/news/all?api_token=gFRazLJ01XoJ5JDwBvrh56aSI1sGiRz2qh6qFZng&language=en&limit=3`;

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

/**
 * Generate podcast from a topic
 * @param {string} topic - The topic to generate podcast from
 */
async function generatePodcast(topic) {
    // Hide previous audio player and reset transcript
    audioPlayer.classList.remove('show');
    transcriptContent.innerHTML = '<div class="transcript-empty">Generating transcript... this may take 30-60 seconds</div>';
    
    // Show loading state
    generateBtn.disabled = true;
    headlinesBtn.disabled = true;
    generateBtn.innerHTML = '<span class="spinner"></span> Creating podcast...';
    showStatus('Generating conversation... this typically takes 30-60 seconds', 'loading');

    try {
        // First, fetch the transcript
        showStatus('Generating script... this typically takes 30-60 seconds', 'loading');
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
        showStatus('Generating audio... this may take another 30-60 seconds', 'loading');
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

    await generatePodcast(topic);
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
        
        // Generate the podcast
        await generatePodcast(topic);
        
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