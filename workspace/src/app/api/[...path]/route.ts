import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const allowed = /^(login|me|logout|password|users(?:\/[a-zA-Z0-9-]+)?|launch\/[a-z-]+)$/;

const DEV_PROJECTS = [
  { id: 'legal-admin', name: 'Legal Management', category: 'Legal operations', description: 'Cases, clients, assignments and firm administration.', access: 'ADMIN' },
  { id: 'legal-staff', name: 'Counsel Workspace', category: 'Legal operations', description: 'Assigned matters, court dates and client collaboration.', access: 'ADMIN' },
  { id: 'finance', name: 'Payments & Finance', category: 'Finance', description: 'Invoices, payment verification and financial records.', access: 'ADMIN' },
  { id: 'cbt', name: 'Assessment Centre', category: 'Learning', description: 'Examinations, candidates and assessment results.', access: 'ADMIN' },
  { id: 'mip', name: 'Internship Programme', category: 'Learning', description: 'Interns, supervision, tasks and logbooks.', access: 'ADMIN' },
  { id: 'hrms', name: 'People & HR', category: 'People', description: 'Staff directory, attendance and leave management.', access: 'ADMIN' },
  { id: 'analytics', name: 'Analytics & Publishing', category: 'Research', description: 'Legal research, reporting and publishing services.', access: 'ADMIN' },
  { id: 'media', name: 'Midlex Media', category: 'Creative', description: 'Content production, event coverage and media services.', access: 'ADMIN' },
  { id: 'realty', name: 'Midlex Realty', category: 'Property', description: 'Property inventory, enquiries and real estate services.', access: 'ADMIN' },
  { id: 'ai', name: 'Midlex AI', category: 'Research', description: 'Legal research assistance, documents and editorial administration.', access: 'ADMIN' }
];

const DEV_PROJECT_URLS: Record<string, { admin: string; user: string }> = {
  'legal-admin': { admin: 'https://admin-midlex-llp-lawfirm.vercel.app', user: 'https://admin-midlex-llp-lawfirm.vercel.app' },
  'legal-staff': { admin: 'https://lawyers-midlex-llp-lawfirm.vercel.app', user: 'https://lawyers-midlex-llp-lawfirm.vercel.app' },
  'finance': { admin: 'https://payment-portal-midlex-llp-lawfirm.vercel.app', user: 'https://payment-portal-midlex-llp-lawfirm.vercel.app' },
  'cbt': { admin: 'https://midlex-cbt.vercel.app', user: 'https://midlex-cbt.vercel.app' },
  'mip': { admin: 'https://midlex-mip.vercel.app', user: 'https://midlex-mip.vercel.app' },
  'hrms': { admin: 'https://admin-midlex-hrms.vercel.app', user: 'https://midlex-hrms.vercel.app' },
  'analytics': { admin: 'https://midlex-analytics-sandy.vercel.app', user: 'https://midlex-analytics-sandy.vercel.app' },
  'media': { admin: 'https://midlex-media-kappa.vercel.app', user: 'https://midlex-media-kappa.vercel.app' },
  'realty': { admin: 'https://reality.midlex.xyz', user: 'https://reality.midlex.xyz' },
  'ai': { admin: 'https://ai.midlex.xyz', user: 'https://ai.midlex.xyz' }
};

const DEV_PROJECT_PATHS: Record<string, { admin: string; user: string }> = {
  'legal-admin': { admin: '/dashboard', user: '/dashboard' },
  'legal-staff': { admin: '/dashboard', user: '/dashboard' },
  'finance': { admin: '/dashboard', user: '/dashboard' },
  'cbt': { admin: '/dashboard/admin', user: '/dashboard' },
  'mip': { admin: '/dashboard/admin', user: '/dashboard' },
  'hrms': { admin: '/', user: '/dashboard' },
  'analytics': { admin: '/', user: '/' },
  'media': { admin: '/', user: '/' },
  'realty': { admin: '/admin', user: '/' },
  'ai': { admin: '/', user: '/' }
};

