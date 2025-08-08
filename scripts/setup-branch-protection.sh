#!/bin/bash

# Branch Protection Setup Script
# This script sets up branch protection rules for main and develop branches

set -e

echo "🔒 Setting up Branch Protection Rules for Job Fit AI Portal"
echo "========================================================="

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "📋 Please follow the manual setup instructions below."
    echo ""
    echo "📖 MANUAL SETUP INSTRUCTIONS:"
    echo "==============================="
    echo ""
    echo "1. Go to your GitHub repository: https://github.com/harshisfun/resumematch"
    echo "2. Click on 'Settings' tab"
    echo "3. Click on 'Branches' in the left sidebar"
    echo "4. Click 'Add rule' to create protection rules"
    echo ""
    echo "🛡️  MAIN BRANCH PROTECTION SETTINGS:"
    echo "======================================"
    echo "Branch name pattern: main"
    echo "✅ Require a pull request before merging"
    echo "   ✅ Require approvals: 1"
    echo "   ✅ Dismiss stale PR approvals when new commits are pushed"
    echo "   ✅ Require review from code owners"
    echo "✅ Require status checks to pass before merging"
    echo "   ✅ Require branches to be up to date before merging"
    echo "   Status checks to require:"
    echo "     - test (18.x)"
    echo "     - test (20.x)"
    echo "     - security"
    echo "✅ Require conversation resolution before merging"
    echo "✅ Restrict pushes that create files larger than 100MB"
    echo "✅ Restrict direct pushes (only allow via PR)"
    echo ""
    echo "🔧 DEVELOP BRANCH PROTECTION SETTINGS:"
    echo "======================================"
    echo "Branch name pattern: develop"
    echo "✅ Require a pull request before merging"
    echo "   ✅ Require approvals: 1"
    echo "✅ Require status checks to pass before merging"
    echo "   ✅ Require branches to be up to date before merging"
    echo "   Status checks to require:"
    echo "     - test (18.x)"
    echo "     - test (20.x)"
    echo "     - security"
    echo "✅ Require conversation resolution before merging"
    echo ""
    echo "💡 To install GitHub CLI:"
    echo "========================"
    echo "macOS: brew install gh"
    echo "Linux: Visit https://github.com/cli/cli#installation"
    echo "Windows: Visit https://github.com/cli/cli#installation"
    echo ""
    exit 1
fi

# Check if user is authenticated with GitHub CLI
if ! gh auth status &> /dev/null; then
    echo "🔐 Please authenticate with GitHub CLI first:"
    echo "gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Get repository information
REPO_OWNER="harshisfun"
REPO_NAME="resumematch"

echo "🔧 Setting up branch protection for repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Function to set up branch protection
setup_branch_protection() {
    local branch_name=$1
    local require_admin=$2
    
    echo "🛡️  Setting up protection for '$branch_name' branch..."
    
    # Main branch gets stricter rules
    if [ "$branch_name" = "main" ]; then
        gh api repos/$REPO_OWNER/$REPO_NAME/branches/$branch_name/protection \
            --method PUT \
            --field required_status_checks[strict]=true \
            --field required_status_checks[contexts][]="test (18.x)" \
            --field required_status_checks[contexts][]="test (20.x)" \
            --field required_status_checks[contexts][]="security" \
            --field enforce_admins=$require_admin \
            --field required_pull_request_reviews[required_approving_review_count]=1 \
            --field required_pull_request_reviews[dismiss_stale_reviews]=true \
            --field required_pull_request_reviews[require_code_owner_reviews]=true \
            --field restrictions=null \
            --field allow_force_pushes=false \
            --field allow_deletions=false
    else
        # Develop branch gets slightly relaxed rules
        gh api repos/$REPO_OWNER/$REPO_NAME/branches/$branch_name/protection \
            --method PUT \
            --field required_status_checks[strict]=true \
            --field required_status_checks[contexts][]="test (18.x)" \
            --field required_status_checks[contexts][]="test (20.x)" \
            --field required_status_checks[contexts][]="security" \
            --field enforce_admins=false \
            --field required_pull_request_reviews[required_approving_review_count]=1 \
            --field required_pull_request_reviews[dismiss_stale_reviews]=false \
            --field required_pull_request_reviews[require_code_owner_reviews]=false \
            --field restrictions=null \
            --field allow_force_pushes=false \
            --field allow_deletions=false
    fi
    
    echo "✅ Branch protection set up for '$branch_name'"
}

# Set up protection for main branch
echo "🚀 Setting up main branch protection..."
setup_branch_protection "main" true

echo ""

# Set up protection for develop branch
echo "🔧 Setting up develop branch protection..."
setup_branch_protection "develop" false

echo ""
echo "🎉 Branch protection rules have been successfully configured!"
echo ""
echo "📋 Summary of protections applied:"
echo "=================================="
echo "🔒 Main branch:"
echo "   - Requires 1 approval for PRs"
echo "   - Requires status checks (tests + security audit)"
echo "   - Dismisses stale reviews on new commits"
echo "   - Requires code owner reviews"
echo "   - Enforces rules for admins"
echo "   - Prevents force pushes and deletions"
echo ""
echo "🔧 Develop branch:"
echo "   - Requires 1 approval for PRs"
echo "   - Requires status checks (tests + security audit)"
echo "   - Allows admin overrides for emergency fixes"
echo "   - Prevents force pushes and deletions"
echo ""
echo "🌐 You can view and modify these settings at:"
echo "https://github.com/$REPO_OWNER/$REPO_NAME/settings/branches"
echo ""
echo "✨ Your repository is now protected and ready for collaborative development!" 