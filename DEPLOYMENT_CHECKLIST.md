# Deployment Checklist

This document contains critical configuration steps needed to make the analysis workflow functional.

## ⚠️ CRITICAL: Configure Python Backend URL

The analysis computation requires the Python backend URL to be configured in Supabase Edge Functions.

### Step 1: Get Your Railway Backend URL

The backend is deployed at Railway. To find your backend URL:

1. Visit your Railway project: https://railway.com/project/e27d711a-0387-4c88-9776-27fe3f84ebd3
2. Click on your backend service
3. Go to the "Settings" tab
4. Copy the "Public URL" (should look like: `https://gene-explorer-backend-production.up.railway.app`)

### Step 2: Configure Supabase Edge Function

You **MUST** configure the `PYTHON_BACKEND_URL` in Supabase for the analysis to work:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/nkshlnzpyzoxhatbblyg
2. Navigate to: **Edge Functions** → **extract-features** → **Settings**
3. Under "Secrets", add a new secret:
   - Name: `PYTHON_BACKEND_URL`
   - Value: Your Railway URL (e.g., `https://gene-explorer-backend-production.up.railway.app`)
4. Click "Save"
5. **Redeploy the edge function** for changes to take effect

### Step 3: Verify Backend is Running

Test your backend URL:

```bash
curl https://your-railway-url/health
```

You should see:
```json
{"status": "healthy", "version": "1.0.0"}
```

### Step 4: Test the Full Workflow

1. Go to your app: https://nkshlnzpyzoxhatbblyg.supabase.co
2. Create a new analysis (Guided or Manual mode)
3. Upload sequences
4. Select feature panels
5. Click "Run Analysis"
6. You should see real computation happening with the backend being called

## What Happens Without Backend Configuration?

If `PYTHON_BACKEND_URL` is not set in Supabase:
- The edge function falls back to basic local JavaScript computation
- Only simple features (GC content, basic chemical properties) are available
- Advanced bioinformatics features (codon usage bias, disorder prediction, etc.) won't work

## Troubleshooting

### "No activity in railway deployment"

This means the backend is not receiving requests. Check:

1. Is `PYTHON_BACKEND_URL` set in Supabase Edge Functions? (See Step 2 above)
2. Did you redeploy the edge function after setting the secret?
3. Is the Railway backend actually running? Check the Railway dashboard
4. Test the backend directly with curl (See Step 3 above)

### "Computation failed" error

Check browser console for detailed error messages:
- If you see "Python backend not configured" → Complete Step 2 above
- If you see timeout errors → Backend might be down, check Railway logs
- If you see "Feature extraction failed" → Check edge function logs in Supabase

### Backend Logs

To view backend logs:
1. Go to Railway project dashboard
2. Click on your backend service
3. Go to "Deployments" → Latest deployment
4. View logs to see incoming requests and any errors

## Summary

✅ **Required for production:**
- Set `PYTHON_BACKEND_URL` in Supabase Edge Functions (Step 2)
- Verify backend is running on Railway (Step 3)
- Redeploy edge function after configuration changes

Without this configuration, analyses will fail or only run with limited features.