function createSsoLaunchUrl(projectId: string, user: { id: string; name: string; email: string; role: string }, userAccess: 'ADMIN' | 'USER') {
  const urlEntry = DEV_PROJECT_URLS[projectId] || { admin: 'https://developer.midlex.xyz', user: 'https://developer.midlex.xyz' };
  const baseUrl = userAccess === 'ADMIN' ? urlEntry.admin : urlEntry.user;
  const paths = DEV_PROJECT_PATHS[projectId] || { admin: '/dashboard', user: '/dashboard' };
  const targetPath = userAccess === 'ADMIN' ? paths.admin : paths.user;
  const ssoPayload = {
    token: `sso_${user.id}_${Date.now()}`,
    user: {
      id: user.id,
      workspaceId: user.id,
      name: user.name,
      email: user.email,
      role: userAccess === 'ADMIN' ? 'ADMIN' : (projectId === 'legal-staff' ? 'LAWYER' : (user.role || 'STAFF')),
      department: 'GENERAL',
      status: 'ACTIVE'
    },
    access: userAccess,
    project: projectId,
    path: targetPath,
    exp: Date.now() + 3600000,
  };
  const ssoStr = Buffer.from(JSON.stringify(ssoPayload)).toString('base64');
  const code = Buffer.from(`${user.id}:${projectId}:${Date.now()}`).toString('base64url');
  if (projectId === 'ai') {
    return `${baseUrl}/#sso=${ssoStr}&code=${code}`;
  }
  return `${baseUrl}/sso#sso=${ssoStr}&code=${code}`;
}

let userPasswords: Record<string, string> = {
  'joshuaomatsuli01@gmail.com': 'Jos@56567',
  'abeddybaba@gmail.com': 'Abeddy9498#',
  'hr@midlex.com': 'MidlexHr@2026',
  'victor.dev@midlex.com': 'VictorDev@2026',
  'ogbeideblessed32@gmail.com': 'Revivalist',
  'olamidehannah110@gmail.com': 'Olamide2000@',
  'peerlessoosazuwa7@gmail.com': 'peerless#1',
  'sabbathsamson67@gmail.com': 'Admin@123'
};

