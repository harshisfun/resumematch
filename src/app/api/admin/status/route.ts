import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin, getAdminData, getAllUsageData } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const adminData = getAdminData();
    const usageData = getAllUsageData();

    return NextResponse.json({
      adminData,
      usageData,
      totalUsers: Object.keys(usageData).length
    });
  } catch (error) {
    console.error('Admin status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 