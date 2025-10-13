# Cloudflare Pages Frontend

This is the user interface for the AI Roundtable Agent.

## Local Development

1. **Start the Worker (in another terminal):**
   ```bash
   cd ../aipodcast-worker
   npm run dev
   ```

2. **Serve the HTML file:**
   
   **Option A - Using Python:**
   ```bash
   python -m http.server 3000
   ```
   
   **Option B - Using Node.js (http-server):**
   ```bash
   npx http-server -p 3000
   ```
   
   **Option C - Just open the file:**
   Simply open `index.html` in your browser (may have CORS issues)

3. **Open in browser:**
   Navigate to `http://localhost:3000`

## Configuration

In `index.html`, update the `WORKER_URL` constant:

```javascript
const WORKER_URL = 'http://localhost:8787'; // For local development
// const WORKER_URL = 'https://your-worker.your-subdomain.workers.dev'; // For production
```

## Deploying to Cloudflare Pages

1. **Create a new Pages project:**
   ```bash
   wrangler pages project create ai-podcast
   ```

2. **Deploy:**
   ```bash
   wrangler pages deploy . --project-name=ai-podcast
   ```

3. **Update the WORKER_URL** in `index.html` to point to your deployed worker

## Features

- ✅ Clean, modern UI
- ✅ Text input for custom topics
- ✅ Example topics for quick testing
- ✅ Loading states with spinner
- ✅ Audio player with controls
- ✅ Download button for generated podcasts
- ✅ Error handling and user feedback