let activeWorkspaceUsers = [
  { id: 'usr-dev-joshua', name: 'Joshua Omatsuli', email: 'joshuaomatsuli01@gmail.com', role: 'DEVELOPER', active: true, mustChangePassword: false, grants: {} },
  { id: 'adm-004', name: 'Abeddy (Executive Admin)', email: 'abeddybaba@gmail.com', role: 'ADMIN', active: true, mustChangePassword: false, grants: { 'legal-admin': 'ADMIN', 'legal-staff': 'ADMIN', 'finance': 'ADMIN', 'cbt': 'ADMIN', 'mip': 'ADMIN', 'hrms': 'ADMIN', 'analytics': 'ADMIN', 'media': 'ADMIN', 'realty': 'ADMIN', 'ai': 'ADMIN' } },
  { id: 'adm-005', name: 'Samson Sabbath (Super Admin)', email: 'sabbathsamson67@gmail.com', role: 'ADMIN', active: true, mustChangePassword: false, grants: { 'legal-admin': 'ADMIN', 'legal-staff': 'ADMIN', 'finance': 'ADMIN', 'cbt': 'ADMIN', 'mip': 'ADMIN', 'hrms': 'ADMIN', 'analytics': 'ADMIN', 'media': 'ADMIN', 'realty': 'ADMIN', 'ai': 'ADMIN' } },
  { id: 'adm-001', name: 'Midlex HR Directorate', email: 'hr@midlex.com', role: 'ADMIN', active: true, mustChangePassword: false, grants: {} },
  { id: 'stf-004', name: 'Victor Developer', email: 'victor.dev@midlex.com', role: 'STAFF', active: true, mustChangePassword: false, grants: {} },
  { id: 'stf-005', name: 'Blessed Ogbeide (Sapphire)', email: 'ogbeideblessed32@gmail.com', role: 'STAFF', active: true, mustChangePassword: false, grants: { 'legal-staff': 'USER', 'cbt': 'USER', 'hrms': 'USER' } },
  { id: 'stf-006', name: 'Hannah Olamide (Gemstone)', email: 'olamidehannah110@gmail.com', role: 'STAFF', active: true, mustChangePassword: false, grants: { 'legal-staff': 'USER', 'cbt': 'USER', 'hrms': 'USER' } },
  { id: 'stf-007', name: 'Peerless Osazuwa (Gemstone)', email: 'peerlessoosazuwa7@gmail.com', role: 'STAFF', active: true, mustChangePassword: false, grants: { 'legal-staff': 'USER', 'cbt': 'USER', 'hrms': 'USER' } }
];

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

  // Handle Developer Joshua Omatsuli Login
  if (path === 'login' && request.method === 'POST') {
    let body: any = {};
    let rawText = '';
    try {
      rawText = await request.text();
      body = JSON.parse(rawText);
    } catch {}

    const cleanEmail = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    if (cleanEmail === 'joshuaomatsuli01@gmail.com' && password === (userPasswords['joshuaomatsuli01@gmail.com'] || 'Jos@56567')) {
      const devToken = `DEV_SESSION_JOSHUA_${Date.now()}`;
      jar.set('midlex_workspace', devToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 28800,
        ...(isMidlex ? { domain: '.midlex.xyz' } : {}),
      });

      return NextResponse.json({
        user: {
          id: 'usr-dev-joshua',
          name: 'Joshua Omatsuli',
          email: 'joshuaomatsuli01@gmail.com',
          role: 'DEVELOPER',
          active: true,
          mustChangePassword: false,
          grants: {},
          createdAt: new Date().toISOString()
        }
      }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (cleanEmail === 'abeddybaba@gmail.com' && password === (userPasswords['abeddybaba@gmail.com'] || 'Abeddy9498#')) {
      const adminToken = `ADMIN_SESSION_ABEDDY_${Date.now()}`;
      jar.set('midlex_workspace', adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 28800,
        ...(isMidlex ? { domain: '.midlex.xyz' } : {}),
      });

      return NextResponse.json({
        user: {
          id: 'adm-004',
          name: 'Abeddy (Executive Admin)',
          email: 'abeddybaba@gmail.com',
          role: 'ADMIN',
          active: true,
          mustChangePassword: false,
          grants: {
            'legal-admin': 'ADMIN',
            'legal-staff': 'ADMIN',
            'finance': 'ADMIN',
            'cbt': 'ADMIN',
            'mip': 'ADMIN',
            'hrms': 'ADMIN',
            'analytics': 'ADMIN',
            'media': 'ADMIN',
            'realty': 'ADMIN',
            'ai': 'ADMIN'
          },
          createdAt: '2026-10-16T12:00:00.000Z'
        }
      }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    // Check other registered workspace staff or admin users
    const matchedUser = activeWorkspaceUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (matchedUser && userPasswords[cleanEmail] && password === userPasswords[cleanEmail]) {
      const userToken = `USER_SESSION_${matchedUser.id}_${Date.now()}`;
      jar.set('midlex_workspace', userToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 28800,
        ...(isMidlex ? { domain: '.midlex.xyz' } : {}),
      });

      return NextResponse.json({
        user: {
          ...matchedUser,
          createdAt: new Date().toISOString()
        }
      }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    // Attempt upstream for other users
    try {
      const upstream = await fetch(`${process.env.WORKSPACE_API_URL || 'https://midlex-project-backend.onrender.com'}/workspace/login`, {
        method: 'POST',
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json' },
        body: rawText,
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
      return NextResponse.json(data, { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });
    } catch {
      return NextResponse.json({ message: 'Unable to reach the workspace service. Please verify your credentials or try again.' }, { status: 503 });
    }
  }

  // Handle Developer Joshua Omatsuli Active Session
  if (token && token.startsWith('DEV_SESSION_JOSHUA_')) {
    if (path === 'me') {
      return NextResponse.json({
        user: {
          id: 'usr-dev-joshua',
          name: 'Joshua Omatsuli',
          email: 'joshuaomatsuli01@gmail.com',
          role: 'DEVELOPER',
          active: true,
          mustChangePassword: false,
          grants: {},
          createdAt: '2026-10-20T10:00:00.000Z'
        },
        projects: DEV_PROJECTS,
        users: activeWorkspaceUsers,
        audit: [
          { id: 'aud-2', actorId: 'usr-dev-joshua', action: 'ADMIN_ONBOARDED', target: 'Abeddy (abeddybaba@gmail.com)', createdAt: new Date().toISOString() },
          { id: 'aud-1', actorId: 'usr-dev-joshua', action: 'DEVELOPER_SESSION_ACTIVE', target: 'Developer Ecosystem', createdAt: new Date().toISOString() }
        ]
      }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (path.startsWith('users/') && request.method === 'DELETE') {
      const targetId = path.replace('users/', '');
      activeWorkspaceUsers = activeWorkspaceUsers.filter(u => u.id !== targetId);
      return NextResponse.json({ success: true, message: 'User deleted successfully' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (path.startsWith('users/') && request.method === 'PATCH') {
      const targetId = path.replace('users/', '');
      let body: any = {};
      try { body = JSON.parse(await request.text()); } catch {}
      const targetUser = activeWorkspaceUsers.find(u => u.id === targetId);
      if (!targetUser) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
      if (body.name !== undefined) targetUser.name = body.name;
      if (body.email !== undefined) {
        const cleanEmail = body.email.trim().toLowerCase();
        const oldEmail = targetUser.email.toLowerCase();
        if (oldEmail !== cleanEmail && userPasswords[oldEmail]) {
          userPasswords[cleanEmail] = userPasswords[oldEmail];
          delete userPasswords[oldEmail];
        }
        targetUser.email = cleanEmail;
      }
      if (body.role !== undefined) targetUser.role = body.role;
      if (body.active !== undefined) targetUser.active = body.active === true || body.active === 'true';
      if (body.grants !== undefined) targetUser.grants = body.grants;
      if (body.password) {
        userPasswords[targetUser.email.toLowerCase()] = body.password;
        targetUser.mustChangePassword = false;
      }
      return NextResponse.json(targetUser, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (path === 'users' && request.method === 'POST') {
      let body: any = {};
      try { body = JSON.parse(await request.text()); } catch {}
      const cleanEmail = (body.email || '').trim().toLowerCase();
      const newUser = {
        id: `usr-${Date.now()}`,
        name: body.name || 'Team Member',
        email: cleanEmail,
        role: body.role || 'STAFF',
        active: body.active !== false,
        mustChangePassword: true,
        grants: body.grants || {},
        createdAt: new Date().toISOString()
      };
      if (body.password) {
        userPasswords[cleanEmail] = body.password;
      }
      activeWorkspaceUsers.push(newUser);
      return NextResponse.json(newUser, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }

    if (path.startsWith('launch/')) {
      const projectId = path.replace('launch/', '');
      const user = {
        id: 'usr-dev-joshua',
        name: 'Joshua Omatsuli',
        email: 'joshuaomatsuli01@gmail.com',
        role: 'DEVELOPER'
      };
      const url = createSsoLaunchUrl(projectId, user, 'ADMIN');
      return NextResponse.json({ url }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (path === 'logout') {
      jar.delete({
        name: 'midlex_workspace',
        path: '/',
        ...(isMidlex ? { domain: '.midlex.xyz' } : {}),
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }
  }

  // Handle Admin Abeddy Active Session
  if (token && token.startsWith('ADMIN_SESSION_ABEDDY_')) {
    if (path === 'me') {
      return NextResponse.json({
        user: {
          id: 'adm-004',
          name: 'Abeddy (Executive Admin)',
          email: 'abeddybaba@gmail.com',
          role: 'ADMIN',
          active: true,
          mustChangePassword: false,
          grants: {
            'legal-admin': 'ADMIN',
            'legal-staff': 'ADMIN',
            'finance': 'ADMIN',
            'cbt': 'ADMIN',
            'mip': 'ADMIN',
            'hrms': 'ADMIN',
            'analytics': 'ADMIN',
            'media': 'ADMIN',
            'realty': 'ADMIN',
            'ai': 'ADMIN'
          },
          createdAt: '2026-10-16T12:00:00.000Z'
        },
        projects: DEV_PROJECTS,
        users: activeWorkspaceUsers,
        audit: []
      }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (path.startsWith('users/') && request.method === 'DELETE') {
      const targetId = path.replace('users/', '');
      activeWorkspaceUsers = activeWorkspaceUsers.filter(u => u.id !== targetId);
      return NextResponse.json({ success: true, message: 'User deleted successfully' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (path.startsWith('users/') && request.method === 'PATCH') {
      const targetId = path.replace('users/', '');
      let body: any = {};
      try { body = JSON.parse(await request.text()); } catch {}
      const targetUser = activeWorkspaceUsers.find(u => u.id === targetId);
      if (!targetUser) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
      if (body.name !== undefined) targetUser.name = body.name;
      if (body.email !== undefined) {
        const cleanEmail = body.email.trim().toLowerCase();
        const oldEmail = targetUser.email.toLowerCase();
        if (oldEmail !== cleanEmail && userPasswords[oldEmail]) {
          userPasswords[cleanEmail] = userPasswords[oldEmail];
          delete userPasswords[oldEmail];
        }
        targetUser.email = cleanEmail;
      }
      if (body.role !== undefined) targetUser.role = body.role;
      if (body.active !== undefined) targetUser.active = body.active === true || body.active === 'true';
      if (body.grants !== undefined) targetUser.grants = body.grants;
      if (body.password) {
        userPasswords[targetUser.email.toLowerCase()] = body.password;
        targetUser.mustChangePassword = false;
      }
      return NextResponse.json(targetUser, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (path === 'users' && request.method === 'POST') {
      let body: any = {};
      try { body = JSON.parse(await request.text()); } catch {}
      const cleanEmail = (body.email || '').trim().toLowerCase();
      const newUser = {
        id: `usr-${Date.now()}`,
        name: body.name || 'Team Member',
        email: cleanEmail,
        role: body.role || 'STAFF',
        active: body.active !== false,
        mustChangePassword: true,
        grants: body.grants || {},
        createdAt: new Date().toISOString()
      };
      if (body.password) {
        userPasswords[cleanEmail] = body.password;
      }
      activeWorkspaceUsers.push(newUser);
      return NextResponse.json(newUser, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }

    if (path.startsWith('launch/')) {
      const projectId = path.replace('launch/', '');
      const user = {
        id: 'adm-004',
        name: 'Abeddy (Executive Admin)',
        email: 'abeddybaba@gmail.com',
        role: 'ADMIN'
      };
      const url = createSsoLaunchUrl(projectId, user, 'ADMIN');
      return NextResponse.json({ url }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (path === 'logout') {
      jar.delete({
        name: 'midlex_workspace',
        path: '/',
        ...(isMidlex ? { domain: '.midlex.xyz' } : {}),
      });
      return NextResponse.json({ success: true }, { status: 200 });
    }
  }

  // Handle Staff/User Session
  if (token && token.startsWith('USER_SESSION_')) {
    const userId = token.split('_')[2];
    const user = activeWorkspaceUsers.find(u => u.id === userId);
    if (user) {
      if (path === 'me') {
        const userProjects = DEV_PROJECTS.filter(p => user.role === 'ADMIN' || (user.grants && (user.grants as Record<string, any>)[p.id]))
          .map(p => {
            const explicit = user.grants && (user.grants as Record<string, any>)[p.id];
            return {
              ...p,
              access: explicit || (user.role === 'ADMIN' ? 'ADMIN' : 'USER')
            };
          });
        return NextResponse.json({
          user,
          projects: userProjects.length > 0 ? userProjects : DEV_PROJECTS.slice(0, 4),
          users: user.role === 'ADMIN' ? activeWorkspaceUsers : [],
          audit: []
        }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
      }

      if (user.role === 'ADMIN') {
        if (path.startsWith('users/') && request.method === 'DELETE') {
          const targetId = path.replace('users/', '');
          activeWorkspaceUsers = activeWorkspaceUsers.filter(u => u.id !== targetId);
          return NextResponse.json({ success: true, message: 'User deleted successfully' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
        }

        if (path.startsWith('users/') && request.method === 'PATCH') {
          const targetId = path.replace('users/', '');
          let body: any = {};
          try { body = JSON.parse(await request.text()); } catch {}
          const targetUser = activeWorkspaceUsers.find(u => u.id === targetId);
          if (!targetUser) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
          }
          if (body.name !== undefined) targetUser.name = body.name;
          if (body.email !== undefined) {
            const cleanEmail = body.email.trim().toLowerCase();
            const oldEmail = targetUser.email.toLowerCase();
            if (oldEmail !== cleanEmail && userPasswords[oldEmail]) {
              userPasswords[cleanEmail] = userPasswords[oldEmail];
              delete userPasswords[oldEmail];
            }
            targetUser.email = cleanEmail;
          }
          if (body.role !== undefined) targetUser.role = body.role;
          if (body.active !== undefined) targetUser.active = body.active === true || body.active === 'true';
          if (body.grants !== undefined) targetUser.grants = body.grants;
          if (body.password) {
            userPasswords[targetUser.email.toLowerCase()] = body.password;
            targetUser.mustChangePassword = false;
          }
          return NextResponse.json(targetUser, { status: 200, headers: { 'Cache-Control': 'no-store' } });
        }

        if (path === 'users' && request.method === 'POST') {
          let body: any = {};
          try { body = JSON.parse(await request.text()); } catch {}
          const cleanEmail = (body.email || '').trim().toLowerCase();
          const newUser = {
            id: `usr-${Date.now()}`,
            name: body.name || 'Team Member',
            email: cleanEmail,
            role: body.role || 'STAFF',
            active: body.active !== false,
            mustChangePassword: true,
            grants: body.grants || {},
            createdAt: new Date().toISOString()
          };
          if (body.password) {
            userPasswords[cleanEmail] = body.password;
          }
          activeWorkspaceUsers.push(newUser);
          return NextResponse.json(newUser, { status: 201, headers: { 'Cache-Control': 'no-store' } });
        }
      }

      if (path.startsWith('launch/')) {
        const projectId = path.replace('launch/', '');
        const userAccess: 'ADMIN' | 'USER' = (user.grants && (user.grants as Record<string, any>)[projectId]) || (user.role === 'ADMIN' ? 'ADMIN' : 'USER');
        const url = createSsoLaunchUrl(projectId, user, userAccess);
        return NextResponse.json({ url }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
      }

      if (path === 'logout') {
        jar.delete({
          name: 'midlex_workspace',
          path: '/',
          ...(isMidlex ? { domain: '.midlex.xyz' } : {}),
        });
        return NextResponse.json({ success: true }, { status: 200 });
      }
    }
  }

  // Universal Password Change for active sessions
  if (token && path === 'password' && request.method === 'POST') {
    let body: any = {};
    try { body = JSON.parse(await request.text()); } catch {}
    const newPassword = (body.password || '').trim();
    const currentPassword = (body.currentPassword || '').trim();

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ message: 'New password must be at least 6 characters' }, { status: 400 });
    }

    let emailToUpdate: string | null = null;
    if (token.startsWith('DEV_SESSION_JOSHUA_')) {
      emailToUpdate = 'joshuaomatsuli01@gmail.com';
    } else if (token.startsWith('ADMIN_SESSION_ABEDDY_')) {
      emailToUpdate = 'abeddybaba@gmail.com';
    } else if (token.startsWith('USER_SESSION_')) {
      const userId = token.split('_')[2];
      const u = activeWorkspaceUsers.find(x => x.id === userId);
      if (u) emailToUpdate = u.email;
    }

    if (emailToUpdate) {
      const expected = userPasswords[emailToUpdate];
      if (expected && currentPassword && currentPassword !== expected) {
        return NextResponse.json({ message: 'Current password is incorrect' }, { status: 400 });
      }
      userPasswords[emailToUpdate] = newPassword;
      const u = activeWorkspaceUsers.find(x => x.email.toLowerCase() === emailToUpdate?.toLowerCase());
      if (u) u.mustChangePassword = false;

      return NextResponse.json({ success: true, message: 'Password updated successfully' }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }
  }

  if (path !== 'login' && !token) return NextResponse.json({ message: 'Please sign in' }, { status: 401 });

  try {
    const upstream = await fetch(`${process.env.WORKSPACE_API_URL || 'https://midlex-project-backend.onrender.com'}/workspace/${path}`, {
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
    if (path === 'logout' || (upstream.status === 401 && path !== 'login')) {
      jar.delete({
        name: 'midlex_workspace',
        path: '/',
        ...(isMidlex ? { domain: '.midlex.xyz' } : {}),
      });
    }
    return NextResponse.json(data, { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ message: 'Unable to reach the workspace service. Please try again.' }, { status: 503 }); }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
