#!/bin/bash

# Helper script to configure and test the Railway backend URL
# Usage: ./scripts/configure-backend.sh <railway-url>

set -e

RAILWAY_URL="$1"

if [ -z "$RAILWAY_URL" ]; then
    echo "❌ Error: Railway URL is required"
    echo ""
    echo "Usage: ./scripts/configure-backend.sh <railway-url>"
    echo ""
    echo "To get your Railway URL:"
    echo "1. Go to: https://railway.com/project/e27d711a-0387-4c88-9776-27fe3f84ebd3"
    echo "2. Click on your backend service"
    echo "3. Go to Settings tab"
    echo "4. Copy the 'Public URL' (e.g., https://gene-explorer-backend-production.up.railway.app)"
    echo ""
    exit 1
fi

# Remove trailing slash if present
RAILWAY_URL="${RAILWAY_URL%/}"

echo "🔍 Testing Railway backend at: $RAILWAY_URL"
echo ""

# Test health endpoint
echo "Testing /health endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/health" || echo "ERROR")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Health check passed!"
    echo "   Response: $RESPONSE_BODY"
else
    echo "❌ Health check failed!"
    echo "   HTTP Code: $HTTP_CODE"
    echo "   Response: $RESPONSE_BODY"
    exit 1
fi

echo ""
echo "Testing /panels endpoint..."
PANELS_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/panels" || echo "ERROR")
HTTP_CODE=$(echo "$PANELS_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Panels endpoint works!"
else
    echo "⚠️  Panels endpoint returned: $HTTP_CODE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Backend is healthy and ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure in Supabase Edge Functions:"
echo "   a. Go to: https://supabase.com/dashboard/project/nkshlnzpyzoxhatbblyg"
echo "   b. Navigate to: Edge Functions → extract-features → Settings"
echo "   c. Add this secret:"
echo ""
echo "      Name:  PYTHON_BACKEND_URL"
echo "      Value: $RAILWAY_URL"
echo ""
echo "   d. Click 'Save'"
echo "   e. IMPORTANT: Redeploy the edge function!"
echo ""
echo "2. Test the full workflow:"
echo "   - Create a new analysis"
echo "   - Upload sequences"
echo "   - Run computation"
echo "   - Check that real results appear"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
