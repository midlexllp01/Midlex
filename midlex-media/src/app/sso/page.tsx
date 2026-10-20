'use client';
import { useEffect, useRef, useState } from 'react';

export default function WorkspaceSignIn() {
  const started = useRef(false);
  const [error, setError] = useState('');
  const [workspace, setWorkspace] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Direct client-side SSO handoff payload from Midlex Workspace
    const hash = window.location.hash.slice(1);
    const search = window.location.search.slice(1);
    const params = new URLSearchParams(hash || search);
    const ssoRaw = params.get('sso');

    if (ssoRaw) {
      try {
        const rawJson = atob(ssoRaw);
        const data = JSON.parse(decodeURIComponent(escape(rawJson)));
        const user = data.user;
        const admin = data.access === 'ADMIN' || user.role === 'DEVELOPER' || user.role === 'ADMIN';

        localStorage.setItem('midlex_token', data.token || 'workspace_sso_token');
        localStorage.setItem('midlex_user', JSON.stringify(user));

        if (data.project === 'cbt') {
          const cbtSession = { ...user, role: admin ? 'ADMIN' : 'USER', candidateId: user.workspaceId || user.id, assignedExamIds: [] };
          localStorage.setItem('midlex_cbt_session', JSON.stringify(cbtSession));
          if (admin) localStorage.setItem('midlex_cbt_admin_session', JSON.stringify(cbtSession));
        }

        if (data.project === 'mip') {
          localStorage.setItem('midlex_mip_session', JSON.stringify({ ...user, role: admin ? 'INTERNSHIP_ADMIN' : 'STUDENT_INTERN', internId: user.workspaceId || user.id, totalHoursLogged: 0 }));
        }

        if (data.project === 'hrms') {
          localStorage.setItem('midlex_hrms_user', JSON.stringify({ ...user, role: admin ? 'HR_ADMIN' : 'STAFF', staffId: user.id, department: 'GENERAL', staffCategory: 'SUPPORT_STAFF', supportRole: 'Staff', firstLoginSetupComplete: true }));
          if (admin) localStorage.setItem('midlex_hrms_admin_access', 'true');
        }

        if (data.project === 'realty') {
          localStorage.setItem('midlex_realty_admin_token', data.token || 'workspace_sso_token');
          localStorage.setItem('midlex_realty_admin_user', JSON.stringify(user));
        }

        if (data.project === 'finance' || data.project === 'payment-portal') {
          localStorage.setItem('midlex_finance_token', data.token || 'workspace_sso_token');
          localStorage.setItem('midlex_finance_user', JSON.stringify(user));
        }

        if (data.project === 'ai') {
          localStorage.setItem('midlex_ai_workspace_user', JSON.stringify(user));
          localStorage.setItem('midlex_ai_workspace_token', data.token || 'workspace_sso_token');
        }

        // Clean URL and immediately route to assigned path
        window.history.replaceState(null, '', window.location.pathname);
        window.location.replace(data.path || '/dashboard');
        return;
      } catch (err) {
        console.error('SSO handoff parse error:', err);
      }
    }

    const code = params.get('code');
    // Never leave the one-time handoff in browser history, referrers or application logs.
    window.history.replaceState(null, '', '/sso');

    async function exchange() {
      try {
        const response = await fetch('/api/sso', code ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) } : { cache: 'no-store' });
        const data = await response.json();
        setWorkspace(data.workspaceUrl || '');
        if (!response.ok) throw new Error(data.message || 'The project link has expired. Open it again from your workspace.');
        const user = data.user;
        const admin = data.access === 'ADMIN' || user.role === 'DEVELOPER' || user.role === 'ADMIN';

        localStorage.setItem('midlex_token', data.token);
        localStorage.setItem('midlex_user', JSON.stringify(user));

        if (data.project === 'cbt') localStorage.setItem('midlex_cbt_session', JSON.stringify({ ...user, role: admin ? 'ADMIN' : 'USER', candidateId: user.workspaceId, assignedExamIds: [] }));
        if (data.project === 'mip') localStorage.setItem('midlex_mip_session', JSON.stringify({ ...user, role: admin ? 'INTERNSHIP_ADMIN' : 'STUDENT_INTERN', internId: user.workspaceId, totalHoursLogged: 0 }));
        if (data.project === 'hrms') localStorage.setItem('midlex_hrms_user', JSON.stringify({ ...user, role: admin ? 'HR_ADMIN' : 'STAFF', staffId: user.id, department: 'GENERAL', staffCategory: 'SUPPORT_STAFF', supportRole: 'Staff', firstLoginSetupComplete: true }));
        if (data.project === 'realty') { localStorage.setItem('midlex_realty_admin_token', data.token); localStorage.setItem('midlex_realty_admin_user', JSON.stringify(user)); }
        if (data.project === 'cbt' && admin) localStorage.setItem('midlex_cbt_admin_session', localStorage.getItem('midlex_cbt_session')!);
        if (data.project === 'hrms' && admin) localStorage.setItem('midlex_hrms_admin_access', 'true');

        window.location.replace(data.path);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to open project');
      }
    }
    void exchange();
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 20, padding: 30, fontFamily: 'Arial, sans-serif', background: '#f5f8f3', color: '#173e34', textAlign: 'center' }}>
      <strong style={{ letterSpacing: 4 }}>MIDLEX WORKSPACE</strong>
      <p role={error ? 'alert' : 'status'}>{error || 'Opening your secure project session…'}</p>
      {error && <a href={workspace || '/api/sso'}>Return to workspace</a>}
    </main>
  );
}
