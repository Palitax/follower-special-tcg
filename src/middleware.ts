import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, isValidOverlayKey, isValidSession } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authed = await isValidSession(request.cookies.get(AUTH_COOKIE)?.value);

  // Already logged in → skip the login screen
  if (pathname === '/login') {
    return authed ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  // Allow OBS Browser Source access to /overlay when carrying a valid ?key=... token
  if (pathname === '/overlay' || pathname.startsWith('/overlay/')) {
    const keyOk = await isValidOverlayKey(request.nextUrl.searchParams.get('key'));
    if (authed || keyOk) {
      return NextResponse.next();
    }
  }

  // Allow read-only GET /api/sync for OBS Browser Source when carrying a valid overlay key
  if (pathname === '/api/sync' && request.method === 'GET') {
    const suppliedKey =
      request.nextUrl.searchParams.get('key') ?? request.headers.get('x-overlay-key');
    if (authed || (await isValidOverlayKey(suppliedKey))) {
      return NextResponse.next();
    }
  }

  if (!authed) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except auth endpoints, Next internals and static assets needed by login/overlay
  matcher: ['/((?!api/login|api/logout|_next/static|_next/image|favicon.ico|manifest.json|images/).*)'],
};
