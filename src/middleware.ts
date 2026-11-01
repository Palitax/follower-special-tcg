import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE, isValidSession } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authed = await isValidSession(request.cookies.get(AUTH_COOKIE)?.value);

  // Already logged in → skip the login screen
  if (pathname === '/login') {
    return authed ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  if (!authed) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect everything except auth endpoints, Next internals and static assets needed by the login screen
  matcher: ['/((?!api/login|api/logout|_next/static|_next/image|favicon.ico|manifest.json|images/).*)'],
};
