# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enhanced version control workflow with CI/CD pipeline
- GitHub Actions for automated testing and deployment
- Comprehensive .gitattributes for file handling
- Version management scripts in package.json

## [0.1.0] - 2024-01-XX

### Added
- Initial release of Job Fit AI Portal
- Resume text extraction from DOCX and TXT files
- OpenAI-powered resume and job description analysis
- Rate limiting system (3 analyses per 24 hours)
- NextAuth.js authentication system
- Admin dashboard for usage monitoring
- Responsive React frontend with modern UI

### Features
- **File Upload**: Support for DOCX and TXT resume files
- **AI Analysis**: Detailed compatibility scoring using GPT-4
- **User Management**: Authentication and session management
- **Rate Limiting**: Usage controls to prevent abuse
- **Admin Panel**: Administrative oversight and statistics
- **Security**: Proper authentication and input validation

### Technical Stack
- Next.js 15.4.1 with App Router
- React 19.1.0
- TypeScript 5
- Tailwind CSS 4
- NextAuth.js 4.24.11
- OpenAI API integration
- Mammoth for document processing

[Unreleased]: https://github.com/harshisfun/resumematch/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/harshisfun/resumematch/releases/tag/v0.1.0 