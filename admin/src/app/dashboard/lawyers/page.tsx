'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RefreshCw, Search, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

type Counsel = { id: string; name: string; email: string; litigationTeam: string | null };

export default function LawyersPage() {
  const { user } = useAuth();
  const [counsel, setCounsel] = useState<Counsel[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<Counsel[]>('/directory/litigation-teams/eligible-lawyers');
      setCounsel(Array.isArray(result) ? result : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load approved counsel');
    } finally { setLoading(false); }
  }

  useEffect(() => { if (user?.role === 'ADMIN') void load(); }, [user?.role]);

  if (user?.role !== 'ADMIN') return <div className="p-8 text-sm text-red-700">Admin access required.</div>;
  const visible = counsel.filter(person => `${person.name} ${person.email} ${person.litigationTeam || ''}`.toLowerCase().includes(query.toLowerCase()));

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a927f]">Legal administration</p><h1 className="mt-2 text-3xl font-semibold text-[#173e34]">Approved Counsel</h1><p className="mt-2 text-sm text-[#718277]">People granted access to Counsel Workspace. Accounts and permissions are managed in the workspace.</p></div>
      <Link href="/dashboard/litigation-teams" className="inline-flex items-center gap-2 rounded-xl bg-[#1c5945] px-4 py-3 text-sm font-semibold text-white">Manage Litigation Teams <ArrowRight size={16}/></Link>
    </header>
    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#dbe6db] bg-white p-5"><Users size={19} className="text-[#245942]"/><p className="mt-4 text-3xl font-semibold text-[#173e34]">{counsel.length}</p><p className="text-sm text-[#718277]">Approved counsel</p></div>
      <div className="rounded-2xl border border-[#dbe6db] bg-white p-5"><p className="text-3xl font-semibold text-[#173e34]">{counsel.filter(person => person.litigationTeam).length}</p><p className="mt-4 text-sm text-[#718277]">Assigned to a team</p></div>
      <div className="rounded-2xl border border-[#dbe6db] bg-white p-5"><p className="text-3xl font-semibold text-[#173e34]">{counsel.filter(person => !person.litigationTeam).length}</p><p className="mt-4 text-sm text-[#718277]">Awaiting team assignment</p></div>
    </section>
    <section className="rounded-2xl border border-[#dbe6db] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-[#173e34]">Counsel directory</h2><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-[#dbe6db] px-3 py-2 text-xs font-semibold text-[#245942] disabled:opacity-50"><RefreshCw size={15}/> Refresh</button></div>
      <label className="mt-4 flex items-center gap-2 rounded-xl border border-[#dbe6db] px-3"><Search size={17} className="text-[#718277]"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name, email, or team" className="w-full py-3 text-sm outline-none"/></label>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 divide-y divide-[#e8eee8]">{visible.map(person => <div key={person.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold text-[#173e34]">{person.name}</p><p className="text-sm text-[#718277]">{person.email}</p></div><span className="rounded-full bg-[#edf4e9] px-3 py-1 text-xs font-semibold text-[#315c42]">{person.litigationTeam || 'Unassigned'}</span></div>)}{!loading && !visible.length && <p className="py-8 text-center text-sm text-[#718277]">{query ? 'No counsel match this search.' : 'No staff have Counsel Workspace access yet.'}</p>}{loading && <p className="py-8 text-center text-sm text-[#718277]">Loading counsel…</p>}</div>
    </section>
  </main>;
}
