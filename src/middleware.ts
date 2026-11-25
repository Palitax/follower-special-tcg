import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, isValidOverlayKey, isValidSession } from './lib/auth';

const LINKTREE_URL = process.env.LINKTREE_URL ?? 'https://linktr.ee/manacards_de';
const PUBLIC_LINKTREE_HOSTS = new Set(
  (process.env.LINKTREE_REDIRECT_HOSTS ?? 'manacards.de,www.manacards.de')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean)
);

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = (request.headers.get('host') ?? '').toLowerCase().split(':')[0];

  // Keep manacards.de / www.manacards.de root redirecting straight to Linktree
  if (PUBLIC_LINKTREE_HOSTS.has(host) && pathname === '/') {
    return NextResponse.redirect(LINKTREE_URL, 307);
  }

  // Public Kartenankauf tool (/ankauf + POST /api/ankauf) — accessible without Studio login
  if (
    pathname === '/ankauf' ||
    pathname.startsWith('/ankauf/') ||
    (pathname === '/api/ankauf' && request.method === 'POST')
  ) {
    return NextResponse.next();
  }

  const authed = await isValidSession(request.cookies.get(AUTH_COOKIE)?.value);

  // Already logged in → skip the login screen
  if (pathname === '/login') {
    return authed ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  // Always allow /overlay to render transparently (never redirect OBS Browser Source to opaque /login)
  if (pathname === '/overlay' || pathname.startsWith('/overlay/')) {
    return NextResponse.next();
  }

  // Allow read-only GET /api/sync and /api/bars-sync for OBS Browser Source when carrying a valid overlay key
  if (
    (pathname === '/api/sync' || pathname === '/api/bars-sync') &&
    request.method === 'GET'
  ) {
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
