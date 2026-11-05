'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Check, LockKeyhole, UserRound } from 'lucide-react';

type Account = { id: string; name: string; email: string; phone?: string; jobTitle?: string; role: string };

export default function ManageAccount({ user, onSaved, onPassword }: { user: Account; onSaved: (user: Account) => void; onPassword: () => void }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [jobTitle, setJobTitle] = useState(user.jobTitle || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => { setName(user.name); setPhone(user.phone || ''); setJobTitle(user.jobTitle || ''); }, [user.id, user.name, user.phone, user.jobTitle]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      const response = await fetch('/api/account', { method: 'PATCH', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone, jobTitle }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to save account details');
      onSaved(result.user);
      setNotice('Your account details have been saved.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save account details');
    } finally { setBusy(false); }
  }

  return <div className="account-layout">
    <section className="panel account-panel">
      <div className="account-panel-heading"><span className="account-panel-icon"><UserRound size={21}/></span><div><h2>Personal details</h2><p>Keep the name and contact details shown in your workspace up to date.</p></div></div>
      <form onSubmit={save} className="account-form">
        {error && <p className="notice error" role="alert">{error}</p>}
        {notice && <p className="notice success" role="status"><Check size={16}/>{notice}</p>}
        <label>Full name<input name="name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={120} autoComplete="name"/></label>
        <label>Work email<input value={user.email} readOnly aria-readonly="true"/><small>Your workspace administrator manages your sign-in email.</small></label>
        <div className="account-form-row">
          <label>Phone number <span>(optional)</span><input name="phone" type="tel" value={phone} onChange={event => setPhone(event.target.value)} maxLength={30} autoComplete="tel" placeholder="Your contact number"/></label>
          <label>Job title <span>(optional)</span><input name="jobTitle" value={jobTitle} onChange={event => setJobTitle(event.target.value)} maxLength={100} autoComplete="organization-title" placeholder="Your role at Midlex"/></label>
        </div>
        <div className="account-form-actions"><button className="primary compact" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save details'}<Check size={16}/></button></div>
      </form>
    </section>
    <section className="panel account-panel account-security"><div className="account-panel-heading"><span className="account-panel-icon"><LockKeyhole size={20}/></span><div><h2>Sign-in & access</h2><p>Manage the password for this workspace account.</p></div></div><div className="account-security-body"><div><span>Workspace role</span><strong>{user.role.charAt(0) + user.role.slice(1).toLowerCase()}</strong></div><button className="secondary" type="button" onClick={onPassword}><LockKeyhole size={16}/> Change password</button><p>Your project access is assigned by your workspace administrator.</p></div></section>
  </div>;
}
