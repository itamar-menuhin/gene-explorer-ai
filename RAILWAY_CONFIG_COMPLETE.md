# Railway Backend Configuration - COMPLETE

## ✅ Configuration Applied

I've configured your Railway backend URL in the codebase:

**Railway URL:** `https://gene-explorer-ai-production.up.railway.app`

### What I've Done:

1. ✅ Added `VITE_PYTHON_BACKEND_URL` to `.env` file
2. ✅ Tested the backend endpoint (see status below)

---

## ⚠️ Backend Status

**Current Status:** The backend URL is not responding to health checks.

```
URL: https://gene-explorer-ai-production.up.railway.app/health
Error: Could not resolve host
```

This typically means one of the following:

### Possible Issues:

1. **Service Not Deployed Yet**
   - The Railway service might need to be deployed
   - Check Railway dashboard to see if deployment is active

2. **Service is Sleeping (Free Tier)**
   - Railway free tier services sleep after inactivity
   - First request may take 30-60 seconds to wake up
   - Try accessing the URL in your browser: https://gene-explorer-ai-production.up.railway.app/health

3. **Domain Not Configured**
   - The public domain might not be set up in Railway
   - Check Railway Settings → Networking → Generate Domain

4. **Service Needs to be Restarted**
   - Go to Railway dashboard
   - Click on your service
   - Click "Restart" or "Redeploy"

---

## 🔧 Action Required: Configure Supabase

**CRITICAL:** You still need to add this URL to Supabase Edge Functions manually.

### Step-by-Step Instructions:

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/nkshlnzpyzoxhatbblyg
   ```

2. **Navigate to Edge Functions:**
   - Click "Edge Functions" in left sidebar
   - Click on "extract-features"
   - Click "Settings" tab

3. **Add the Secret:**
   - Look for "Secrets" or "Environment Variables" section
   - Click "Add new secret"
   - Enter:
     ```
     Name:  PYTHON_BACKEND_URL
     Value: https://gene-explorer-ai-production.up.railway.app
     ```
   - Click "Save"

4. **Redeploy the Edge Function:**
   - After adding the secret, click "Redeploy"
   - This is CRITICAL - the secret won't be active until you redeploy

---

## 🧪 Testing the Setup

### 1. Test Backend Directly

Once the Railway service is running, test it:

```bash
curl https://gene-explorer-ai-production.up.railway.app/health
```

Expected response:
```json
{"status": "healthy", "version": "1.0.0"}
```

### 2. Test Through the App

After configuring Supabase:

1. Go to your app
2. Create a new analysis
3. Upload sequences
4. Select panels
5. Click "Run Analysis"
6. Check Railway logs for incoming requests

---

## 📋 Verification Checklist

- [ ] Railway service is deployed and active
- [ ] Backend URL responds to `/health` endpoint
- [ ] `PYTHON_BACKEND_URL` secret added in Supabase
- [ ] Edge function redeployed after adding secret
- [ ] Test analysis runs successfully with real data
- [ ] Railway logs show incoming requests

---

## 🔍 Troubleshooting

### Backend Not Responding

**Check Railway Service:**
1. Go to: https://railway.com/project/e27d711a-0387-4c88-9776-27fe3f84ebd3
2. Look at service status (should be "Active")
3. Check recent deployments
4. View logs for errors

**If service is sleeping:**
- Visit the URL in browser to wake it: https://gene-explorer-ai-production.up.railway.app/health
- Wait 30-60 seconds for service to start
- Try again

**If domain not found:**
- Go to Railway Settings → Networking
- Make sure "Generate Domain" has been clicked
- Copy the exact domain shown

### Analysis Still Shows Placeholder Data

1. Verify `PYTHON_BACKEND_URL` is set in Supabase
2. Confirm edge function was redeployed
3. Check browser console for errors
4. Check Supabase edge function logs
5. Check Railway backend logs

---

## 📝 Summary

**Frontend (.env):** ✅ Configured with Railway URL  
**Supabase Edge Function:** ⚠️ Needs manual configuration (see above)  
**Backend Health:** ⚠️ Not responding (may need deployment/restart)

**Next Step:** Follow the Supabase configuration instructions above to complete the setup.

---

## 🆘 Need Help?

If you continue having issues:
1. Check Railway service status and logs
2. Verify the exact public URL in Railway settings
3. Make sure the backend is deployed and running
4. Test the URL directly in your browser
5. Check Supabase edge function logs for errors
