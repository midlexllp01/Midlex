'use client';
import Brand from '../../components/Brand';
import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Layers3, Code2, Users, LockKeyhole } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<'admin' | 'staff' | 'developer'>('admin');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.hostname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const qRole = (params.get('role') || params.get('workspace') || '').toLowerCase();

    if (qRole === 'admin' || host.includes('admin')) {
      setRole('admin');
    } else if (qRole === 'staff' || host.includes('staff')) {
      setRole('staff');
    } else if (qRole === 'developer' || host.includes('developer') || host.includes('dev')) {
      setRole('developer');
    } else {
      setRole('admin');
    }
    if (params.get('project') && params.get('return_to')) {
      void fetch('/api/me', { cache: 'no-store' }).then(async response => {
        if (response.ok) await continueToProject();
      }).catch(() => undefined);
    }
  }, []);

  // A project may send an unauthenticated visitor here. After the central
  // login succeeds, return them to that project through the normal one-use
  // server handoff. No password or workspace token is shared with the project.
  async function continueToProject() {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    const project = params.get('project');
    const returnTo = params.get('return_to');
    if (!project || !returnTo) return false;
    try {
      const target = new URL(returnTo);
      if (!['https:', 'http:'].includes(target.protocol) || !['cbt.midlex.xyz', 'admin.cbt.midlex.xyz'].includes(target.hostname)) return false;
      const result = await fetch(`/api/launch/${encodeURIComponent(project)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnUrl: window.location.origin }) });
      const data = await result.json();
      if (!result.ok || typeof data.url !== 'string') throw new Error(data.message || 'Unable to open the project');
      window.location.replace(data.url);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to open the project'); return true; }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      const userRole = data.user.role.toLowerCase();
      if (!(await continueToProject())) router.replace(`/${userRole}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  const roleMeta = {
    admin: {
      label: 'Admin Workspace',
      icon: ShieldCheck,
      caption: 'ADMIN WORKSPACE',
      tagline: 'Administrative control and secure gateway to manage the tools that move Midlex forward.',
      formSubtitle: 'One account. Access assigned administrative tools and controls.',
      btnText: 'Continue to Admin Workspace',
    },
    staff: {
      label: 'Staff Workspace',
      icon: Users,
      caption: 'STAFF WORKSPACE',
      tagline: 'Your projects, your tools, and a clear place to get things done.',
      formSubtitle: 'One account. The projects and tools you need to do great work.',
      btnText: 'Continue to Staff Workspace',
    },
    developer: {
      label: 'Developer Workspace',
      icon: Code2,
      caption: 'DEVELOPER WORKSPACE',
      tagline: 'Complete ecosystem orchestration, access management, and infrastructure control.',
      formSubtitle: 'One account. Master developer controls and project integrations.',
      btnText: 'Continue to Developer Workspace',
    },
  }[role];

  const RoleIcon = roleMeta.icon;

  return (
    <main className="login">
      <section className="login-story">
        <Brand role={role} caption={roleMeta.caption} />
        <div className="story-content">
          <span className="eyebrow">CONNECTED BY DESIGN</span>
          <h1>
            Your work.<br />
            Your people.<br />
            <em>One place.</em>
          </h1>
          <p>{roleMeta.tagline}</p>
          <div className="role-pills">
            <span className="active-workspace">
              <RoleIcon size={16} /> {roleMeta.label}
            </span>
          </div>
        </div>
        <footer>
          <Layers3 size={18} /> The Midlex ecosystem, connected.
        </footer>
      </section>
      <section className="login-form">
        <div className="form-wrap">
          <div className="icon-box">
            <LockKeyhole size={24} />
          </div>
          <span className="eyebrow">{roleMeta.caption}</span>
          <h2>Sign in to {roleMeta.label}</h2>
          <p>{roleMeta.formSubtitle}</p>
          <form onSubmit={submit}>
            <label>
              Work email
              <input type="email" name="email" autoComplete="username" required placeholder="you@midlex.com" />
            </label>
            <label>
              Password
              <input type="password" name="password" autoComplete="current-password" required placeholder="Enter your password" />
            </label>
            {error && <div className="notice error" role="alert">{error}</div>}
            <button className="primary" disabled={busy}>
              {busy ? 'Signing in…' : roleMeta.btnText}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="login-note">
            <ShieldCheck size={19} />
            <span>
              Accounts are created by the workspace developer. Contact your developer if you need access or a password reset.
            </span>
          </div>
        </div>
        <footer>© {new Date().getFullYear()} Midlex LLP · Internal workspace</footer>
      </section>
    </main>
  );
}

