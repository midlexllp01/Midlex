import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
const allowed = /^(login|me|logout|password|users(?:\/[a-zA-Z0-9-]+)?|launch\/[a-z-]+)$/;
async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join('/');
  if (!allowed.test(path)) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  const origin = request.headers.get('origin');
  let sameOrigin = false;
  const host = request.headers.get('host') || '';
  const isMidlex = host.endsWith('midlex.xyz');
  try {
    const originHost = origin ? new URL(origin).host : '';
    sameOrigin = (originHost === host) || (isMidlex && originHost.endsWith('midlex.xyz'));
  } catch {}
  if (request.method !== 'GET' && !sameOrigin) return NextResponse.json({ message: 'Invalid request origin' }, { status: 403 });
  const jar = await cookies();
  const token = jar.get('midlex_workspace')?.value;
  if (path !== 'login' && !token) return NextResponse.json({ message: 'Please sign in' }, { status: 401 });
  try {
    const upstream = await fetch(`${process.env.WORKSPACE_API_URL || 'http://localhost:3001'}/workspace/${path}`, {
      method: request.method, cache: 'no-store', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(request.method !== 'GET' ? { body: await request.text() } : {}),
    });
    const data = await upstream.json();
    if (data.token) {
      jar.set('midlex_workspace', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 28800,
        ...(isMidlex ? { domain: '.midlex.xyz' } : {}),
      });
      delete data.token;
    }
    if (path === 'logout' || upstream.status === 401 && path !== 'login') {
      jar.delete({
        name: 'midlex_workspace',
        path: '/',
        ...(isMidlex ? { domain: '.midlex.xyz' } : {}),
      });
    }
    return NextResponse.json(data, { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ message: 'Unable to reach the workspace service. Please try again.' }, { status: 503 }); }
}
export { handle as GET, handle as POST, handle as PATCH };
