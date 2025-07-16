import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, updateAdminData } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { rateLimitEnabled, whitelistedUsers } = await request.json();

    // Validate input
    if (typeof rateLimitEnabled !== 'boolean') {
      return NextResponse.json({ error: 'rateLimitEnabled must be a boolean' }, { status: 400 });
    }

    if (!Array.isArray(whitelistedUsers)) {
      return NextResponse.json({ error: 'whitelistedUsers must be an array' }, { status: 400 });
    }

    // Validate email format for whitelisted users
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of whitelistedUsers) {
      if (typeof email !== 'string' || !emailRegex.test(email)) {
        return NextResponse.json({ error: `Invalid email format: ${email}` }, { status: 400 });
      }
    }

    updateAdminData({
      rateLimitEnabled,
      whitelistedUsers
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Admin settings updated successfully' 
    });
  } catch (error) {
    console.error('Admin update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 