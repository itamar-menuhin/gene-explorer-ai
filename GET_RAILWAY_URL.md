# How to Get Your Railway Backend URL

Unfortunately, I cannot access external Railway URLs or configure Supabase directly as I don't have access to those services. However, here's exactly how you can get the URL yourself:

## Step-by-Step Instructions

### 1. Get Railway Backend URL

1. **Open your Railway project:**
   - Go to: https://railway.com/project/e27d711a-0387-4c88-9776-27fe3f84ebd3
   - You'll need to be logged into Railway

2. **Find your backend service:**
   - You should see a service called something like "backend", "gene-explorer-backend", or "main"
   - Click on this service

3. **Get the Public URL:**
   - Look for the "Settings" tab in the top navigation
   - Scroll down to find "Public Networking" or "Domains" section
   - You should see a URL like: `https://gene-explorer-backend-production.up.railway.app`
   - **Copy this entire URL**

### 2. Test the Backend URL (Optional but Recommended)

Use the helper script I created:

```bash
./scripts/configure-backend.sh https://your-railway-url.up.railway.app
```

This will test if the backend is responding correctly.

Or test manually:

```bash
curl https://your-railway-url.up.railway.app/health
```

You should see:
```json
{"status": "healthy", "version": "1.0.0"}
```

### 3. Configure in Supabase

**This is the CRITICAL step that makes everything work!**

1. **Go to Supabase Dashboard:**
   - Open: https://supabase.com/dashboard/project/nkshlnzpyzoxhatbblyg
   - You'll need to be logged in

2. **Navigate to Edge Functions:**
   - In the left sidebar, click on "Edge Functions"
   - Find and click on "extract-features"
   - Click on the "Settings" tab

3. **Add the Secret:**
   - Look for the "Secrets" or "Environment Variables" section
   - Click "Add new secret" or similar button
   - Enter:
     - **Name:** `PYTHON_BACKEND_URL`
     - **Value:** Your Railway URL (e.g., `https://gene-explorer-backend-production.up.railway.app`)
   - Click "Save" or "Add"

4. **IMPORTANT - Redeploy:**
   - After adding the secret, you MUST redeploy the edge function
   - Look for a "Redeploy" button or similar
   - Click it to apply the changes

### 4. Verify It's Working

After configuration:

1. Go to your app
2. Create a new analysis
3. Upload sequences
4. Click "Run Analysis"
5. You should see:
   - Progress indicator showing computation
   - Real results appearing (not placeholder data)
   - Activity in Railway logs (check Railway dashboard → your service → Deployments → Logs)

---

## Troubleshooting

### Can't Find Railway URL?

- Make sure you're logged into Railway
- Check if the backend service is actually deployed (should show "Active" status)
- Look for "Domains" or "Public Networking" in Settings

### Backend Health Check Fails?

- The service might be sleeping (Railway free tier)
- Wait a few seconds and try again
- Check Railway logs for errors

### Supabase Configuration Not Working?

- Make sure you clicked "Redeploy" after adding the secret
- Check that the secret name is exactly: `PYTHON_BACKEND_URL` (case-sensitive)
- Check Supabase Edge Function logs for errors

### Still Seeing Placeholder Data?

1. Clear browser cache and reload
2. Check browser console for errors
3. Verify the secret is set in Supabase
4. Check that edge function was redeployed
5. Look at Railway logs - you should see incoming requests

---

## What I Cannot Do

I cannot:
- Access Railway dashboard or retrieve URLs from Railway
- Log into Supabase or configure secrets there
- See your Railway or Supabase credentials

## What You Need to Do

You must manually:
1. Get the Railway URL from your Railway dashboard
2. Add it as a secret in Supabase Edge Functions
3. Redeploy the edge function

This is a one-time configuration that takes about 2 minutes.

---

## Quick Reference

| What | Where | Value |
|------|-------|-------|
| Railway Project | https://railway.com/project/e27d711a-0387-4c88-9776-27fe3f84ebd3 | Get Public URL |
| Supabase Dashboard | https://supabase.com/dashboard/project/nkshlnzpyzoxhatbblyg | Add PYTHON_BACKEND_URL secret |
| Edge Function | Edge Functions → extract-features → Settings | Add secret + Redeploy |

---

Need more help? Check `DEPLOYMENT_CHECKLIST.md` for detailed troubleshooting.
