import { NextRequest, NextResponse } from 'next/server';
import { apiUrl, projectId, cookieName, adminOnly } from './lib/workspace-sso';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Always allow SSO, Next.js internals, static assets, and public auth routes
  if (
    path === '/sso' ||
    path.startsWith('/api/sso') ||
    path.startsWith('/_next/') ||
    path === '/login' ||
    path === '/signup' ||
    path === '/admin/login' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    /\.(?:png|jpe?g|svg|ico|webp|woff2?|css|js|map)$/.test(path)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(cookieName)?.value;

  // When no workspace SSO cookie is present, allow standard in-app authentication
  if (!token) {
    return NextResponse.next();
  }

  try {
    const response = await fetch(`${apiUrl}/workspace/introspect`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ project: projectId }),
      signal: AbortSignal.timeout(45000),
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return new NextResponse('The workspace service is unavailable. Please try again.', { status: 503 });
      }
      const redirect = NextResponse.redirect(new URL('/login', request.url));
      redirect.cookies.delete(cookieName);
      return redirect;
    }

    const session = await response.json();
    if (session.access !== 'ADMIN' && (adminOnly || path.startsWith('/admin') || path.startsWith('/dashboard/admin') || path.startsWith('/dashboard/admins') || path.startsWith('/api/admin'))) {
      return new NextResponse('Your developer has assigned user access. Admin access is required for this page.', { status: 403 });
    }

    const next = NextResponse.next();
    next.cookies.set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 400 });
    return next;
  } catch {
    return NextResponse.next();
  }
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
