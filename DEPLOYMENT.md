# Deployment Guide

This guide will help you deploy your Job Compatibility Portal to production.

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended)

**Why Vercel?**
- Zero configuration for Next.js apps
- Automatic deployments from Git
- Built-in environment variable management
- Free tier available
- Perfect for Next.js apps

**Steps:**

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/Login with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Deploy!

### Option 2: Netlify

**Steps:**
1. Push to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Connect your GitHub repo
4. Set build command: `npm run build`
5. Set publish directory: `.next`
6. Add environment variables
7. Deploy!

### Option 3: Railway

**Steps:**
1. Push to GitHub
2. Go to [railway.app](https://railway.app)
3. Connect your GitHub repo
4. Add environment variables
5. Deploy!

## 🔧 Environment Variables Setup

### Required Variables

Create a `.env.local` file in your project root:

```env
# NextAuth Configuration
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI API
OPENAI_API_KEY=your-openai-api-key
```

### How to Get These Values

#### 1. NEXTAUTH_SECRET
Generate a secure random string:
```bash
openssl rand -base64 32
```

#### 2. Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`

#### 3. OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up/Login
3. Go to "API Keys"
4. Create a new API key
5. Copy the key (starts with `sk-`)

## 🌐 Domain Configuration

### For Vercel
- Your app will get a `.vercel.app` domain automatically
- You can add a custom domain in the Vercel dashboard

### For Netlify
- Your app will get a `.netlify.app` domain automatically
- You can add a custom domain in the Netlify dashboard

### For Railway
- Your app will get a `.railway.app` domain automatically
- You can add a custom domain in the Railway dashboard

## 🔒 Security Considerations

### Production Checklist
- [ ] Use strong NEXTAUTH_SECRET
- [ ] Set NEXTAUTH_URL to your production domain
- [ ] Use HTTPS in production
- [ ] Keep API keys secure
- [ ] Monitor usage and costs

### Rate Limiting
- Rate limiting is enabled by default
- Admin can disable/enable via admin dashboard
- Whitelist users for unlimited access

## 📊 Monitoring

### Vercel Analytics
- Built-in analytics with Vercel
- Monitor performance and usage

### OpenAI Usage
- Monitor API usage in OpenAI dashboard
- Set up billing alerts

### Application Monitoring
- Check admin dashboard for user statistics
- Monitor rate limit usage

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check Google OAuth redirect URIs
   - Verify NEXTAUTH_URL matches your domain
   - Ensure NEXTAUTH_SECRET is set

2. **API Errors**
   - Verify OpenAI API key is correct
   - Check API usage limits
   - Monitor OpenAI dashboard for errors

3. **Build Errors**
   - Check Node.js version (18+ required)
   - Verify all dependencies are installed
   - Check for TypeScript errors

4. **Rate Limiting Issues**
   - Check admin dashboard settings
   - Verify user is not whitelisted
   - Check usage statistics

## 🔄 Updates and Maintenance

### Updating the App
1. Make changes locally
2. Test thoroughly
3. Push to GitHub
4. Deploy automatically (if using Vercel)

### Environment Variable Updates
1. Update in deployment platform dashboard
2. Redeploy if necessary
3. Test functionality

### Database Migration
- Current implementation uses file-based storage
- For production, consider migrating to a proper database
- Update rate limiting logic accordingly

## 💰 Cost Considerations

### Vercel
- Free tier: 100GB bandwidth/month
- Pro: $20/month for more bandwidth

### OpenAI
- GPT-4: ~$0.03 per 1K tokens
- Monitor usage in OpenAI dashboard
- Set up billing alerts

### Google OAuth
- Free for most use cases
- No cost for authentication

## 🎯 Next Steps

After deployment:
1. Test all features thoroughly
2. Set up monitoring and alerts
3. Configure custom domain (optional)
4. Set up analytics (optional)
5. Plan for scaling if needed

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review deployment platform logs
3. Check application logs
4. Open an issue in the GitHub repository 