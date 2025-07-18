# Job Compatibility Portal

An AI-powered web application that analyzes candidate resumes against job descriptions using OpenAI's GPT-4. Features include Google SSO authentication, file upload support (DOCX, TXT), detailed compatibility analysis, and export functionality.

## Features

- 🔐 Google SSO Authentication - Secure login with Google OAuth
- 📄 File Upload Support - Upload DOCX and TXT resume files
- 🤖 AI-Powered Analysis - Detailed compatibility analysis using OpenAI GPT-4
- 📊 Comprehensive Reports - Skill matching, missing criteria, and improvement recommendations
- 📤 Export Functionality - Export results as JSON or PDF
- ⚡  Rate Limiting - 3 analyses per 24-hour period per user
- 👑 Admin Dashboard - Manage rate limits and whitelist users
- 🎨 Modern UI - Beautiful, responsive design with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15.4.1 with TypeScript
- **Authentication**: NextAuth.js with Google OAuth
- **AI**: OpenAI GPT-4 API
- **Styling**: Tailwind CSS
- **File Processing**: Mammoth.js for DOCX files
- **Deployment**: Ready for Vercel, Netlify, or Railway

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OpenAI API
OPENAI_API_KEY=your-openai-api-key
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google OAuth credentials
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd job-fit-ai-portal-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env.local`
   - Fill in your API keys and OAuth credentials

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Sign in with Google
   - Start analyzing resumes!

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add environment variables in the Vercel dashboard
   - Deploy automatically

### Environment Variables for Production

Make sure to set these in your deployment platform:

```env
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`

## Admin Features

- **Admin Access**: Only `hi@harsh.fun` can access admin features
- **Rate Limit Management**: Enable/disable rate limiting globally
- **Whitelist Management**: Add/remove users from unlimited access
- **Usage Statistics**: Monitor user activity and usage patterns

## Rate Limiting

- **Standard Users**: 3 analyses per 24-hour period
- **Admin**: Unlimited access
- **Whitelisted Users**: Unlimited access (managed by admin)
- **Rolling Window**: Resets 24 hours after first use

## File Support

- **DOCX**: Full support with text extraction
- **TXT**: Full support
- **PDF**: Coming soon (currently disabled)

## API Endpoints

- `POST /api/extract-text` - Extract text from uploaded files
- `POST /api/analyze` - Analyze resume against job description
- `GET /api/rate-limit/check` - Check user's rate limit status
- `GET /api/admin/status` - Get admin dashboard data
- `POST /api/admin/update` - Update admin settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the GitHub repository.
