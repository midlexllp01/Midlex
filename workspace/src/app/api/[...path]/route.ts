import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const allowed = /^(login|google|me|logout|password|users(?:\/[a-zA-Z0-9-]+)?|launch\/[a-z-]+)$/;
const sessionCookie = 'midlex_workspace';
const sessionMaxAge = 60 * 60 * 24 * 400;

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join('/');
  if (!allowed.test(path)) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  const origin = request.headers.get('origin');
  let sameOrigin = false;
  try { sameOrigin = !!origin && new URL(origin).origin === request.nextUrl.origin; } catch {}
  if (request.method !== 'GET' && !sameOrigin) {
    return NextResponse.json({ message: 'Invalid request origin' }, { status: 403 });
  }

  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (!['login', 'google'].includes(path) && !token) return NextResponse.json({ message: 'Please sign in' }, { status: 401 });

  const apiUrl = process.env.WORKSPACE_API_URL;
  if (!apiUrl) return NextResponse.json({ message: 'Workspace service is not configured' }, { status: 503 });

  try {
    const upstream = await fetch(`${apiUrl.replace(/\/$/, '')}/workspace/${path}`, {
      method: request.method,
      cache: 'no-store',
      signal: AbortSignal.timeout(45000),
      headers: {
        'Content-Type': 'application/json',
        ...(token && path !== 'login' ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(request.method !== 'GET' ? { body: await request.text() } : {}),
    });
    const data = await upstream.json();
    const { token: issuedToken, ...publicData } = data;
    const response = NextResponse.json(publicData, { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });

    const renewedToken = ['login', 'google', 'password'].includes(path) ? issuedToken : token;
    if (upstream.ok && path !== 'logout' && typeof renewedToken === 'string') {
      response.cookies.set(sessionCookie, renewedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: sessionMaxAge,
      });
    }
    if (path === 'logout' || upstream.status === 401 && path !== 'login') response.cookies.delete(sessionCookie);
    return response;
  } catch {
    return NextResponse.json({ message: 'Unable to reach the workspace service. Please try again.' }, { status: 503 });
  }
}

export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
