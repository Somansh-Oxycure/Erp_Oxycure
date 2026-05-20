import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/favicon.ico'];
const SKIP_EDGE_AUTH = process.env.SKIP_EDGE_AUTH === 'true';

export function middleware(request: NextRequest) {
  // Cross-domain cookie auth (Vercel web + Render API) cannot be read by middleware.
  // Allow bypassing edge cookie checks via env var for this deployment mode.
  if (SKIP_EDGE_AUTH) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for refresh token cookie (httpOnly, set by API)
  const hasRefreshToken = request.cookies.has('refresh_token');

  if (!hasRefreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
