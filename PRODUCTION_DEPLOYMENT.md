# Production Deployment Guide

## 🚀 Quick Start

### 1. Prepare for Deployment

```bash
# Run the production deployment script
npm run deploy:prepare
```

### 2. Choose Your Hosting Platform

#### Option A: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
npm run deploy:vercel
```

#### Option B: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy to Netlify
npm run deploy:netlify
```

#### Option C: Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy to Railway
npm run deploy:railway
```

## 📋 Pre-Deployment Checklist

### Environment Variables
Ensure these are set in your production environment:

```env
# Authentication
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=https://yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Database (if using)
DATABASE_URL=your-database-url
```

### Security Checklist
- [ ] Environment variables are set
- [ ] API keys are secure and not in code
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] SSL certificates are installed
- [ ] Security headers are set

### Performance Checklist
- [ ] Images are optimized
- [ ] Code is minified
- [ ] CDN is configured
- [ ] Caching is enabled
- [ ] Bundle size is optimized

## 🔧 Platform-Specific Instructions

### Vercel Deployment

1. **Connect Repository**
   ```bash
   vercel --prod
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard
   - Navigate to your project
   - Go to Settings > Environment Variables
   - Add all required environment variables

3. **Custom Domain**
   - Go to Settings > Domains
   - Add your custom domain
   - Configure DNS records

### Netlify Deployment

1. **Build Settings**
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Environment Variables**
   - Go to Site Settings > Environment Variables
   - Add all required variables

### Railway Deployment

1. **Create Railway Project**
   ```bash
   railway login
   railway init
   ```

2. **Set Environment Variables**
   ```bash
   railway variables set NEXTAUTH_SECRET=your-secret
   railway variables set OPENAI_API_KEY=your-key
   ```

3. **Deploy**
   ```bash
   railway up
   ```

## 🛡️ Security Configuration

### Rate Limiting
The application includes built-in rate limiting:
- 3 analyses per 24-hour period per user
- API endpoints are protected
- Authentication required for analysis

### Security Headers
Add these headers to your hosting platform:

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

### CORS Configuration
```javascript
// next.config.ts
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://yourdomain.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
```

## 📊 Monitoring & Analytics

### Recommended Tools
- **Vercel Analytics** (if using Vercel)
- **Google Analytics**
- **Sentry** (error tracking)
- **LogRocket** (session replay)

### Health Checks
Add a health check endpoint:

```typescript
// app/api/health/route.ts
export async function GET() {
  return Response.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString() 
  })
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run type-check
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      - run: npm run deploy:vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clean and rebuild
   npm run clean
   npm install
   npm run build
   ```

2. **Environment Variables**
   - Check all required variables are set
   - Verify API keys are valid
   - Test locally with production variables

3. **Performance Issues**
   ```bash
   # Analyze bundle size
   npm run build:analyze
   ```

4. **Authentication Issues**
   - Verify Google OAuth configuration
   - Check callback URLs
   - Ensure NEXTAUTH_URL is correct

### Debug Commands
```bash
# Check build output
npm run build

# Run type checking
npm run type-check

# Run linting
npm run lint

# Security audit
npm run security:audit

# Format code
npm run format
```

## 📈 Post-Deployment

### Monitoring Checklist
- [ ] Application is accessible
- [ ] Authentication works
- [ ] File uploads work
- [ ] Analysis API responds
- [ ] Rate limiting is active
- [ ] Error tracking is configured
- [ ] Performance monitoring is active

### Performance Optimization
- [ ] Enable compression
- [ ] Configure caching
- [ ] Optimize images
- [ ] Minify CSS/JS
- [ ] Enable CDN

### Backup Strategy
- [ ] Database backups (if applicable)
- [ ] Environment variable backups
- [ ] Code repository backups
- [ ] SSL certificate backups

## 🆘 Support

### Getting Help
1. Check the troubleshooting section above
2. Review application logs
3. Check hosting platform status
4. Contact platform support
5. Open an issue in the repository

### Emergency Rollback
```bash
# If using Vercel
vercel rollback

# If using Netlify
netlify rollback

# If using Railway
railway rollback
```

## 📝 Maintenance

### Regular Tasks
- [ ] Update dependencies monthly
- [ ] Review security audits
- [ ] Monitor performance metrics
- [ ] Backup data weekly
- [ ] Test all features monthly

### Update Process
```bash
# Update dependencies
npm update

# Run tests
npm run test

# Deploy updates
npm run deploy:vercel
```

---

**Ready for Production! 🚀**

Your Job-Fit AI Portal is now ready for production deployment. Follow the steps above to get your application live and serving users. 