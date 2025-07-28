import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Protected routes that require authentication
const protectedPaths = ['/parser'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the current path needs protection
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  
  if (isProtectedPath) {
    try {
      // Get the JWT token from the request
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      });

      // If no token, redirect to login
      if (!token) {
        const loginUrl = new URL('/api/auth/signin', request.url);
        loginUrl.searchParams.set('callbackUrl', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Check rate limits for parser endpoints
      if (pathname.startsWith('/parser')) {
        const rateLimitResult = await checkRateLimit(token.email as string);
        
        if (!rateLimitResult.allowed) {
          return NextResponse.json(
            { 
              error: 'Rate limit exceeded', 
              resetTime: rateLimitResult.resetTime,
              dailyQuota: rateLimitResult.dailyQuota 
            },
            { status: 429 }
          );
        }
      }

      // Add user info to headers for API routes
      const response = NextResponse.next();
      response.headers.set('x-user-email', token.email as string);
      response.headers.set('x-user-id', token.sub as string);
      
      return response;
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

async function checkRateLimit(userEmail: string): Promise<{
  allowed: boolean;
  resetTime?: number;
  dailyQuota?: number;
}> {
  try {
    // Use the existing rate limit check from your API
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/rate-limit/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userEmail }),
    });

    if (!response.ok) {
      // If rate limit service fails, allow the request
      return { allowed: true };
    }

    const data = await response.json();
    return {
      allowed: data.allowed,
      resetTime: data.resetTime,
      dailyQuota: data.dailyQuota,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Default to allowing if rate limit check fails
    return { allowed: true };
  }
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - api/auth (auth endpoints)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}; 