import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

function getEncodedKey(): Uint8Array {
  const secretKey = process.env.SESSION_SECRET || (process.env.NEXT_PHASE === "phase-production-build" ? "build_fallback_secret_32bytes_hex" : undefined);
  if (!secretKey) throw new Error("[FATAL] SESSION_SECRET is not set.");
  return new TextEncoder().encode(secretKey);
}

const protectedApiPrefix = '/api'
const publicApiPrefixes = ['/api/auth', '/api/docs', '/api-docs']

// Helper to check if API path should be protected
function isProtectedApi(pathname: string) {
  if (!pathname.startsWith(protectedApiPrefix)) return false
  if (pathname.startsWith('/api/logs')) return true
  return !publicApiPrefixes.some(prefix => pathname.startsWith(prefix))
}

// Simple in-memory rate limiter for brute-force protection
const loginAttempts = new Map<string, { count: number, resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = 10; // 10 attempts
  const windowMs = 60 * 1000; // 1 minute

  let record = loginAttempts.get(ip);
  if (!record || now > record.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Rate Limit Auth Routes
  if (request.method === 'POST' && (pathname === '/api/auth/login' || pathname === '/api/auth/register')) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests, please try again later.' }, { status: 429, headers: { 'Retry-After': '60' } })
    }
  }

  // Public pages
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.next()
  }

  // Next.js static assets and internal requests.
  // L-1: match known asset extensions explicitly instead of any path containing a
  // dot — the old `includes('.')` fail-open pattern skipped auth for any such path.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    /\.(css|js|mjs|map|json|txt|xml|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|eot)$/i.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Check auth cookie
  const sessionToken = request.cookies.get('strix_session')?.value
  const schedulerKey = request.headers.get('x-scheduler-secret')
  let isAuthenticated = false
  let userRole = 'USER'
  let userStatus = 'APPROVED'

  const expectedSchedulerKey = process.env.SCHEDULER_SECRET;
  if (schedulerKey && expectedSchedulerKey && schedulerKey === expectedSchedulerKey) {
    isAuthenticated = true
    userRole = 'ADMIN' // Allow scheduler to act as ADMIN
  } else if (sessionToken) {
    try {
      const verified = await jwtVerify(sessionToken, getEncodedKey(), {
        algorithms: ["HS256"],
      })
      isAuthenticated = true
      userRole = verified.payload.role as string
      userStatus = (verified.payload.status as string) || 'APPROVED'
    } catch (e) {
      // Invalid token
    }
  }

  // M-3: CSRF defense-in-depth. For state-changing API calls, reject any request
  // whose Origin host doesn't match the target host. Same-origin browser fetches
  // always send a matching Origin; server-to-server callers (scheduler) are exempt
  // via the shared secret; non-browser clients that send no Origin are allowed
  // (the SameSite=Strict session cookie already blocks cross-site cookie replay).
  if (
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    pathname.startsWith('/api')
  ) {
    const isScheduler = !!(schedulerKey && expectedSchedulerKey && schedulerKey === expectedSchedulerKey)
    if (!isScheduler) {
      const origin = request.headers.get('origin')
      if (origin) {
        try {
          if (new URL(origin).host !== request.headers.get('host')) {
            return NextResponse.json({ error: 'Cross-origin request blocked' }, { status: 403 })
          }
        } catch {
          return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
        }
      }
    }
  }

  // API Route Protection
  if (isProtectedApi(pathname)) {
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (userStatus !== 'APPROVED' && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Account not approved' }, { status: 403 })
    }
    
    // RBAC for APIs
    if (pathname.startsWith('/api/logs') && userRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.next()
  }

  // UI Route Protection (Anything else not public)
  if (!isAuthenticated && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // RBAC for UI
  if (isAuthenticated && (pathname.startsWith('/logs') || pathname.startsWith('/api-docs'))) {
    if (userRole !== 'ADMIN') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
