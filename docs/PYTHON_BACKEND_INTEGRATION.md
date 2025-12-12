# Python Backend Integration Guide

This guide explains how to integrate the Python FastAPI backend with the rest of the Gene Explorer AI application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Integration Methods](#integration-methods)
4. [Deployment Options](#deployment-options)
5. [Testing the Integration](#testing-the-integration)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Local Development

**Step 1: Start the Python Backend**

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The server will start on `http://localhost:8080`

**Step 2: Configure the Frontend**

Create/update `.env` in the project root:

```bash
VITE_PYTHON_BACKEND_URL=http://localhost:8080
```

**Step 3: Start the Frontend**

```bash
npm install
npm run dev
```

Visit `http://localhost:8080` and test feature extraction!

---

## Architecture Overview

### Current Flow (Without Python Backend)

```
Frontend → Supabase Edge Function → Local JS Computation → Response
```

**Limitations:**
- Only basic features (GC content, nucleotide counts)
- No advanced bioinformatics algorithms
- Limited accuracy for chemical properties

### Enhanced Flow (With Python Backend)

```
Frontend → Supabase Edge Function → Python FastAPI Backend → Response
                                      │
                                      ├─ BioPython
                                      ├─ Feature Engineering Modules
                                      └─ Scientific Python Stack
```

**Benefits:**
- Full feature set (codon usage bias, disorder, structure, motifs)
- Accurate calculations using BioPython
- Extensible (easy to add new feature panels)
- Scalable (can run multiple instances)

---

## Integration Methods

### Method 1: Environment Variable (Recommended)

The Supabase Edge Function (`supabase/functions/extract-features/index.ts`) automatically checks for the `PYTHON_BACKEND_URL` environment variable.

**How it works:**

```typescript
const pythonBackendUrl = Deno.env.get('PYTHON_BACKEND_URL');

if (!pythonBackendUrl) {
  // Use local fallback
  return computeFeaturesLocally(sequences, panels, windowConfig);
}

// Forward to Python backend
const response = await fetch(`${pythonBackendUrl}/extract-features`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
});
```

**To enable:**

1. Deploy Python backend (see [Deployment Options](#deployment-options))
2. Set environment variable in Supabase:
   - Go to Supabase Dashboard → Edge Functions → extract-features → Settings
   - Add secret: `PYTHON_BACKEND_URL=https://your-backend.railway.app`
3. Redeploy edge function

**Pros:**
- Zero code changes required
- Gradual migration (can switch back to local fallback)
- Easy to update backend URL

**Cons:**
- Requires Supabase dashboard access
- Environment variable must be set correctly

### Method 2: Direct Frontend Integration (Not Recommended)

You could bypass the edge function and call Python backend directly from frontend.

**Why this is NOT recommended:**
- Exposes backend URL to public
- No authentication/authorization layer
- CORS complications
- Can't use local fallback
- Bypasses Supabase security

**Only use this for local development/testing.**

---

## Deployment Options

### Option 1: Railway (Fastest)

**Time to deploy:** ~5 minutes

**Steps:**

1. **Push code to GitHub** (if not already done)

2. **Create Railway account**: https://railway.app

3. **New Project → Deploy from GitHub**
   - Select `gene-explorer-ai` repository
   - Railway auto-detects Dockerfile in `backend/`

4. **Configure build settings:**
   - Root directory: `backend`
   - Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

5. **Get public URL**
   - Railway generates: `https://your-backend.up.railway.app`

6. **Set environment variable in Supabase:**
   ```
   PYTHON_BACKEND_URL=https://your-backend.up.railway.app
   ```

7. **Test:**
   ```bash
   curl https://your-backend.up.railway.app/health
   # Should return: {"status":"healthy","version":"1.0.0"}
   ```

**Cost:**
- Free tier: 500 hours/month (enough for testing)
- Starter: $5/month (recommended for production)

**Pros:**
- Extremely fast setup
- Auto-deploy on git push
- Built-in monitoring
- Easy to scale

**Cons:**
- Requires credit card for paid plans
- US-based servers (may have latency for EU/Asia users)

---

### Option 2: Render (Free Tier Available)

**Time to deploy:** ~8 minutes

**Steps:**

1. **Create Render account**: https://render.com

2. **New Web Service**
   - Connect GitHub repository
   - Select `gene-explorer-ai`

3. **Configure:**
   - Name: `gene-explorer-backend`
   - Root directory: `backend`
   - Environment: `Docker`
   - Instance type: Free (for testing) or Starter ($7/month)

4. **Deploy**
   - Render auto-detects Dockerfile
   - Wait for build (~3-5 minutes)

5. **Get public URL**
   - Render generates: `https://gene-explorer-backend.onrender.com`

6. **Set environment variable in Supabase:**
   ```
   PYTHON_BACKEND_URL=https://gene-explorer-backend.onrender.com
   ```

7. **Test:**
   ```bash
   curl https://gene-explorer-backend.onrender.com/health
   ```

**Cost:**
- Free tier available (with cold starts)
- Starter: $7/month (no cold starts)

**Pros:**
- Free tier available
- Global CDN
- Auto-deploy on git push
- Good documentation

**Cons:**
- Free tier has cold starts (~30s delay if idle)
- Slower builds than Railway

---

### Option 3: Docker Compose (Self-Hosted VPS)

**Time to deploy:** ~30 minutes (including server setup)

**Prerequisites:**
- Linux VPS (DigitalOcean, Linode, AWS EC2, etc.)
- Docker + Docker Compose installed
- SSH access

**Steps:**

1. **SSH into your server:**
   ```bash
   ssh user@your-server.com
   ```

2. **Install Docker & Docker Compose:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo apt-get install docker-compose
   ```

3. **Clone repository:**
   ```bash
   cd /opt
   git clone https://github.com/itamar-menuhin/gene-explorer-ai.git
   cd gene-explorer-ai/backend
   ```

4. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   
   # Check status
   docker-compose ps
   
   # View logs
   docker-compose logs -f feature-api
   ```

5. **Set up Nginx reverse proxy:**
   ```bash
   sudo apt-get install nginx certbot python3-certbot-nginx
   
   # Create Nginx config
   sudo nano /etc/nginx/sites-available/gene-explorer-api
   ```
   
   Add:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   
   Enable and reload:
   ```bash
   sudo ln -s /etc/nginx/sites-available/gene-explorer-api /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

6. **Set up SSL with Let's Encrypt:**
   ```bash
   sudo certbot --nginx -d api.yourdomain.com
   ```

7. **Set environment variable in Supabase:**
   ```
   PYTHON_BACKEND_URL=https://api.yourdomain.com
   ```

8. **Test:**
   ```bash
   curl https://api.yourdomain.com/health
   ```

**Cost:**
- VPS: $5-10/month (DigitalOcean Droplet, Linode Nanode)
- Domain: $10-15/year (optional, can use IP)

**Pros:**
- Full control
- Predictable costs
- No vendor lock-in
- Can run other services on same VPS

**Cons:**
- More complex setup
- Must manage server updates/security
- No auto-scaling

---

### Option 4: Serverless (AWS Lambda + API Gateway)

**For advanced users only.** Requires converting FastAPI app to Lambda handler.

**Not covered in this guide, but possible with Mangum adapter:**
```python
from mangum import Mangum
handler = Mangum(app)
```

---

## Testing the Integration

### 1. Test Backend Health

```bash
curl https://your-backend-url.com/health

# Expected response:
# {"status":"healthy","version":"1.0.0"}
```

### 2. Test Panels Endpoint

```bash
curl https://your-backend-url.com/panels

# Expected response:
# {"panels":[{"id":"sequence","name":"Sequence Composition",...}]}
```

### 3. Test Feature Extraction (Basic)

```bash
curl -X POST https://your-backend-url.com/extract-features \
  -H "Content-Type: application/json" \
  -d '{
    "sequences": [
      {
        "id": "test_seq",
        "sequence": "ATGCGATCGATCGATCG",
        "name": "Test Sequence"
      }
    ],
    "panels": {
      "sequence": {"enabled": true}
    },
    "window": {"enabled": false}
  }'

# Expected response:
# {"success":true,"mode":"global","results":[{"sequenceId":"test_seq","features":{...}}],...}
```

### 4. Test End-to-End from Frontend

1. Open your deployed frontend: `https://your-lovable-app.lovable.app`
2. Sign in / sign up
3. Click "New Analysis"
4. Upload a FASTA file or paste sequence
5. Select panels: Sequence Composition + Chemical Properties
6. Click "Compute Features"
7. Wait for results
8. Verify results are displayed (not mock data)

**Check Network Tab:**
- Open DevTools → Network
- Look for request to `extract-features`
- Check response payload
- Should see `computedLocally: false` if using Python backend
- Should see `computedLocally: true` if using local fallback

---

## Configuration Options

### Environment Variables (Python Backend)

The Python backend supports these environment variables:

```bash
# Port (default: 8080)
PORT=8080

# CORS origins (default: *)
CORS_ORIGINS=https://your-frontend.com,https://www.your-frontend.com

# Log level (default: INFO)
LOG_LEVEL=DEBUG

# Reference set path (for CAI calculations)
REFERENCE_SET_PATH=/path/to/reference-sets/
```

**To set in Railway:**
- Go to project → Variables → Add Variable

**To set in Render:**
- Go to service → Environment → Add Environment Variable

**To set in Docker Compose:**
```yaml
services:
  feature-api:
    environment:
      - PORT=8000
      - LOG_LEVEL=DEBUG
```

### Environment Variables (Supabase Edge Functions)

The edge function supports these secrets:

```bash
# Python backend URL (required for Python integration)
PYTHON_BACKEND_URL=https://your-backend.railway.app

# Timeout for backend requests (optional, default: 30s)
BACKEND_TIMEOUT_MS=30000

# OpenAI API key (optional, for AI panel recommendations)
OPENAI_API_KEY=sk-...
```

**To set:**
1. Go to Supabase Dashboard
2. Edge Functions → extract-features → Settings
3. Add secret

---

## Advanced Integration: Streaming Responses

For large batch jobs, you may want streaming responses to show real-time progress.

### Backend Changes (FastAPI)

```python
from fastapi.responses import StreamingResponse
import json

@app.post("/extract-features-stream")
async def extract_features_stream(request: FeatureRequest):
    async def generate():
        for i, seq in enumerate(request.sequences):
            result = extract_global_features(seq.sequence, seq.id, request.panels)
            
            # Send progress update
            yield json.dumps({
                "type": "progress",
                "progress": (i + 1) / len(request.sequences) * 100,
                "sequenceId": seq.id
            }) + "\n"
            
            # Send result
            yield json.dumps({
                "type": "result",
                "data": result.dict()
            }) + "\n"
    
    return StreamingResponse(generate(), media_type="application/x-ndjson")
```

### Frontend Changes

```typescript
// In useFeatureExtraction.ts
const response = await fetch(`${backendUrl}/extract-features-stream`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n').filter(Boolean);
  
  for (const line of lines) {
    const data = JSON.parse(line);
    
    if (data.type === 'progress') {
      onProgress?.(data.progress, `Processing ${data.sequenceId}`);
    } else if (data.type === 'result') {
      results.push(data.data);
    }
  }
}
```

---

## Monitoring and Observability

### Basic Health Checks

**Option 1: UptimeRobot** (Free)

1. Go to https://uptimerobot.com
2. Add monitor:
   - Type: HTTP(s)
   - URL: `https://your-backend-url.com/health`
   - Interval: 5 minutes
3. Set up email/SMS alerts

**Option 2: Pingdom** (Trial available)

Similar setup to UptimeRobot.

### Advanced Monitoring

**Add logging to backend:**

```python
import logging
from fastapi import Request
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} "
        f"completed in {duration:.2f}s with status {response.status_code}"
    )
    
    return response
```

**Integrate with Sentry (optional):**

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FastApiIntegration()],
    traces_sample_rate=1.0,
)
```

---

## Performance Optimization

### 1. Caching Results

Add Redis caching for repeated queries:

```python
import redis
import hashlib
import json

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_cache_key(sequence: str, panels: dict) -> str:
    data = f"{sequence}:{json.dumps(panels, sort_keys=True)}"
    return hashlib.sha256(data.encode()).hexdigest()

@app.post("/extract-features")
async def extract_features(request: FeatureRequest):
    # Check cache
    cache_key = get_cache_key(request.sequences[0].sequence, request.panels.dict())
    cached = redis_client.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    # Compute
    result = compute_features(request)
    
    # Cache for 1 hour
    redis_client.setex(cache_key, 3600, json.dumps(result))
    
    return result
```

### 2. Parallel Processing

Use ProcessPoolExecutor for CPU-bound tasks:

```python
from concurrent.futures import ProcessPoolExecutor
import multiprocessing

executor = ProcessPoolExecutor(max_workers=multiprocessing.cpu_count())

@app.post("/extract-features")
async def extract_features(request: FeatureRequest):
    futures = []
    
    for seq in request.sequences:
        future = executor.submit(extract_global_features, seq.sequence, seq.id, request.panels)
        futures.append(future)
    
    results = [future.result() for future in futures]
    
    return FeatureResponse(success=True, mode="global", results=results, ...)
```

### 3. Database Connection Pooling

For storing results in database:

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)
```

---

## Security Best Practices

### 1. Add API Key Authentication

```python
from fastapi import Security, HTTPException
from fastapi.security.api_key import APIKeyHeader

API_KEY = os.getenv("API_KEY", "your-secret-key")
api_key_header = APIKeyHeader(name="X-API-Key")

def verify_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key

@app.post("/extract-features")
async def extract_features(
    request: FeatureRequest,
    api_key: str = Depends(verify_api_key)
):
    # Your code here
```

Update edge function:
```typescript
const backendResponse = await fetch(`${pythonBackendUrl}/extract-features`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': Deno.env.get('PYTHON_BACKEND_API_KEY'),
  },
  body: JSON.stringify(request),
});
```

### 2. Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/extract-features")
@limiter.limit("10/minute")
async def extract_features(request: Request, feature_request: FeatureRequest):
    # Your code here
```

### 3. Input Validation

Already implemented with Pydantic, but can add extra checks:

```python
MAX_SEQUENCE_LENGTH = 100000
MAX_SEQUENCES = 100

@app.post("/extract-features")
async def extract_features(request: FeatureRequest):
    if len(request.sequences) > MAX_SEQUENCES:
        raise HTTPException(400, f"Maximum {MAX_SEQUENCES} sequences allowed")
    
    for seq in request.sequences:
        if len(seq.sequence) > MAX_SEQUENCE_LENGTH:
            raise HTTPException(400, f"Sequence too long (max {MAX_SEQUENCE_LENGTH})")
    
    # Continue...
```

---

## Troubleshooting

### Problem: "Feature extraction failed" error

**Check 1: Is Python backend running?**
```bash
curl https://your-backend-url.com/health
```

If this fails, check deployment logs.

**Check 2: Is PYTHON_BACKEND_URL set correctly?**
- Go to Supabase Dashboard → Edge Functions → extract-features → Settings
- Verify `PYTHON_BACKEND_URL` secret is set
- Make sure it has `https://` prefix and no trailing slash

**Check 3: Check edge function logs**
- Go to Supabase Dashboard → Edge Functions → extract-features → Logs
- Look for errors

**Check 4: Check Python backend logs**

For Railway:
```
Go to project → Deployments → Latest → View Logs
```

For Render:
```
Go to service → Logs
```

For Docker Compose:
```bash
docker-compose logs -f feature-api
```

### Problem: "computedLocally: true" in response

This means edge function is using local fallback instead of Python backend.

**Reason 1:** `PYTHON_BACKEND_URL` not set
- Set it in Supabase Edge Function secrets

**Reason 2:** Python backend is unreachable
- Check health endpoint
- Check firewall rules

**Reason 3:** Python backend returned error
- Check backend logs for errors

### Problem: Slow response times

**Check 1: Network latency**
```bash
curl -w "Time: %{time_total}s\n" https://your-backend-url.com/health
```

If >500ms, consider:
- Deploy backend closer to Supabase region
- Use CDN/edge functions

**Check 2: Backend performance**
- Check backend logs for slow queries
- Add caching (see Performance Optimization)
- Use parallel processing for batch jobs

**Check 3: Database queries**
- If storing results in database, check query performance
- Add indexes on frequently queried columns

### Problem: Module not found errors

**Error:** `ModuleNotFoundError: No module named 'feature_engineering'`

**Fix for Docker:**
```dockerfile
# Ensure this line is in Dockerfile:
COPY ./feature_engineering /app/feature_engineering

# Build from repository root:
docker build -f backend/Dockerfile -t gene-explorer-backend .
```

**Fix for local:**
```bash
# Run from repository root:
cd /path/to/gene-explorer-ai
export PYTHONPATH=$PWD:$PYTHONPATH
python backend/main.py
```

### Problem: CORS errors

**Error:** "Access to fetch at '...' from origin '...' has been blocked by CORS policy"

**Fix:**
1. Python backend CORS is already set to `allow_origins=["*"]`
2. If still having issues, explicitly set in backend:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-frontend.lovable.app"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

---

## Summary

**Recommended Integration Path:**

1. **Local Development**: Start Python backend locally, test with frontend
2. **Deploy to Railway**: Fastest path to production (5 minutes)
3. **Configure Supabase**: Set `PYTHON_BACKEND_URL` environment variable
4. **Test End-to-End**: Upload sequences, verify results
5. **Monitor**: Set up uptime monitoring with UptimeRobot

**Key Points:**

✅ Python backend is **optional** - frontend works without it (limited features)  
✅ Integration is **zero-code** - just set environment variable  
✅ Deployment is **simple** - Railway/Render handle everything  
✅ Scaling is **easy** - increase instance count or resources

**Need Help?**

- Check logs first (Supabase + Backend)
- Test health endpoint
- Verify environment variables
- Refer to troubleshooting section above
