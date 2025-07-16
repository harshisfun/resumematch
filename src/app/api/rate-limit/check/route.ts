import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canUseAnalysis } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const result = canUseAnalysis(session.user.email);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Rate limit check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 