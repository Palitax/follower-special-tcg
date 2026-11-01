import { NextResponse } from 'next/server';
import { AUTH_COOKIE, AUTH_MAX_AGE, checkCredentials, createSessionToken } from '../../../lib/auth';

export async function POST(request: Request) {
  let username = '';
  let password = '';
  try {
    const body = await request.json();
    username = typeof body?.username === 'string' ? body.username : '';
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  if (!checkCredentials(username, password)) {
    // Small delay to slow down brute-force attempts
    await new Promise((r) => setTimeout(r, 450));
    return NextResponse.json(
      { ok: false, error: 'Benutzername oder Passwort ist falsch.' },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: await createSessionToken(),
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_MAX_AGE,
  });
  return response;
}
