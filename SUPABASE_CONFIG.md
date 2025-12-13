# Supabase Configuration - Quick Reference

## 🎯 Your Configuration Values

Copy these exact values when configuring Supabase:

```
Secret Name:  PYTHON_BACKEND_URL
Secret Value: https://gene-explorer-ai-production.up.railway.app
```

---

## 📍 Where to Configure

**Direct Link to Your Supabase Project:**
```
https://supabase.com/dashboard/project/nkshlnzpyzoxhatbblyg
```

**Navigation Path:**
```
Supabase Dashboard 
  → Edge Functions (left sidebar)
    → extract-features 
      → Settings tab
        → Secrets section
          → Add new secret
```

---

## ⚡ Quick Steps

1. Open: https://supabase.com/dashboard/project/nkshlnzpyzoxhatbblyg
2. Click: **Edge Functions** (left sidebar)
3. Click: **extract-features**
4. Click: **Settings** tab
5. Find: **Secrets** or **Environment Variables** section
6. Click: **Add new secret** or **+ New secret**
7. Enter:
   - Name: `PYTHON_BACKEND_URL`
   - Value: `https://gene-explorer-ai-production.up.railway.app`
8. Click: **Save** or **Add**
9. **CRITICAL:** Click **Redeploy** button to activate the change

---

## ✅ Verification

After configuration, verify it's working:

### Check 1: Edge Function Has Secret
- Go to Edge Functions → extract-features → Settings
- Secrets section should show: `PYTHON_BACKEND_URL` (value hidden)

### Check 2: Run an Analysis
1. Go to your app
2. Create new analysis
3. Upload sequences  
4. Select panels
5. Click "Run Analysis"
6. Should show real computation (not placeholder data)

### Check 3: Check Logs
- **Supabase Logs:** Edge Functions → extract-features → Logs
  - Should show successful calls to Python backend
- **Railway Logs:** https://railway.com/project/e27d711a-0387-4c88-9776-27fe3f84ebd3
  - Should show incoming HTTP requests to `/extract-features`

---

## 🔧 Important Notes

### Must Redeploy
After adding or changing the secret, you **MUST** click "Redeploy" on the edge function. The secret is not active until redeployment.

### Case Sensitive
The secret name must be exactly: `PYTHON_BACKEND_URL` (all caps, with underscores)

### No Trailing Slash
Use: `https://gene-explorer-ai-production.up.railway.app`  
NOT: `https://gene-explorer-ai-production.up.railway.app/`

---

## 🚨 Troubleshooting

### "Secret added but analysis still fails"
→ Did you click "Redeploy" after adding the secret?

### "Cannot find Secrets section"
→ Try looking for "Environment Variables" instead (different Supabase versions)

### "Edge function not listed"
→ Make sure you're in the correct project (nkshlnzpyzoxhatbblyg)

### "Redeploy button not showing"
→ Look for "..." menu or "Actions" dropdown

---

## 📱 Screenshot Guide

When you're in the right place, you should see:
- Page title: "extract-features"
- Tabs: Overview, Settings, Logs, etc.
- Settings tab → Secrets section
- List of secrets with "Add new secret" button

---

## ⏱️ This Takes 2 Minutes

The entire configuration process:
1. Navigate to correct page: 30 seconds
2. Add secret: 30 seconds
3. Redeploy: 60 seconds
4. **Total: ~2 minutes**

---

## 💡 Why This is Needed

Without this configuration:
- ❌ Edge function cannot reach Railway backend
- ❌ Analyses use limited JavaScript fallback
- ❌ No advanced bioinformatics features
- ❌ Placeholder data remains

With this configuration:
- ✅ Edge function calls Railway backend
- ✅ Full feature extraction capabilities
- ✅ Real computation results
- ✅ Advanced bioinformatics analysis
