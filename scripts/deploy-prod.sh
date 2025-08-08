#!/bin/bash

# Production Deployment Script for Job-Fit AI Portal
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_status "Checking prerequisites..."

# Check Node.js version
NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check npm version
NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Please ensure all environment variables are set."
    print_status "Required environment variables:"
    echo "  - NEXTAUTH_SECRET"
    echo "  - NEXTAUTH_URL"
    echo "  - GOOGLE_CLIENT_ID"
    echo "  - GOOGLE_CLIENT_SECRET"
    echo "  - OPENAI_API_KEY"
    echo "  - DATABASE_URL (if using database)"
fi

print_status "Installing dependencies..."
npm install

print_status "Running type check..."
npm run type-check

print_status "Running linting..."
npm run lint

print_status "Building application..."
npm run build

print_status "Running tests..."
npm run test

print_status "Checking for security vulnerabilities..."
npm audit --audit-level moderate

print_status "Optimizing for production..."

# Create production build
print_status "Creating production build..."
npm run build

# Check build output
if [ -d ".next" ]; then
    print_success "Build completed successfully"
else
    print_error "Build failed - .next directory not found"
    exit 1
fi

# Create deployment package
print_status "Creating deployment package..."
tar -czf deployment-$(date +%Y%m%d-%H%M%S).tar.gz \
    .next \
    public \
    package.json \
    package-lock.json \
    next.config.ts \
    tsconfig.json \
    .env.local \
    scripts/

print_success "Deployment package created"

# Production deployment checklist
echo ""
print_status "Production Deployment Checklist:"
echo "✅ Dependencies installed"
echo "✅ Type checking passed"
echo "✅ Linting passed"
echo "✅ Build completed"
echo "✅ Tests passed"
echo "✅ Security audit completed"
echo "✅ Production build created"
echo "✅ Deployment package created"

echo ""
print_status "Next steps for deployment:"
echo "1. Upload the deployment package to your hosting provider"
echo "2. Set up environment variables on your hosting platform"
echo "3. Configure your domain and SSL certificates"
echo "4. Set up monitoring and logging"
echo "5. Configure rate limiting and security headers"
echo "6. Set up database (if using one)"
echo "7. Configure backup strategies"

echo ""
print_status "Recommended hosting platforms:"
echo "• Vercel (recommended for Next.js)"
echo "• Netlify"
echo "• AWS Amplify"
echo "• Railway"
echo "• Render"

echo ""
print_status "Environment variables to set in production:"
echo "NEXTAUTH_SECRET=<your-secret>"
echo "NEXTAUTH_URL=https://yourdomain.com"
echo "GOOGLE_CLIENT_ID=<your-google-client-id>"
echo "GOOGLE_CLIENT_SECRET=<your-google-client-secret>"
echo "OPENAI_API_KEY=<your-openai-api-key>"

echo ""
print_success "Deployment preparation completed successfully!"
print_status "Ready for production deployment 🚀" 