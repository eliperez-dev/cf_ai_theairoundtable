# Quick Start Guide

## 🚀 Get Started in 2 Minutes

### Step 1: Start the Worker Backend

Open a terminal and run:

```bash
cd aipodcast-worker
npm run dev
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

### Step 4: Generate Your First Podcast! 🎉

1. Enter a topic (or click one of the examples)
2. Click "Generate Podcast"
3. Wait 30-60 seconds while the AI works its magic
4. Listen to your podcast!

## 🎯 What's Happening Behind the Scenes?

1. **Frontend** (localhost:3000) sends your topic to the Worker
2. **Worker** (localhost:8787) uses AI to:
   - Generate a conversational script between Alex and Jamie
   - Convert each line to speech with different voices
   - Combine all audio into one file
3. **Frontend** receives the audio and lets you play/download it

## 🔧 Troubleshooting

**"Make sure your worker is running!"**
- Check that the worker terminal shows `Ready on http://127.0.0.1:8787`
- Try visiting http://localhost:8787 directly (should return audio)

**CORS errors in browser console**
- Make sure you're accessing via `http://localhost:3000` not `file://`
- The worker has CORS headers enabled for all origins

**Worker crashes or times out**
- The AI models can be slow - be patient!
- Check the worker terminal for error messages
- Try a shorter, simpler topic

## 📝 Example Topics to Try

- "The history of the internet"
- "How black holes work"
- "The benefits of meditation"
- "Cloudflare as a company"
- "The future of artificial intelligence"
- "How photosynthesis works"

## 🚢 Next Steps

Once you're happy with local testing:

1. Deploy the worker: `wrangler deploy`
2. Deploy the pages: `wrangler pages deploy pages --project-name=ai-podcast`
3. Update the `WORKER_URL` in `pages/index.html` to your deployed worker URL

Enjoy your AI podcast generator! 🎙️