# Notes

## Local Development

**Serve HTML locally with Python**:
```powershell
Set-Location "d:\Projects\cf_ai_aipodcast\pages"
python -m http.server 8000
```
Then visit: http://localhost:8000

**Run Worker locally**:
```powershell
cd aipodcast-worker
wrangler dev --remote
```

## Deployment

**Quick Deploy Script** (from project root):
```powershell
.\deploy.ps1           # Deploy both Worker + Pages
.\deploy.ps1 pages     # Deploy only Pages
.\deploy.ps1 worker    # Deploy only Worker
```

**Manual Deployment**:
```powershell
# Deploy Pages manually
wrangler pages deploy pages --project-name=ai-roundtable

# Deploy Worker manually
cd aipodcast-worker
npm run deploy
```

**NPM Scripts** (from aipodcast-worker folder):
```powershell
cd aipodcast-worker
npm run deploy:pages    # Deploy pages
npm run deploy          # Deploy worker
npm run deploy:all      # Deploy both
```

## URLs

- **Pages (Frontend)**: https://ai-roundtable.pages.dev
- **Worker (API)**: https://aipodcast-worker.eliperez0024.workers.dev
- **Cloudflare Dashboard**: https://dash.cloudflare.com