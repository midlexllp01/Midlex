import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Pass through API, Next internal files, and static assets
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Detect role from subdomain (e.g. developer.midlex.xyz, admin.midlex.xyz, staff.midlex.xyz)
  let subdomain: 'developer' | 'admin' | 'staff' | null = null;
  if (host.startsWith('developer.')) {
    subdomain = 'developer';
  } else if (host.startsWith('admin.')) {
    subdomain = 'admin';
  } else if (host.startsWith('staff.')) {
    subdomain = 'staff';
  }

  if (subdomain) {
    // If accessing root on a subdomain, rewrite to the role page
    if (pathname === '/') {
      return NextResponse.rewrite(new URL(`/${subdomain}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
