'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { Plus, RefreshCw, Scale, Users } from 'lucide-react';

type ApprovedLawyer = { id: string; name: string; email: string; litigationTeam: string | null };

export default function LitigationTeamsPage() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<string[]>([]);
  const [lawyers, setLawyers] = useState<ApprovedLawyer[]>([]);
  const [newTeam, setNewTeam] = useState('');
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [teamList, lawyerList] = await Promise.all([
        apiFetch<string[]>('/directory/litigation-teams'),
        apiFetch<ApprovedLawyer[]>('/directory/litigation-teams/eligible-lawyers'),
      ]);
      setTeams(Array.isArray(teamList) ? teamList : []);
      setLawyers(Array.isArray(lawyerList) ? lawyerList : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load litigation teams');
    } finally { setLoading(false); }
  }

  useEffect(() => { if (user?.role === 'ADMIN') void load(); }, [user?.role]);

  async function createTeam(event: React.FormEvent) {
    event.preventDefault();
    if (!newTeam.trim()) return;
    setWorking('create'); setError(''); setNotice('');
    try {
      const result = await apiFetch<string[]>('/directory/litigation-teams', { method: 'POST', body: JSON.stringify({ name: newTeam }) });
      setTeams(result);
      setNewTeam('');
      setNotice('Litigation team created and saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create team'); }
    finally { setWorking(''); }
  }

  async function assignLawyer(lawyerId: string, team: string) {
    setWorking(lawyerId); setError(''); setNotice('');
    try {
      const updated = await apiFetch<ApprovedLawyer>(`/directory/litigation-teams/eligible-lawyers/${encodeURIComponent(lawyerId)}`, {
        method: 'PATCH', body: JSON.stringify({ team }),
      });
      setLawyers(current => current.map(lawyer => lawyer.id === lawyerId ? updated : lawyer));
      setNotice(team ? `${updated.name} was assigned to ${team}.` : `${updated.name} was removed from the team.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save assignment'); }
    finally { setWorking(''); }
  }

  if (user?.role !== 'ADMIN') return <div className="p-8 text-sm text-red-700">Admin access required.</div>;

  return <main className="mx-auto max-w-6xl space-y-6 px-4 py-7 sm:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7a927f]">Legal administration</p><h1 className="mt-2 text-3xl font-semibold text-[#173e34]">Litigation Teams</h1><p className="mt-2 text-sm text-[#718277]">Create a practice team and assign people approved for Counsel Workspace. Their assigned team controls which team cases they can see.</p></div>
      <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-[#d8e4d7] bg-white px-4 py-2 text-sm font-semibold text-[#245942] disabled:opacity-50"><RefreshCw size={16}/> Refresh</button>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">{notice}</p>}
    <form onSubmit={createTeam} className="rounded-2xl border border-[#dbe6db] bg-white p-5 shadow-sm">
      <label htmlFor="team-name" className="text-sm font-semibold text-[#173e34]">Create a litigation team</label>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row"><input id="team-name" value={newTeam} onChange={event => setNewTeam(event.target.value)} maxLength={80} placeholder="For example, Commercial Disputes" className="min-w-0 flex-1 rounded-xl border border-[#d4e1d7] px-4 py-3 text-sm outline-none focus:border-[#1a5a43]"/><button type="submit" disabled={!!working || !newTeam.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1c5945] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Plus size={17}/> Create team</button></div>
    </form>
    <section className="grid gap-4 md:grid-cols-2">
      {teams.map(team => {
        const members = lawyers.filter(lawyer => lawyer.litigationTeam === team);
        const available = lawyers.filter(lawyer => lawyer.litigationTeam !== team);
        return <article key={team} className="rounded-2xl border border-[#dbe6db] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#e8f2e7] p-3 text-[#1a5a43]"><Scale size={21}/></span><div><h2 className="font-semibold text-[#173e34]">{team}</h2><p className="text-xs text-[#718277]">{members.length} assigned lawyer{members.length === 1 ? '' : 's'}</p></div></div><Users size={18} className="text-[#789681]"/></div>
          <div className="mt-5 space-y-2">{members.length ? members.map(member => <div key={member.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#f4f7f2] px-3 py-2 text-sm"><span className="min-w-0 truncate text-[#173e34]">{member.name}<span className="ml-2 text-xs text-[#718277]">{member.email}</span></span><button type="button" disabled={!!working} onClick={() => void assignLawyer(member.id, '')} className="shrink-0 text-xs font-semibold text-[#617c69] underline disabled:opacity-50">Remove</button></div>) : <p className="rounded-xl bg-[#f4f7f2] px-3 py-3 text-sm text-[#718277]">No one assigned yet.</p>}</div>
          <label htmlFor={`add-${team}`} className="mt-5 block text-xs font-semibold text-[#456b55]">Add an approved lawyer</label>
          <select id={`add-${team}`} value={selection[team] || ''} onChange={event => setSelection(current => ({ ...current, [team]: event.target.value }))} disabled={!!working || !available.length} className="mt-2 w-full rounded-xl border border-[#d4e1d7] bg-white px-3 py-2.5 text-sm"><option value="">Choose a person</option>{available.map(lawyer => <option key={lawyer.id} value={lawyer.id}>{lawyer.name} — {lawyer.litigationTeam || 'Unassigned'}</option>)}</select>
          <button type="button" disabled={!!working || !selection[team]} onClick={() => { const id = selection[team]; setSelection(current => ({ ...current, [team]: '' })); void assignLawyer(id, team); }} className="mt-3 rounded-xl border border-[#1c5945] px-4 py-2 text-xs font-semibold text-[#1c5945] disabled:opacity-50">Assign to this team</button>
        </article>;
      })}
    </section>
    {!loading && !teams.length && <p className="rounded-xl bg-white p-6 text-sm text-[#718277]">No litigation teams yet. Create the first team above.</p>}
    <section className="rounded-2xl border border-[#dbe6db] bg-white p-5"><h2 className="font-semibold text-[#173e34]">Approved Counsel Workspace users</h2><p className="mt-1 text-sm text-[#718277]">Only active workspace users with a Counsel Workspace grant appear here. Give access in the Developer Workspace first.</p><div className="mt-4 divide-y divide-[#e8eee8]">{lawyers.map(lawyer => <div key={lawyer.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><p className="font-semibold text-[#173e34]">{lawyer.name}</p><p className="text-xs text-[#718277]">{lawyer.email}</p></div><span className="rounded-full bg-[#edf4e9] px-3 py-1 text-xs text-[#315c42]">{lawyer.litigationTeam || 'Unassigned'}</span></div>)}{!loading && !lawyers.length && <p className="py-5 text-sm text-[#718277]">No approved lawyers yet.</p>}</div></section>
  </main>;
}
