import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const USAGE_FILE = path.join(DATA_DIR, 'usage.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize files if they don't exist
if (!fs.existsSync(USAGE_FILE)) {
  fs.writeFileSync(USAGE_FILE, JSON.stringify({}));
}

if (!fs.existsSync(ADMIN_FILE)) {
  fs.writeFileSync(ADMIN_FILE, JSON.stringify({
    rateLimitEnabled: true,
    whitelistedUsers: []
  }));
}

interface UsageData {
  [email: string]: {
    count: number;
    lastReset: string; // ISO date string
  };
}

interface AdminData {
  rateLimitEnabled: boolean;
  whitelistedUsers: string[];
}

export function isAdmin(email: string): boolean {
  return email === 'hi@harsh.fun';
}

export function isWhitelisted(email: string): boolean {
  try {
    const adminData: AdminData = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
    return adminData.whitelistedUsers.includes(email);
  } catch (error) {
    console.error('Error reading admin data:', error);
    return false;
  }
}

export function isRateLimitEnabled(): boolean {
  try {
    const adminData: AdminData = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
    return adminData.rateLimitEnabled;
  } catch (error) {
    console.error('Error reading admin data:', error);
    return true; // Default to enabled
  }
}

export function canUseAnalysis(email: string): { allowed: boolean; remaining: number; resetTime?: string } {
  // Admin and whitelisted users have unlimited access
  if (isAdmin(email) || isWhitelisted(email)) {
    return { allowed: true, remaining: -1 };
  }

  // If rate limiting is disabled, allow all
  if (!isRateLimitEnabled()) {
    return { allowed: true, remaining: -1 };
  }

  try {
    const usageData: UsageData = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    const now = new Date();
    const userData = usageData[email];

    if (!userData) {
      // First time user
      return { allowed: true, remaining: 2 };
    }

    const lastReset = new Date(userData.lastReset);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    // Reset counter if 24 hours have passed
    if (hoursSinceReset >= 24) {
      return { allowed: true, remaining: 2 };
    }

    // Check if user has remaining uses
    if (userData.count < 3) {
      return { allowed: true, remaining: 2 - userData.count };
    }

    // Calculate when the limit resets
    const resetTime = new Date(lastReset.getTime() + 24 * 60 * 60 * 1000);
    
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: resetTime.toISOString() 
    };
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return { allowed: true, remaining: -1 }; // Allow on error
  }
}

export function recordAnalysisUsage(email: string): void {
  // Don't record usage for admin or whitelisted users
  if (isAdmin(email) || isWhitelisted(email)) {
    return;
  }

  // Don't record if rate limiting is disabled
  if (!isRateLimitEnabled()) {
    return;
  }

  try {
    const usageData: UsageData = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    const now = new Date();
    const userData = usageData[email];

    if (!userData) {
      // First time user
      usageData[email] = {
        count: 1,
        lastReset: now.toISOString()
      };
    } else {
      const lastReset = new Date(userData.lastReset);
      const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

      if (hoursSinceReset >= 24) {
        // Reset counter
        usageData[email] = {
          count: 1,
          lastReset: now.toISOString()
        };
      } else {
        // Increment counter
        usageData[email] = {
          count: userData.count + 1,
          lastReset: userData.lastReset
        };
      }
    }

    fs.writeFileSync(USAGE_FILE, JSON.stringify(usageData, null, 2));
  } catch (error) {
    console.error('Error recording usage:', error);
  }
}

export function getAdminData(): AdminData {
  try {
    return JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
  } catch (error) {
    console.error('Error reading admin data:', error);
    return { rateLimitEnabled: true, whitelistedUsers: [] };
  }
}

export function updateAdminData(data: Partial<AdminData>): void {
  try {
    const currentData = getAdminData();
    const updatedData = { ...currentData, ...data };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(updatedData, null, 2));
  } catch (error) {
    console.error('Error updating admin data:', error);
    throw error;
  }
}

export function getAllUsageData(): UsageData {
  try {
    return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
  } catch (error) {
    console.error('Error reading usage data:', error);
    return {};
  }
} 