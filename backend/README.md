# Feature Extraction Backend

FastAPI backend for genetic sequence feature extraction.

## Setup

```bash
cd backend
pip install -r requirements.txt
```

## Running the Server

```bash
python main.py
# Or with uvicorn directly:
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

## Running Tests

```bash
pytest tests/ -v
```

## API Endpoints

### Health Check
```
GET /health
```

### List Available Panels
```
GET /panels
```

### Extract Features
```
POST /extract-features
Content-Type: application/json

{
  "sequences": [
    {
      "id": "seq_001",
      "sequence": "ATGGTACTGACGATTTAT...",
      "name": "Gene A"
    }
  ],
  "panels": {
    "sequence": { "enabled": true },
    "chemical": { "enabled": true },
    "codonUsage": { "enabled": true }
  },
  "window": {
    "enabled": false,
    "windowSize": 100,
    "stepSize": 10
  }
}
```

## Deployment

Set the `PYTHON_BACKEND_URL` environment variable in your Lovable Cloud project to point to your deployed backend:

```
PYTHON_BACKEND_URL=https://your-backend.railway.app
```

### Deploy to Railway

1. Push this `backend/` folder to a Git repository
2. Create a new Railway project
3. Connect your repository
4. Set the start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Deploy!

### Deploy to Render

1. Create a new Web Service on Render
2. Connect your repository
3. Set root directory to `backend`
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
