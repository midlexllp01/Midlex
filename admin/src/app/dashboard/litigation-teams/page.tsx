'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { Plus, RefreshCw, Scale, Users, Pencil, Trash2 } from 'lucide-react';

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
  const [editingTeam, setEditingTeam] = useState('');
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');

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

  async function renameTeam(oldName: string) {
    if (!editName.trim()) return;
    setWorking(oldName); setError(''); setNotice('');
    try {
      const result = await apiFetch<string[]>(`/directory/litigation-teams/${encodeURIComponent(oldName)}`, { method: 'PATCH', body: JSON.stringify({ name: editName }) });
      const renamed = editName.trim().replace(/\s+/g, ' ').toUpperCase();
      setTeams(result);
      setLawyers(current => current.map(lawyer => lawyer.litigationTeam === oldName ? { ...lawyer, litigationTeam: renamed } : lawyer));
      setEditingTeam(''); setEditName('');
      setNotice(`${oldName} was renamed to ${renamed}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not rename team'); }
    finally { setWorking(''); }
  }

  async function deleteTeam(team: string) {
    setWorking(team); setError(''); setNotice('');
    try {
      const result = await apiFetch<string[]>(`/directory/litigation-teams/${encodeURIComponent(team)}`, { method: 'DELETE' });
      setTeams(result);
      setLawyers(current => current.map(lawyer => lawyer.litigationTeam === team ? { ...lawyer, litigationTeam: null } : lawyer));
      setConfirmDelete('');
      setNotice(`${team} was deleted. Its members and cases are now unassigned; their records remain available.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete team'); }
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
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#e8f2e7] p-3 text-[#1a5a43]"><Scale size={21}/></span><div><h2 className="font-semibold text-[#173e34]">{team}</h2><p className="text-xs text-[#718277]">{members.length} assigned lawyer{members.length === 1 ? '' : 's'}</p></div></div><div className="flex gap-2"><button type="button" aria-label={`Edit ${team}`} onClick={() => { setEditingTeam(team); setEditName(team); setConfirmDelete(''); }} className="rounded-lg p-2 text-[#245942] hover:bg-[#edf4e9]"><Pencil size={17}/></button><button type="button" aria-label={`Delete ${team}`} onClick={() => { setConfirmDelete(team); setEditingTeam(''); }} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><Trash2 size={17}/></button></div></div>
          {editingTeam === team && <div className="mt-4 flex flex-wrap gap-2"><input aria-label="New team name" value={editName} onChange={event => setEditName(event.target.value)} maxLength={80} className="min-w-0 flex-1 rounded-lg border border-[#d4e1d7] px-3 py-2 text-sm"/><button type="button" disabled={!!working} onClick={() => void renameTeam(team)} className="rounded-lg bg-[#1c5945] px-3 py-2 text-xs font-semibold text-white">Save name</button><button type="button" onClick={() => setEditingTeam('')} className="text-xs underline">Cancel</button></div>}
          {confirmDelete === team && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900"><p>Delete this team? Members and cases will become unassigned. User accounts and cases will remain.</p><div className="mt-3 flex gap-3"><button type="button" disabled={!!working} onClick={() => void deleteTeam(team)} className="rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white">Delete team</button><button type="button" onClick={() => setConfirmDelete('')} className="text-xs underline">Cancel</button></div></div>}
          <div className="mt-5 space-y-2">{members.length ? members.map(member => <div key={member.id} className="rounded-xl bg-[#f4f7f2] px-3 py-3 text-sm"><div className="font-semibold text-[#173e34]">{member.name}</div><div className="truncate text-xs text-[#718277]">{member.email}</div><div className="mt-2 flex flex-wrap items-center gap-2"><label htmlFor={`transfer-${member.id}`} className="text-xs text-[#456b55]">Team</label><select id={`transfer-${member.id}`} value={team} disabled={!!working} onChange={event => void assignLawyer(member.id, event.target.value)} className="min-w-0 flex-1 rounded-lg border border-[#d4e1d7] bg-white px-2 py-1.5 text-xs">{teams.map(option => <option key={option} value={option}>{option}</option>)}<option value="">Remove from team</option></select></div></div>) : <p className="rounded-xl bg-[#f4f7f2] px-3 py-3 text-sm text-[#718277]">No one assigned yet.</p>}</div>
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
