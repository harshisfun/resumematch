# Contributing to Job Fit AI Portal

## Git Workflow

### Branching Strategy

We use **Git Flow** branching model:

- `main` - Production-ready code
- `develop` - Development branch for integration
- `feature/*` - Feature branches (e.g., `feature/resume-upload`)
- `hotfix/*` - Critical fixes for production
- `release/*` - Release preparation branches

### Development Workflow

1. **Clone the repository**
   ```bash
   git clone https://github.com/harshisfun/resumematch.git
   cd job-fit-ai-portal-nextjs
   ```

2. **Create a feature branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, well-documented code
   - Follow the existing code style
   - Add tests if applicable

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   - Create a Pull Request to `develop` branch
   - Fill out the PR template
   - Wait for code review

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation updates
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add resume file upload functionality
fix: resolve rate limiting calculation error
docs: update API documentation
refactor: simplify authentication logic
```

### Release Process

1. **Create release branch**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/v1.1.0
   ```

2. **Update version and changelog**
   ```bash
   npm run version:minor  # or patch/major
   # Update CHANGELOG.md
   ```

3. **Merge to main and develop**
   ```bash
   git checkout main
   git merge release/v1.1.0
   git tag v1.1.0
   git push origin main --tags
   
   git checkout develop
   git merge release/v1.1.0
   git push origin develop
   ```

### Code Quality

Before submitting:
- Run `npm run lint` to check code style
- Run `npm run build` to ensure the project builds
- Test your changes thoroughly

### Pull Request Guidelines

- Keep PRs small and focused
- Include a clear description of changes
- Link to related issues
- Update documentation if needed
- Ensure CI checks pass

## Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── api/         # API routes
│   ├── admin/       # Admin pages
│   └── globals.css  # Global styles
├── lib/             # Utility libraries
│   ├── auth.ts      # Authentication config
│   └── rateLimit.ts # Rate limiting logic
└── components/      # React components (if any)
```

## Environment Setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`
3. Configure environment variables
4. Run development server: `npm run dev`

## Questions?

Feel free to open an issue for any questions or suggestions! 