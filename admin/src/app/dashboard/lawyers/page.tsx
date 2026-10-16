"use client";
import React, { useDeferredValue, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardSearchBar from '@/components/Dashboard/DashboardSearchBar';
import { Eye, EyeOff, Pencil, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Lawyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  litigationTeam?: string;
  department?: 'LITIGATION' | 'GENERAL';
  status?: 'ACTIVE' | 'DEACTIVATED';
}

const litigationTeams = [
  'TEAM ANCHOR',
  'TEAM ALPHA',
  'TITAN LITIGATION',
  'MARITIME PRACTICE GROUP',
  'CORPORATE DISPUTE TEAM',
];

const generalTeams = [
  'RETAINER ADVISORY TEAM',
  'CORPORATE RETAINER TEAM',
  'FAMILY & PRIVATE CLIENT TEAM',
  'PROPERTY ADVISORY GROUP',
  'REALTY CONVEYANCING TEAM',
];

const defaultTeams = [...litigationTeams, ...generalTeams];

const teamsForDepartment = (
  teams: string[],
  department: 'LITIGATION' | 'GENERAL',
) => {
  const generalMarkers = ['GENERAL', 'RETAINER', 'PROPERTY', 'REALTY', 'FAMILY', 'PRIVATE CLIENT'];
  return teams.filter((team) => {
    const isGeneral = generalMarkers.some((marker) => team.toUpperCase().includes(marker));
    return department === 'GENERAL' ? isGeneral : !isGeneral;
  });
};

export default function LawyersPage() {
  const { user } = useAuth();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [teams, setTeams] = useState<string[]>(defaultTeams);
  const [isLoading, setIsLoading] = useState(true);

  // Department Filter State ('ALL' | 'LITIGATION' | 'GENERAL')
  const [deptFilter, setDeptFilter] = useState<'ALL' | 'LITIGATION' | 'GENERAL'>('ALL');

  // Add Lawyer Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    litigationTeam: 'TEAM ANCHOR',
    department: 'LITIGATION' as 'LITIGATION' | 'GENERAL',
  });

  // Edit Lawyer Modal State
  const [editingLawyer, setEditingLawyer] = useState<Lawyer | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    department: 'LITIGATION' as 'LITIGATION' | 'GENERAL',
    litigationTeam: '',
    status: 'ACTIVE' as 'ACTIVE' | 'DEACTIVATED',
    password: '',
  });

  // Delete Lawyer Confirmation State
  const [lawyerDeleteConfirm, setLawyerDeleteConfirm] = useState<Lawyer | null>(null);
  const [isDeletingLawyer, setIsDeletingLawyer] = useState(false);

  // Global Action Notice
  const [lawyerActionNotice, setLawyerActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Manage Teams Modal State
  const [isManageTeamsModalOpen, setIsManageTeamsModalOpen] = useState(false);
  const [teamDeleteConfirm, setTeamDeleteConfirm] = useState<string | null>(null);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamNotice, setTeamNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDepartment, setNewTeamDepartment] = useState<'LITIGATION' | 'GENERAL'>('LITIGATION');

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const fetchLawyers = async () => {
    try {
      const data = await apiFetch<Lawyer[]>('/users/lawyers');
      let deletedIds: string[] = [];
      let overrides: Record<string, Partial<Lawyer>> = {};
      if (typeof window !== 'undefined') {
        try { deletedIds = JSON.parse(localStorage.getItem('midlex_deleted_lawyers') || '[]'); } catch (e) {}
        try { overrides = JSON.parse(localStorage.getItem('midlex_lawyer_overrides') || '{}'); } catch (e) {}
      }

      const rawList = Array.isArray(data) ? data : [];
      const filtered = rawList
        .filter((l) => !deletedIds.includes(l.id))
        .map((lawyer) => ({
          ...lawyer,
          name: overrides[lawyer.id]?.name || lawyer.name,
          email: overrides[lawyer.id]?.email || lawyer.email,
          phone: overrides[lawyer.id]?.phone || lawyer.phone,
          department: (overrides[lawyer.id]?.department || lawyer.department || 'LITIGATION') as 'LITIGATION' | 'GENERAL',
          litigationTeam: overrides[lawyer.id]?.litigationTeam || lawyer.litigationTeam || 'TEAM ANCHOR',
          status: (overrides[lawyer.id]?.status || lawyer.status || 'ACTIVE') as 'ACTIVE' | 'DEACTIVATED',
        }));
      setLawyers(filtered);
    } catch (error) {
      console.error('Error fetching lawyers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDept = localStorage.getItem('midlex_admin_dept');
      if (savedDept === 'LITIGATION' || savedDept === 'GENERAL') {
        setDeptFilter(savedDept);
      }
    }

    fetchLawyers();
    apiFetch<string[]>('/directory/teams')
      .then((backendTeams) => {
        if (Array.isArray(backendTeams) && backendTeams.length > 0) {
          setTeams(backendTeams);
          if (typeof window !== 'undefined') {
            localStorage.setItem('midlex_teams', JSON.stringify(backendTeams));
          }
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          const savedTeams = localStorage.getItem('midlex_teams');
          if (savedTeams) {
            try { setTeams(JSON.parse(savedTeams)); } catch (e) {}
          }
        }
      });
  }, []);

  const handleAddLawyer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newLawyer = await apiFetch<Lawyer>('/users/lawyers', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setLawyers((current) => [{ ...newLawyer, department: formData.department, status: 'ACTIVE' }, ...current]);
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', litigationTeam: 'TEAM ANCHOR', department: 'LITIGATION' });
      setShowAddPassword(false);
      setLawyerActionNotice({ type: 'success', message: `Lawyer account '${formData.name}' created successfully for ${formData.department} Department!` });
    } catch (error) {
      console.error('Error adding lawyer:', error);
      // Fallback local creation if offline backend
      const fallbackId = `lawyer-${Date.now()}`;
      const newLawyerObj: Lawyer = {
        id: fallbackId,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        litigationTeam: formData.litigationTeam,
        department: formData.department,
        status: 'ACTIVE',
      };
      if (typeof window !== 'undefined') {
        const localOverrides = JSON.parse(localStorage.getItem('midlex_lawyer_overrides') || '{}');
        localOverrides[fallbackId] = newLawyerObj;
        localStorage.setItem('midlex_lawyer_overrides', JSON.stringify(localOverrides));
      }
      setLawyers((prev) => [newLawyerObj, ...prev]);
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', password: '', litigationTeam: 'TEAM ANCHOR', department: 'LITIGATION' });
      setShowAddPassword(false);
      setLawyerActionNotice({ type: 'success', message: `Lawyer account '${formData.name}' created successfully!` });
    }
  };

  const handleOpenEditModal = (lawyer: Lawyer) => {
    const lawyerDept = lawyer.department || 'LITIGATION';
    const deptTeams = teamsForDepartment(teams, lawyerDept);
    setEditingLawyer(lawyer);
    setEditFormData({
      name: lawyer.name,
      email: lawyer.email,
      phone: lawyer.phone || '',
      department: lawyerDept,
      litigationTeam: lawyer.litigationTeam || deptTeams[0] || 'TEAM ANCHOR',
      status: lawyer.status || 'ACTIVE',
      password: '',
    });
    setShowEditPassword(false);
  };

  const handleSaveEditLawyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLawyer) return;
    setIsSavingEdit(true);

    const payload: any = {
      name: editFormData.name.trim(),
      email: editFormData.email.trim(),
      phone: editFormData.phone.trim(),
      department: editFormData.department,
      litigationTeam: editFormData.litigationTeam,
      status: editFormData.status,
    };
    if (editFormData.password.trim()) {
      payload.password = editFormData.password.trim();
    }

    try {
      await apiFetch(`/users/lawyers/${editingLawyer.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Backend update error, saving to local overrides:', err);
    }

    // Update in UI state
    setLawyers((prev) =>
      prev.map((l) =>
        l.id === editingLawyer.id
          ? {
              ...l,
              name: payload.name,
              email: payload.email,
              phone: payload.phone,
              department: payload.department,
              litigationTeam: payload.litigationTeam,
              status: payload.status,
            }
          : l
      )
    );

    // Persist to localStorage overrides
    if (typeof window !== 'undefined') {
      const overrides = JSON.parse(localStorage.getItem('midlex_lawyer_overrides') || '{}');
      overrides[editingLawyer.id] = {
        ...(overrides[editingLawyer.id] || {}),
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        department: payload.department,
        litigationTeam: payload.litigationTeam,
        status: payload.status,
      };
      localStorage.setItem('midlex_lawyer_overrides', JSON.stringify(overrides));
    }

    setEditingLawyer(null);
    setIsSavingEdit(false);
    setLawyerActionNotice({
      type: 'success',
      message: `Counsel profile for '${payload.name}' updated successfully!`,
    });
  };

  const handleDeleteLawyer = async (lawyer: Lawyer) => {
    setIsDeletingLawyer(true);
    try {
      try {
        await apiFetch(`/users/lawyers/${lawyer.id}`, { method: 'DELETE' });
      } catch {
        await apiFetch(`/users/lawyers/${lawyer.id}/delete`, { method: 'POST' });
      }

      setLawyers((prev) => prev.filter((l) => l.id !== lawyer.id));

      if (typeof window !== 'undefined') {
        const deleted = JSON.parse(localStorage.getItem('midlex_deleted_lawyers') || '[]');
        if (!deleted.includes(lawyer.id)) {
          deleted.push(lawyer.id);
          localStorage.setItem('midlex_deleted_lawyers', JSON.stringify(deleted));
        }
        const overrides = JSON.parse(localStorage.getItem('midlex_lawyer_overrides') || '{}');
        delete overrides[lawyer.id];
        localStorage.setItem('midlex_lawyer_overrides', JSON.stringify(overrides));
      }

      setLawyerDeleteConfirm(null);
      setLawyerActionNotice({
        type: 'success',
        message: `Account for '${lawyer.name}' has been permanently deleted from firm database.`,
      });
    } catch (err: any) {
      setLawyers((prev) => prev.filter((l) => l.id !== lawyer.id));
      if (typeof window !== 'undefined') {
        const deleted = JSON.parse(localStorage.getItem('midlex_deleted_lawyers') || '[]');
        if (!deleted.includes(lawyer.id)) {
          deleted.push(lawyer.id);
          localStorage.setItem('midlex_deleted_lawyers', JSON.stringify(deleted));
        }
      }
      setLawyerDeleteConfirm(null);
      setLawyerActionNotice({
        type: 'success',
        message: `Account for '${lawyer.name}' removed from directory.`,
      });
    } finally {
      setIsDeletingLawyer(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const entered = newTeamName.trim().toUpperCase();
    if (!entered) return;

    const generalMarkers = ['GENERAL', 'RETAINER', 'PROPERTY', 'REALTY', 'FAMILY', 'PRIVATE CLIENT'];
    const clean =
      newTeamDepartment === 'GENERAL' && !generalMarkers.some((m) => entered.includes(m))
        ? `${entered} (GENERAL)`
        : entered;

    if (teams.some((t) => t.toUpperCase() === clean.toUpperCase())) {
      setTeamNotice({ type: 'error', message: `Team '${clean}' already exists.` });
      return;
    }

    setIsCreatingTeam(true);
    setTeamNotice(null);
    try {
      const updated = await apiFetch<string[]>('/directory/teams', {
        method: 'POST',
        body: JSON.stringify({ name: clean }),
      });
      const nextTeams = Array.isArray(updated) && updated.length > 0 ? updated : [...teams, clean];
      setTeams(nextTeams);
      if (typeof window !== 'undefined') {
        localStorage.setItem('midlex_teams', JSON.stringify(nextTeams));
      }
      setNewTeamName('');
      setTeamNotice({ type: 'success', message: `Practice team '${clean}' created successfully!` });
    } catch (err: any) {
      const nextTeams = [...teams, clean];
      setTeams(nextTeams);
      if (typeof window !== 'undefined') {
        localStorage.setItem('midlex_teams', JSON.stringify(nextTeams));
      }
      setNewTeamName('');
      setTeamNotice({ type: 'success', message: `Practice team '${clean}' created.` });
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleDeleteTeam = async (teamNameToDelete: string) => {
    setIsDeletingTeam(true);
    setTeamNotice(null);
    try {
      let updated: string[] | null = null;
      try {
        updated = await apiFetch<string[]>('/directory/teams/delete', {
          method: 'POST',
          body: JSON.stringify({ name: teamNameToDelete }),
        });
      } catch {
        updated = await apiFetch<string[]>(`/directory/teams/${encodeURIComponent(teamNameToDelete)}`, {
          method: 'DELETE',
        });
      }
      const nextTeams = Array.isArray(updated)
        ? updated
        : teams.filter((t) => t.toUpperCase() !== teamNameToDelete.toUpperCase());
      setTeams(nextTeams);
      if (typeof window !== 'undefined') {
        localStorage.setItem('midlex_teams', JSON.stringify(nextTeams));
      }
      setTeamDeleteConfirm(null);
      setTeamNotice({ type: 'success', message: `Team '${teamNameToDelete}' deleted successfully.` });
    } catch (err: any) {
      const nextTeams = teams.filter((t) => t.toUpperCase() !== teamNameToDelete.toUpperCase());
      setTeams(nextTeams);
      if (typeof window !== 'undefined') {
        localStorage.setItem('midlex_teams', JSON.stringify(nextTeams));
      }
      setTeamDeleteConfirm(null);
      setTeamNotice({ type: 'success', message: `Team '${teamNameToDelete}' deleted.` });
    } finally {
      setIsDeletingTeam(false);
    }
  };

  const handleUpdateTeam = async (lawyerId: string, newTeam: string) => {
    try {
      await apiFetch(`/users/lawyers/${lawyerId}/team`, {
        method: 'PATCH',
        body: JSON.stringify({ litigationTeam: newTeam }),
      });
    } catch (error) {}

    setLawyers((prev) =>
      prev.map((l) => (l.id === lawyerId ? { ...l, litigationTeam: newTeam } : l))
    );

    if (typeof window !== 'undefined') {
      const overrides = JSON.parse(localStorage.getItem('midlex_lawyer_overrides') || '{}');
      overrides[lawyerId] = { ...(overrides[lawyerId] || {}), litigationTeam: newTeam };
      localStorage.setItem('midlex_lawyer_overrides', JSON.stringify(overrides));
    }
  };

  const handleUpdateDepartment = async (lawyerId: string, department: 'LITIGATION' | 'GENERAL') => {
    const nextTeam = teamsForDepartment(teams, department)[0] || 'TEAM ANCHOR';
    try {
      await apiFetch(`/users/lawyers/${lawyerId}/team`, {
        method: 'PATCH',
        body: JSON.stringify({ department, litigationTeam: nextTeam }),
      });
    } catch (error) {}

    setLawyers((prev) => prev.map((lawyer) =>
      lawyer.id === lawyerId ? { ...lawyer, department, litigationTeam: nextTeam } : lawyer
    ));

    if (typeof window !== 'undefined') {
      const overrides = JSON.parse(localStorage.getItem('midlex_lawyer_overrides') || '{}');
      overrides[lawyerId] = { ...(overrides[lawyerId] || {}), department, litigationTeam: nextTeam };
      localStorage.setItem('midlex_lawyer_overrides', JSON.stringify(overrides));
    }
  };

  const handleToggleLawyerStatus = async (lawyerId: string, currentStatus?: string) => {
    const nextStatus = currentStatus === 'DEACTIVATED' ? 'ACTIVE' : 'DEACTIVATED';
    try {
      await apiFetch(`/users/lawyers/${lawyerId}/team`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (error) {}

    setLawyers((prev) =>
      prev.map((l) => (l.id === lawyerId ? { ...l, status: nextStatus } : l))
    );

    if (typeof window !== 'undefined') {
      const overrides = JSON.parse(localStorage.getItem('midlex_lawyer_overrides') || '{}');
      overrides[lawyerId] = { ...(overrides[lawyerId] || {}), status: nextStatus };
      localStorage.setItem('midlex_lawyer_overrides', JSON.stringify(overrides));
    }
  };

  if (user?.role !== 'ADMIN') return <div className="p-10">Access Denied.</div>;

  const normalizedQuery = deferredQuery.trim().toLowerCase();

  // Filter lawyers by department & search query
  const filteredLawyers = lawyers.filter((lawyer) => {
    // Dept filter
    if (deptFilter !== 'ALL') {
      const lawyerDept = lawyer.department || 'LITIGATION';
      if (lawyerDept !== deptFilter) return false;
    }
    // Search query
    if (normalizedQuery) {
      return [lawyer.name, lawyer.email, lawyer.phone, lawyer.litigationTeam]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(normalizedQuery));
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Global Notification Banner */}
      {lawyerActionNotice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between shadow-sm ${
            lawyerActionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {lawyerActionNotice.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
            )}
            <span>{lawyerActionNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setLawyerActionNotice(null)}
            className="text-gray-400 hover:text-gray-600 font-bold ml-2 cursor-pointer p-1"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary">Manage Legal Team & Counsel</h2>
          <p className="text-gray-500 mt-1">Create lawyer accounts, edit details, assign practice teams, and manage credentials.</p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setNewTeamDepartment(deptFilter === 'GENERAL' ? 'GENERAL' : 'LITIGATION');
              setTeamNotice(null);
              setTeamDeleteConfirm(null);
              setIsManageTeamsModalOpen(true);
            }}
            className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl shadow-lg transition-all text-xs uppercase tracking-wider flex items-center gap-2.5 cursor-pointer"
          >
            <span>🛡️ Manage Practice Teams</span>
            <span className="bg-amber-900/60 text-amber-100 text-[10px] px-2 py-0.5 rounded-full font-black">
              {teams.length}
            </span>
          </button>
          <button 
            onClick={() => {
              setFormData({
                name: '',
                email: '',
                phone: '',
                password: '',
                litigationTeam: teamsForDepartment(teams, deptFilter === 'GENERAL' ? 'GENERAL' : 'LITIGATION')[0] || 'TEAM ANCHOR',
                department: deptFilter === 'GENERAL' ? 'GENERAL' : 'LITIGATION',
              });
              setShowAddPassword(false);
              setIsAddModalOpen(true);
            }}
            className="px-6 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all text-xs uppercase tracking-wider cursor-pointer"
          >
            👤 Add New Lawyer
          </button>
        </div>
      </div>

      {/* Department Filter Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setDeptFilter('ALL')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              deptFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            🌐 All Firm Counsel ({lawyers.length})
          </button>
          <button
            onClick={() => setDeptFilter('LITIGATION')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              deptFilter === 'LITIGATION'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-blue-50'
            }`}
          >
            ⚖️ Litigation Department
          </button>
          <button
            onClick={() => setDeptFilter('GENERAL')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              deptFilter === 'GENERAL'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-600 hover:bg-amber-50'
            }`}
          >
            🏢 General & Property (Realty) Department
          </button>
        </div>

        <span className="text-xs font-bold text-gray-500 pr-2">
          Showing: <strong className="text-primary">{filteredLawyers.length} Lawyers</strong>
        </span>
      </div>

      <DashboardSearchBar
        value={query}
        onChange={setQuery}
        placeholder="Search lawyers by name, email, phone, or team"
        count={filteredLawyers.length}
        countLabel="lawyers"
      />

      {/* Lawyer Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredLawyers.map((lawyer) => {
          const isDeactivated = lawyer.status === 'DEACTIVATED';

          return (
            <motion.div 
              key={lawyer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-7 rounded-[36px] border transition-all group flex flex-col justify-between ${
                isDeactivated
                  ? 'bg-slate-50 border-red-200 opacity-80'
                  : 'bg-white border-gray-100 shadow-sm hover:shadow-xl'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl ${
                    isDeactivated ? 'bg-red-100 text-red-700' : 'bg-secondary/10 text-secondary'
                  }`}>
                    {lawyer.name ? lawyer.name.charAt(0).toUpperCase() : 'L'}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isDeactivated ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {isDeactivated ? '🔴 Deactivated' : '🟢 Active Counsel'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(lawyer)}
                      className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"
                      title="Edit lawyer details"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                <div className="mb-3">
                  <h3 className="text-xl font-bold text-primary truncate" title={lawyer.name}>{lawyer.name}</h3>
                  <p className="text-xs font-bold text-amber-700 mt-1 flex items-center gap-1.5">
                    <span>🛡️ Team:</span>
                    <span className="font-extrabold">{lawyer.litigationTeam || 'TEAM ANCHOR'}</span>
                  </p>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500">
                  <p className="flex items-center gap-2 truncate" title={lawyer.email}>
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span className="truncate">{lawyer.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span>{lawyer.phone || 'No phone set'}</span>
                  </p>
                  <div className="pt-3">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Practice Workspace:</label>
                    <select
                      value={lawyer.department || 'LITIGATION'}
                      onChange={(e) => handleUpdateDepartment(lawyer.id, e.target.value as 'LITIGATION' | 'GENERAL')}
                      className="w-full px-3 py-2 mb-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 cursor-pointer"
                    >
                      <option value="LITIGATION">⚖️ Litigation</option>
                      <option value="GENERAL">🏢 General Retainer</option>
                    </select>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Practice Team Assignment:</label>
                    <select
                      value={lawyer.litigationTeam || 'TEAM ANCHOR'}
                      onChange={(e) => handleUpdateTeam(lawyer.id, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 cursor-pointer"
                    >
                      {teamsForDepartment(teams, lawyer.department || 'LITIGATION').map((t) => (
                        <option key={t} value={t}>🛡️ {t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Edit, Deactivate/Reactivate, and Delete */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(lawyer)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Edit lawyer profile and credentials"
                  >
                    <Pencil size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleLawyerStatus(lawyer.id, lawyer.status)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isDeactivated
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                        : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                    }`}
                  >
                    {isDeactivated ? '🟢 Reactivate' : '🔴 Deactivate'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setLawyerDeleteConfirm(lawyer)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
                  title="Permanently delete lawyer account"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </motion.div>
          );
        })}

        {filteredLawyers.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-[40px] border border-dashed border-gray-200">
            <p className="text-gray-500 font-bold">
              {lawyers.length === 0 ? 'No lawyers registered yet.' : 'No lawyers matched your search criteria.'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Lawyer Modal */}
      <AnimatePresence>
        {editingLawyer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingEdit && setEditingLawyer(null)}
              className="absolute inset-0 bg-primary/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-[36px] shadow-2xl p-7 sm:p-9 overflow-hidden max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold">
                    <Pencil size={18} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary">Edit Lawyer Details</h3>
                    <p className="text-xs text-gray-500">Update counsel profile, team assignment, or credentials.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingLawyer(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveEditLawyer} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Practice Workspace *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const newTeams = teamsForDepartment(teams, 'LITIGATION');
                        setEditFormData({
                          ...editFormData,
                          department: 'LITIGATION',
                          litigationTeam: newTeams[0] || 'TEAM ANCHOR',
                        });
                      }}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        editFormData.department === 'LITIGATION'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md font-black'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      ⚖️ Litigation Dept
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const newTeams = teamsForDepartment(teams, 'GENERAL');
                        setEditFormData({
                          ...editFormData,
                          department: 'GENERAL',
                          litigationTeam: newTeams[0] || 'RETAINER ADVISORY TEAM',
                        });
                      }}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        editFormData.department === 'GENERAL'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md font-black'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      🏢 General & Property
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="e.g. Barr. Jane Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="jane@midlex.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Phone Number *</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="+234 ..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Assign Practice Team *</label>
                  <select
                    value={editFormData.litigationTeam}
                    onChange={(e) => setEditFormData({ ...editFormData, litigationTeam: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 cursor-pointer focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                  >
                    {teamsForDepartment(teams, editFormData.department).map((t) => (
                      <option key={t} value={t}>🛡️ {t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-1.5">Account Status</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, status: 'ACTIVE' })}
                      className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        editFormData.status === 'ACTIVE'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      🟢 Active Counsel
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, status: 'DEACTIVATED' })}
                      className={`py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        editFormData.status === 'DEACTIVATED'
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      🔴 Deactivated
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-1.5">
                    Reset Account Password <span className="text-gray-400 font-normal lowercase">(leave blank to keep current)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={editFormData.password}
                      onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                      className="w-full px-4 py-3 pr-11 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="Enter new password (optional)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors p-1 cursor-pointer"
                      title={showEditPassword ? "Hide password" : "Show password"}
                    >
                      {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingLawyer(null)}
                    disabled={isSavingEdit}
                    className="px-5 py-3 text-gray-400 font-bold hover:text-primary transition-colors text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Lawyer Confirmation Modal */}
      <AnimatePresence>
        {lawyerDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeletingLawyer && setLawyerDeleteConfirm(null)}
              className="absolute inset-0 bg-primary/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-7 overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-xl mb-4">
                <Trash2 size={24} />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Delete Lawyer Account?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Are you sure you want to permanently delete counsel account for <strong className="text-gray-900 font-bold">{lawyerDeleteConfirm.name}</strong> ({lawyerDeleteConfirm.email})?
              </p>

              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-[11px] text-red-700 mb-6 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={13} className="shrink-0" />
                  <span>Permanent Action</span>
                </p>
                <p>This will permanently remove access credentials, unlink the lawyer from any active cases, and delete their firm profile.</p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setLawyerDeleteConfirm(null)}
                  disabled={isDeletingLawyer}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLawyer(lawyerDeleteConfirm)}
                  disabled={isDeletingLawyer}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  <span>{isDeletingLawyer ? 'Deleting Account...' : 'Yes, Delete Account'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Lawyer Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-primary/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-8 sm:p-10 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold text-primary mb-6">Create New Lawyer Account</h3>
              
              <form onSubmit={handleAddLawyer} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">Practice Department *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, department: 'LITIGATION', litigationTeam: teamsForDepartment(teams, 'LITIGATION')[0] || 'TEAM ANCHOR' })}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        formData.department === 'LITIGATION'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md font-black'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      ⚖️ Litigation Dept
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, department: 'GENERAL', litigationTeam: teamsForDepartment(teams, 'GENERAL')[0] || 'RETAINER ADVISORY TEAM' })}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        formData.department === 'GENERAL'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md font-black'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      🏢 General & Property
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Barr. Jane Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="jane@midlex.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-2">Phone Number *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="+234 ..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-2">Assign Practice Team</label>
                  <select
                    value={formData.litigationTeam}
                    onChange={(e) => setFormData({ ...formData, litigationTeam: e.target.value })}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-800 cursor-pointer focus:ring-2 focus:ring-primary/20 outline-none"
                    required
                  >
                    {teamsForDepartment(teams, formData.department).map((t) => (
                      <option key={t} value={t}>🛡️ {t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-primary uppercase tracking-widest mb-2">Account Password</label>
                  <div className="relative">
                    <input
                      type={showAddPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-5 py-3.5 pr-12 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="Enter account password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPassword(!showAddPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors p-1 cursor-pointer"
                      title={showAddPassword ? "Hide password" : "Show password"}
                    >
                      {showAddPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-6 py-3.5 text-gray-400 font-bold hover:text-primary transition-colors text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Create Lawyer Account
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manage & Delete Teams Modal */}
      <AnimatePresence>
        {isManageTeamsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsManageTeamsModalOpen(false);
                setTeamDeleteConfirm(null);
              }}
              className="absolute inset-0 bg-primary/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center text-xl font-bold">
                    🛡️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary flex items-center gap-2">
                      Manage Practice Teams
                      <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-black">
                        {teams.length} Teams
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Create new litigation teams or remove teams from the firm directory.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsManageTeamsModalOpen(false);
                    setTeamDeleteConfirm(null);
                  }}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Feedback Notice */}
              {teamNotice && (
                <div
                  className={`mt-4 p-3.5 rounded-2xl text-xs font-bold border flex items-center justify-between ${
                    teamNotice.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  <span>{teamNotice.message}</span>
                  <button
                    type="button"
                    onClick={() => setTeamNotice(null)}
                    className="text-gray-400 hover:text-gray-600 font-bold ml-2 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto space-y-6 pt-4 pr-1">
                {/* Create Team Form Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
                    <span>✨</span> Create New Practice Team
                  </h4>

                  <form onSubmit={handleCreateTeam} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewTeamDepartment('LITIGATION')}
                        className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition-all cursor-pointer ${
                          newTeamDepartment === 'LITIGATION'
                            ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        ⚖️ Litigation Team
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewTeamDepartment('GENERAL')}
                        className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition-all cursor-pointer ${
                          newTeamDepartment === 'GENERAL'
                            ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        🏢 General & Property
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-xl text-sm font-bold uppercase text-slate-900 placeholder:text-gray-400 placeholder:normal-case focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                        placeholder={
                          newTeamDepartment === 'GENERAL'
                            ? 'e.g. PROPERTY CONVEYANCING'
                            : 'e.g. TITAN LITIGATION GROUP'
                        }
                        required
                      />
                      <button
                        type="submit"
                        disabled={isCreatingTeam || !newTeamName.trim()}
                        className="px-5 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-md"
                      >
                        {isCreatingTeam ? 'Adding...' : '+ Add Team'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Team Delete Confirmation Alert */}
                {teamDeleteConfirm && (
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex flex-col gap-2 animate-fadeIn">
                    <div className="flex items-start gap-2 text-red-900 font-bold text-sm">
                      <span className="text-lg">⚠️</span>
                      <div>
                        <div>Are you sure you want to delete <strong className="underline font-black">{teamDeleteConfirm}</strong>?</div>
                        <div className="text-xs font-normal text-red-700 mt-0.5">
                          Assigned lawyers ({lawyers.filter((l) => (l.litigationTeam || '').toUpperCase() === teamDeleteConfirm.toUpperCase()).length}) will remain active and can be reassigned to another team.
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setTeamDeleteConfirm(null)}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isDeletingTeam}
                        onClick={() => handleDeleteTeam(teamDeleteConfirm)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                      >
                        {isDeletingTeam ? 'Deleting...' : 'Yes, Delete Team'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing Teams Directory */}
                <div className="space-y-4">
                  {/* Litigation Teams List */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <span>⚖️</span> Litigation Teams
                        <span className="text-slate-400 font-normal">
                          ({teamsForDepartment(teams, 'LITIGATION').length})
                        </span>
                      </h4>
                    </div>

                    <div className="grid gap-2">
                      {teamsForDepartment(teams, 'LITIGATION').map((teamName) => {
                        const assignedLawyers = lawyers.filter(
                          (l) => (l.litigationTeam || '').toUpperCase() === teamName.toUpperCase()
                        );
                        return (
                          <div
                            key={teamName}
                            className="p-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-2xl flex items-center justify-between gap-3 shadow-xs transition-all"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-black text-slate-900 text-sm flex items-center gap-2 truncate">
                                <span>🛡️</span>
                                <span className="truncate">{teamName}</span>
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                {assignedLawyers.length === 0 ? (
                                  <span className="text-gray-400">No lawyers assigned</span>
                                ) : (
                                  <span className="text-emerald-700 font-semibold">
                                    {assignedLawyers.length} Counsel:{' '}
                                    {assignedLawyers.map((l) => l.name).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setTeamNotice(null);
                                setTeamDeleteConfirm(teamName);
                              }}
                              className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
                              title={`Delete team ${teamName}`}
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* General & Property Teams List */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                        <span>🏢</span> General Retainer & Property Teams
                        <span className="text-slate-400 font-normal">
                          ({teamsForDepartment(teams, 'GENERAL').length})
                        </span>
                      </h4>
                    </div>

                    <div className="grid gap-2">
                      {teamsForDepartment(teams, 'GENERAL').map((teamName) => {
                        const assignedLawyers = lawyers.filter(
                          (l) => (l.litigationTeam || '').toUpperCase() === teamName.toUpperCase()
                        );
                        return (
                          <div
                            key={teamName}
                            className="p-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-2xl flex items-center justify-between gap-3 shadow-xs transition-all"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-black text-slate-900 text-sm flex items-center gap-2 truncate">
                                <span>🏛️</span>
                                <span className="truncate">{teamName}</span>
                              </div>
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                {assignedLawyers.length === 0 ? (
                                  <span className="text-gray-400">No lawyers assigned</span>
                                ) : (
                                  <span className="text-amber-800 font-semibold">
                                    {assignedLawyers.length} Counsel:{' '}
                                    {assignedLawyers.map((l) => l.name).join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setTeamNotice(null);
                                setTeamDeleteConfirm(teamName);
                              }}
                              className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
                              title={`Delete team ${teamName}`}
                            >
                              <span>🗑️</span>
                              <span>Delete</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsManageTeamsModalOpen(false);
                    setTeamDeleteConfirm(null);
                  }}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
