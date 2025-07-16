#!/bin/bash

# Secure Deployment Script for Job Compatibility Portal
# This script ensures your app is secure before deployment

echo "🔒 Security Check for Deployment"
echo "================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in project root directory"
    exit 1
fi

echo "✅ 1. Checking for hardcoded secrets..."
if grep -r "sk-" src/ 2>/dev/null; then
    echo "❌ WARNING: Found potential OpenAI keys in code!"
    exit 1
fi

if grep -r "AIza" src/ 2>/dev/null; then
    echo "❌ WARNING: Found potential Google API keys in code!"
    exit 1
fi

echo "✅ No hardcoded secrets found"

echo "✅ 2. Checking environment variables..."
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found (this is okay for production)"
else
    echo "✅ .env.local exists"
fi

echo "✅ 3. Checking .gitignore..."
if grep -q "\.env" .gitignore; then
    echo "✅ Environment files are gitignored"
else
    echo "❌ WARNING: Environment files not in .gitignore!"
    exit 1
fi

echo "✅ 4. Running security audit..."
npm audit --audit-level=moderate
if [ $? -ne 0 ]; then
    echo "❌ Security vulnerabilities found. Run 'npm audit fix' first."
    exit 1
fi

echo "✅ 5. Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed. Fix errors before deployment."
    exit 1
fi

echo "✅ 6. Checking file permissions..."
chmod 600 .env.local 2>/dev/null || echo "⚠️  .env.local not found (okay for production)"
chmod 600 data/*.json 2>/dev/null || echo "⚠️  data files not found (okay for production)"

echo ""
echo "🎉 Security check passed! Your app is ready for deployment."
echo ""
echo "📋 Next steps:"
echo "1. Push to GitHub: git push origin main"
echo "2. Deploy to your chosen platform"
echo "3. Set environment variables in deployment platform"
echo "4. Test all features after deployment"
echo ""
echo "🔑 Required environment variables for production:"
echo "   NEXTAUTH_URL=https://your-domain.com"
echo "   NEXTAUTH_SECRET=(generate with: openssl rand -base64 32)"
echo "   GOOGLE_CLIENT_ID=(from Google Cloud Console)"
echo "   GOOGLE_CLIENT_SECRET=(from Google Cloud Console)"
echo "   OPENAI_API_KEY=(from OpenAI Platform)"
echo ""
echo "📖 See DEPLOYMENT.md and SECURITY.md for detailed instructions" 