# Quick Start Guide

## Get Started in 2 Minutes

### Step 1: Start the Worker Backend

Open a terminal and run:

```bash
cd aipodcast-worker
wrangler dev --remote
```

You should see: `Ready on http://127.0.0.1:8787`

### Step 2: Start the Frontend

Open **another terminal** and run:

```bash
cd pages
python -m http.server 3000
```

Or if you don't have Python:

```bash
npx http-server -p 3000
```

### Step 3: Open in Browser

Navigate to: **http://localhost:3000**

### Step 4: Generate Your First Podcast!

1. Enter a topic (or click one of the examples)
2. Click "Generate Podcast"
3. Wait 30-60 seconds while the AI works its magic
4. Listen to your podcast!

## What's Happening Behind the Scenes?

1. **Frontend** (localhost:3000) sends your topic to the Worker
2. **Worker** (localhost:8787) uses AI to:
   - Generate a conversational script between Alex and Jamie
   - Convert each line to speech with different voices
   - Combine all audio into one file
3. **Frontend** receives the audio and lets you play/download it
