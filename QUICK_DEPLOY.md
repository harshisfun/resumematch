# 🚀 Quick Deployment Guide

## ✅ Pre-Deployment Security Check

Run the security script before deploying:
```bash
./scripts/deploy-secure.sh
```

## 🔑 Environment Variables Setup

### 1. Generate NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

### 2. Get Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add redirect URIs:
   - Production: `https://your-domain.com/api/auth/callback/google`

### 3. Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create API key
3. Set up billing

## 🚀 Deploy to Vercel (Recommended)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "New Project"
4. Import your repository
5. Add environment variables:
   ```
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=your-generated-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   OPENAI_API_KEY=your-openai-api-key
   ```
6. Deploy!

## ✅ Post-Deployment Checklist

- [ ] Test Google authentication
- [ ] Test file upload (DOCX, TXT)
- [ ] Test analysis functionality
- [ ] Test rate limiting
- [ ] Test admin dashboard
- [ ] Test export features
- [ ] Verify HTTPS is working

## 🔒 Security Status: ✅ SECURE

Your app is secure because:
- ✅ No hardcoded API keys
- ✅ Environment variables properly configured
- ✅ `.env.local` is gitignored
- ✅ All dependencies are secure
- ✅ Rate limiting implemented
- ✅ Admin access restricted

## 📞 Need Help?

- See `DEPLOYMENT.md` for detailed instructions
- See `SECURITY.md` for security details
- Run `./scripts/deploy-secure.sh` for security check 