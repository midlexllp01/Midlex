'use client';
import Brand from '../../components/Brand';
import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck, Layers3, Code2, Users, LockKeyhole } from 'lucide-react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" focusable="false">
      <path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.4-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.44h3.14c1.84-1.7 2.91-4.2 2.91-7.21Z"/>
      <path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.36l-3.14-2.44c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.52A9.75 9.75 0 0 0 12 21.75Z"/>
      <path fill="#FBBC05" d="M6.54 13.84a5.86 5.86 0 0 1 0-3.68V7.64H3.3a9.75 9.75 0 0 0 0 8.72l3.24-2.52Z"/>
      <path fill="#EA4335" d="M12 6.13c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.21 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.7 5.39l3.24 2.52C7.31 7.85 9.46 6.13 12 6.13Z"/>
    </svg>
  );
}

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
  }, []);

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
      router.replace(`/${userRole}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  async function googleSubmit() {
    setBusy(true); setError('');
    try {
      const config = { apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'midlex-llp.firebaseapp.com', projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'midlex-llp', appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID };
      if (!config.apiKey || !config.appId) throw new Error('Google sign-in is not configured for this workspace');
      const app = getApps().length ? getApp() : initializeApp(config);
      const result = await signInWithPopup(getAuth(app), new GoogleAuthProvider());
      const idToken = await result.user.getIdToken();
      const response = await fetch('/api/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Google sign-in failed');
      router.replace(`/${data.user.role.toLowerCase()}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Google sign-in failed'); }
    finally { setBusy(false); }
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
          <div className="login-divider"><span>or continue with Google</span></div>
          <button type="button" className="secondary" onClick={() => void googleSubmit()} disabled={busy} aria-label="Continue with Google">
            <GoogleMark />
            <span>Continue with Google</span>
          </button>
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

