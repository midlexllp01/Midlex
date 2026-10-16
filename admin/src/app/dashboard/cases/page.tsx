"use client";
import React, { useDeferredValue, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import DashboardSearchBar from '@/components/Dashboard/DashboardSearchBar';
import {
  downloadDirectoryAsPdf,
  downloadDirectoryAsDocx,
  DirectoryExportItem,
} from '@/lib/exportDirectory';

interface Case {
  id: string;
  title: string;
  description: string;
  status: string;
  client: {
    name: string;
    email?: string;
    phone?: string;
    secondaryPhone?: string;
  };
  lawyer?: { name: string };
  suitNumber?: string;
  court?: string;
  litigationTeam?: string;
  stage?: string;
  pendingTask?: string;
  category?: 'LITIGATION' | 'GENERAL';
  timeline?: { status?: string; title?: string }[];
  createdAt: string;
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

const teamsForWorkspace = (teams: string[], workspace: 'LITIGATION' | 'GENERAL') => {
  const generalMarkers = ['GENERAL', 'RETAINER', 'PROPERTY', 'REALTY', 'FAMILY', 'PRIVATE CLIENT'];
  return teams.filter((team) => {
    const isGeneral = generalMarkers.some((marker) => team.toUpperCase().includes(marker));
    return workspace === 'GENERAL' ? isGeneral : !isGeneral;
  });
};

const defaultCourts = [
  'HIGH COURT BENIN CITY',
  'HIGH COURT OKADA',
  'HIGH COURT EKIADOLOR',
  'EKIADOLOR MAGISTRATE COURT',
  'FEDERAL HIGH COURT',
  'HIGH COURT',
  'MAGISTRATE COURT OGBESON',
  'MAGISTRATE COURT OREDO',
  'MAGISTRATE COURT EGOR',
  'HIGH COURT WARRI',
  'HIGH COURT ABUDU',
  'FEDERAL HIGH COURT BENIN',
  'HIGH COURT BENIN',
  'APPEAL COURT BENIN CITY',
  'NATIONAL INDUSTRIAL COURT BENIN CITY',
  'AREA CUSTOMARY COURT EHOR',
  'CUSTOMARY COURT URHONIGBE',
  'HIGH COURT EHOR',
];

import MonthPickerFilter, { getCurrentMonthStr, formatMonthDisplay, isItemInMonth } from '@/components/Dashboard/MonthPickerFilter';

export default function CasesPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());
  const [teamDirectoryMonth, setTeamDirectoryMonth] = useState<string>(getCurrentMonthStr());
  const [teamDirectoryQuery, setTeamDirectoryQuery] = useState<string>('');

  const [teams, setTeams] = useState<string[]>(defaultTeams);
  const [courts, setCourts] = useState<string[]>(defaultCourts);

  const [selectedCourtFilter, setSelectedCourtFilter] = useState('ALL');
  const [selectedTeamFilter, setSelectedTeamFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'LITIGATION' | 'GENERAL'>('ALL');

  const [isTeamsModalOpen, setIsTeamsModalOpen] = useState(false);
  const [isCourtsModalOpen, setIsCourtsModalOpen] = useState(false);
  const [activeTeamDirectoryModal, setActiveTeamDirectoryModal] = useState<string | null>(null);
  const [newTeamInput, setNewTeamInput] = useState('');
  const [newCourtInput, setNewCourtInput] = useState('');

  const [overrides, setOverrides] = useState<Record<string, { suitNumber?: string; court?: string; litigationTeam?: string; stage?: string; pendingTask?: string }>>({});

  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSuitNo, setEditSuitNo] = useState('');
  const [editCourt, setEditCourt] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [editStage, setEditStage] = useState('');
  const [editPendingTask, setEditPendingTask] = useState('');

  const isStaff = user?.role === 'ADMIN' || user?.role === 'LAWYER';

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const endpoint = user?.role === 'ADMIN' ? '/cases' : '/cases/my-cases';
        const data = await apiFetch(endpoint);
        setCases(data);
        // Fetch directory courts & teams from backend
        try {
          const backendCourts = await apiFetch<string[]>('/directory/courts');
          if (Array.isArray(backendCourts) && backendCourts.length > 0) {
            setCourts(backendCourts);
          }
          const backendTeams = await apiFetch<string[]>('/directory/teams');
          if (Array.isArray(backendTeams)) {
            setTeams(backendTeams);
            if (typeof window !== 'undefined') {
              localStorage.setItem('midlex_teams', JSON.stringify(backendTeams));
            }
          }
        } catch (e) {
          console.warn('Could not fetch directory from backend, using defaults:', e);
        }
      } catch (error) {
        console.error('Error fetching cases:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCases();

    // Load saved case overrides and saved teams from localStorage if present
    if (typeof window !== 'undefined') {
      const savedDepartment = localStorage.getItem('midlex_admin_dept');
      if (user?.role === 'ADMIN' && (savedDepartment === 'LITIGATION' || savedDepartment === 'GENERAL')) {
        setCategoryFilter(savedDepartment);
      }
      const savedTeams = localStorage.getItem('midlex_teams');
      if (savedTeams) {
        try {
          const parsed = JSON.parse(savedTeams);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTeams(parsed);
          }
        } catch (e) {}
      }
      const savedOverrides = localStorage.getItem('midlex_case_overrides');
      if (savedOverrides) {
        try { setOverrides(JSON.parse(savedOverrides)); } catch (e) {}
      }
    }
  }, [user]);

  const handleAddTeam = async () => {
    const enteredName = newTeamInput.trim().toUpperCase();
    if (!enteredName) return;
    const generalMarkers = ['GENERAL', 'RETAINER', 'PROPERTY', 'REALTY', 'FAMILY', 'PRIVATE CLIENT'];
    const clean =
      categoryFilter === 'GENERAL' && !generalMarkers.some((m) => enteredName.includes(m))
        ? `${enteredName} (GENERAL)`
        : enteredName;

    if (teams.some((t) => t.toUpperCase() === clean.toUpperCase())) {
      setNewTeamInput('');
      return;
    }

    const nextTeams = [...teams, clean];
    setTeams(nextTeams);
    if (typeof window !== 'undefined') {
      localStorage.setItem('midlex_teams', JSON.stringify(nextTeams));
    }
    setNewTeamInput('');

    try {
      const updated = await apiFetch<string[]>('/directory/teams', {
        method: 'POST',
        body: JSON.stringify({ name: clean }),
      });
      if (Array.isArray(updated) && updated.length > 0) {
        setTeams(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('midlex_teams', JSON.stringify(updated));
        }
      }
    } catch (e) {}
  };

  const handleRemoveTeam = async (teamName: string) => {
    const nextTeams = teams.filter((t) => t.toUpperCase() !== teamName.toUpperCase());
    setTeams(nextTeams);
    if (typeof window !== 'undefined') {
      localStorage.setItem('midlex_teams', JSON.stringify(nextTeams));
    }

    try {
      let updated: string[] | null = null;
      try {
        updated = await apiFetch<string[]>('/directory/teams/delete', {
          method: 'POST',
          body: JSON.stringify({ name: teamName }),
        });
      } catch {
        updated = await apiFetch<string[]>(`/directory/teams/${encodeURIComponent(teamName)}`, {
          method: 'DELETE',
        });
      }
      if (Array.isArray(updated)) {
        setTeams(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('midlex_teams', JSON.stringify(updated));
        }
      }
    } catch (e) {
      console.warn('Could not remove team from backend:', e);
    }
  };

  const handleAddCourt = async () => {
    const clean = newCourtInput.trim().toUpperCase();
    if (!clean) return;
    try {
      const updated = await apiFetch<string[]>('/directory/courts', {
        method: 'POST',
        body: JSON.stringify({ name: clean }),
      });
      if (Array.isArray(updated) && updated.length > 0) {
        setCourts(updated);
        localStorage.setItem('midlex_courts', JSON.stringify(updated));
      } else if (!courts.includes(clean)) {
        const next = [...courts, clean];
        setCourts(next);
        localStorage.setItem('midlex_courts', JSON.stringify(next));
      }
    } catch (e) {
      if (!courts.includes(clean)) {
        const next = [...courts, clean];
        setCourts(next);
        localStorage.setItem('midlex_courts', JSON.stringify(next));
      }
    }
    setNewCourtInput('');
  };

  const handleRemoveCourt = async (courtName: string) => {
    try {
      const updated = await apiFetch<string[]>(`/directory/courts/${encodeURIComponent(courtName)}`, {
        method: 'DELETE',
      });
      if (Array.isArray(updated)) {
        setCourts(updated);
        localStorage.setItem('midlex_courts', JSON.stringify(updated));
      } else {
        const next = courts.filter(c => c !== courtName);
        setCourts(next);
        localStorage.setItem('midlex_courts', JSON.stringify(next));
      }
    } catch (e) {
      const next = courts.filter(c => c !== courtName);
      setCourts(next);
      localStorage.setItem('midlex_courts', JSON.stringify(next));
    }
  };

  const handleSaveCaseAssignment = async () => {
    if (!editingCase) return;
    const payload = {
      title: editTitle.trim() || editingCase.title,
      suitNumber: editSuitNo.trim(),
      court: editCourt,
      litigationTeam: editTeam,
      stage: editStage.trim() || 'PLEADINGS / PRE-TRIAL',
      pendingTask: editPendingTask.trim() || 'Filing of Written Address & Witness Statements',
    };

    try {
      const updatedCase = await apiFetch(`/cases/${editingCase.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (editTeam) {
        await apiFetch(`/cases/${editingCase.id}/assign`, {
          method: 'PATCH',
          body: JSON.stringify({ litigationTeam: editTeam }),
        });
      }
      setCases(prev => prev.map(c => c.id === editingCase.id ? { ...c, ...updatedCase } : c));
    } catch (err) {
      console.error('Failed to update case in backend:', err);
    }

    const updatedOverrides = {
      ...overrides,
      [editingCase.id]: payload,
    };
    setOverrides(updatedOverrides);
    if (typeof window !== 'undefined') {
      localStorage.setItem('midlex_case_overrides', JSON.stringify(updatedOverrides));
    }
    setEditingCase(null);
  };

  if (isLoading) return <div className="animate-pulse space-y-4">
    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-3xl" />)}
  </div>;

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredCases = cases.filter((c) => {
    const ov = overrides[c.id] || {};
    const suit = ov.suitNumber || c.suitNumber || '';
    const courtName = ov.court || c.court || '';
    const teamName = ov.litigationTeam || c.litigationTeam || '';

    if (!isItemInMonth(c.createdAt, selectedMonth)) {
      return false;
    }

    const caseCat = ((c as any).category || 'LITIGATION').toUpperCase();
    if (categoryFilter !== 'ALL' && caseCat !== categoryFilter) {
      return false;
    }

    if (selectedCourtFilter !== 'ALL' && courtName !== selectedCourtFilter) {
      return false;
    }

    if (selectedTeamFilter !== 'ALL' && teamName !== selectedTeamFilter) {
      return false;
    }

    if (normalizedQuery) {
      const searchTargets = [
        c.title,
        c.description,
        c.status,
        c.client?.name,
        c.client?.phone,
        c.client?.email,
        c.lawyer?.name,
        suit,
        courtName,
        teamName,
      ].filter(Boolean);
      return searchTargets.some((val) => String(val).toLowerCase().includes(normalizedQuery));
    }

    return true;
  });

  const getPreparedExportItems = (): DirectoryExportItem[] => {
    return filteredCases.map((c, index) => {
      const ov = overrides[c.id] || {};
      const suitNo = ov.suitNumber || c.suitNumber || 'Unassigned / Pending';
      const courtName = ov.court || c.court || 'Unassigned / Pending';
      const teamName = ov.litigationTeam || c.litigationTeam || 'Unassigned / Pending';
      const phones = [c.client?.phone, c.client?.secondaryPhone].filter(Boolean).join(', ');

      return {
        sn: index + 1,
        title: c.title,
        suitNumber: suitNo,
        court: courtName,
        team: teamName,
        clientName: c.client?.name || 'N/A',
        clientPhone: phones || 'N/A',
        clientEmail: c.client?.email || 'N/A',
        stage: ov.stage || 'PLEADINGS / PRE-TRIAL',
        pendingTask: ov.pendingTask || 'Filing of Written Address & Witness Statements',
        status: c.status,
      };
    });
  };

  const handleDownloadPdf = () => {
    const items = getPreparedExportItems();
    downloadDirectoryAsPdf(items, {
      query: deferredQuery,
      courtFilter: selectedCourtFilter,
      teamFilter: selectedTeamFilter,
      totalRecords: items.length,
    });
  };

  const handleDownloadDocx = () => {
    const items = getPreparedExportItems();
    downloadDirectoryAsDocx(items, {
      query: deferredQuery,
      courtFilter: selectedCourtFilter,
      teamFilter: selectedTeamFilter,
      totalRecords: items.length,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {isStaff && (
            <span className="px-3 py-1 bg-secondary/10 border border-secondary text-secondary rounded-full text-xs font-bold uppercase tracking-widest">
              OFFICIAL LITIGATION DIRECTORY
            </span>
          )}
          <h2 className="text-3xl font-bold text-primary mt-2">
            {isStaff ? 'MIDLEX CASE DIRECTORY' : 'My Cases'}
          </h2>
        </div>

        {isStaff ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsTeamsModalOpen(true)}
              className="px-4 py-3 bg-secondary text-white font-bold rounded-2xl shadow-lg hover:bg-secondary/90 transition-all text-xs flex items-center gap-2 cursor-pointer"
            >
              <span>{categoryFilter === 'GENERAL' ? 'General Retainer' : 'Litigation'} Teams ({teamsForWorkspace(teams, categoryFilter === 'GENERAL' ? 'GENERAL' : 'LITIGATION').length})</span>
            </button>
            <button
              onClick={() => setIsCourtsModalOpen(true)}
              className="px-4 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg hover:bg-primary/90 transition-all text-xs flex items-center gap-2"
            >
              <span>Courts Directory ({courts.length})</span>
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-3 bg-red-600 text-white font-bold rounded-2xl shadow-lg hover:bg-red-700 transition-all text-xs flex items-center gap-1.5"
              title="Download Filtered Directory as PDF"
            >
              <span>📄 Export PDF</span>
            </button>
            <button
              onClick={handleDownloadDocx}
              className="px-4 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg hover:bg-blue-700 transition-all text-xs flex items-center gap-1.5"
              title="Download Filtered Directory as Word DOCX"
            >
              <span>📝 Export DOCX</span>
            </button>
          </div>
        ) : (
          user?.role === 'CLIENT' && (
            <Link 
              href="/dashboard/cases/new"
              className="px-8 py-4 bg-secondary text-white font-bold rounded-2xl shadow-xl shadow-secondary/20 hover:bg-secondary/90 transition-all text-center"
            >
              Create New Case
            </Link>
          )
        )}
      </div>

      <MonthPickerFilter
        selectedMonth={selectedMonth}
        onChange={setSelectedMonth}
        totalCount={filteredCases.length}
        countLabel="cases in directory"
      />

      {/* Very Bold Team & Department Case Directory Section */}
      {isStaff && (
        <div className="bg-slate-900 border-2 border-amber-400/40 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-secondary text-white flex items-center justify-center font-black text-base shadow-md">
                📂
              </div>
              <div>
                <h3 className="text-sm font-black tracking-wider text-white uppercase">
                  {categoryFilter === 'GENERAL'
                    ? 'SUPER ADMIN GENERAL & PROPERTY REALTY DIRECTORIES'
                    : user?.role === 'ADMIN'
                    ? 'SUPER ADMIN LITIGATION & PRACTICE DIRECTORIES'
                    : `${(user as any)?.litigationTeam || 'TEAM ANCHOR'} CASE DIRECTORY`}
                </h3>
                <p className="text-xs text-amber-200/80 font-medium">
                  {categoryFilter === 'GENERAL'
                    ? 'General Retainer Access: Midlex Royalty claims, property work, corporate advisory, and assigned team registers.'
                    : user?.role === 'ADMIN'
                    ? 'Super Admin Access: Open any practice team or court case directory register below.'
                    : 'Counsel Access: Open your assigned litigation team case directory.'}
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-amber-400/10 border border-amber-400/40 text-amber-300 px-3 py-1 rounded-full font-black uppercase tracking-widest self-start sm:self-auto">
              {categoryFilter === 'GENERAL' ? '🏢 General & Property Practice' : user?.role === 'ADMIN' ? 'Super Admin Exclusive' : 'Litigation Team Counsel'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {user?.role === 'ADMIN' ? (
              teams.map((teamName) => (
                <button
                  key={teamName}
                  onClick={() => setActiveTeamDirectoryModal(teamName)}
                  className="px-6 py-3.5 bg-secondary text-white font-black rounded-2xl shadow-xl hover:bg-secondary/90 hover:scale-[1.02] transition-all text-xs tracking-wider uppercase border border-amber-300/40 flex items-center gap-2.5 group cursor-pointer"
                >
                  <span>📂 OPEN {teamName} CASE DIRECTORY</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              ))
            ) : (
              (() => {
                const lawyerTeam = (user as any)?.litigationTeam || 'TEAM ANCHOR';
                return (
                  <button
                    onClick={() => setActiveTeamDirectoryModal(lawyerTeam)}
                    className="px-7 py-4 bg-secondary text-white font-black rounded-2xl shadow-2xl hover:bg-secondary/90 hover:scale-[1.02] transition-all text-sm tracking-wider uppercase border-2 border-amber-300/50 flex items-center gap-3 group cursor-pointer"
                  >
                    <span>📂 OPEN {lawyerTeam} CASE DIRECTORY</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Category Tabs: Litigation vs General Retainer */}
      <div className="flex flex-wrap border-b border-gray-200 gap-2">
        <button
          onClick={() => setCategoryFilter('ALL')}
          className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all rounded-t-2xl ${
            categoryFilter === 'ALL'
              ? 'border-primary text-primary bg-primary/5 font-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📂 All Client Matters ({cases.length})
        </button>
        <button
          onClick={() => setCategoryFilter('LITIGATION')}
          className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all rounded-t-2xl ${
            categoryFilter === 'LITIGATION'
              ? 'border-primary text-primary bg-primary/5 font-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚖️ Litigation Issues ({cases.filter((c: any) => (c.category || 'LITIGATION').toUpperCase() === 'LITIGATION').length})
        </button>
        <button
          onClick={() => setCategoryFilter('GENERAL')}
          className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all rounded-t-2xl ${
            categoryFilter === 'GENERAL'
              ? 'border-secondary text-primary bg-secondary/10 font-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🏛️ General / Retainer Matters ({cases.filter((c: any) => (c.category || '').toUpperCase() === 'GENERAL').length})
        </button>
      </div>

      <DashboardSearchBar
        value={query}
        onChange={setQuery}
        placeholder={isStaff ? "Search directory by Suit No., Title, Court, Counsel..." : "Search cases by title or details..."}
        count={filteredCases.length}
        countLabel="matters"
      />

      {/* Interactive Filter Bar for Court and Litigation Team */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filter Directory:</span>
        </div>

        {/* Court Filter */}
        <div className="flex-1 min-w-[220px]">
          <select
            value={selectedCourtFilter}
            onChange={(e) => setSelectedCourtFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">🏛️ All Courts ({courts.length})</option>
            {courts.map((court) => (
              <option key={court} value={court}>
                {court}
              </option>
            ))}
          </select>
        </div>

        {/* Litigation Team Filter */}
        <div className="flex-1 min-w-[220px]">
          <select
            value={selectedTeamFilter}
            onChange={(e) => setSelectedTeamFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">🛡️ All Litigation Teams ({teams.length})</option>
            {teams.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filters button */}
        {(selectedCourtFilter !== 'ALL' || selectedTeamFilter !== 'ALL' || query !== '') && (
          <button
            onClick={() => {
              setSelectedCourtFilter('ALL');
              setSelectedTeamFilter('ALL');
              setQuery('');
            }}
            className="px-4 py-2.5 bg-red-50 text-red-600 font-bold rounded-xl text-xs hover:bg-red-100 transition-all flex items-center gap-1.5"
          >
            <span>✕ Reset Filters</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">S/N</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">{categoryFilter === 'GENERAL' ? 'MATTER REF / SUIT' : 'SUIT NO.'}</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">CASE TITLE</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">CLIENT DETAILS</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">{categoryFilter === 'GENERAL' ? 'PRACTICE / JURISDICTION' : 'COURT'}</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">{categoryFilter === 'GENERAL' ? 'ASSIGNED COUNSEL / TEAM' : 'LITIGATION TEAM'}</th>
                <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCases.map((c, index) => {
                const isGeneral = ((c as any).category || '').toUpperCase() === 'GENERAL';
                const ov = overrides[c.id] || {};
                const suitNo = ov.suitNumber || c.suitNumber || (isGeneral ? `MATTER REF: GENERAL-${c.id.slice(-4).toUpperCase()}` : '');
                const courtName = ov.court || c.court || (isGeneral ? '🏢 PROPERTY & REALTY CONVEYANCING' : '');
                const teamName = ov.litigationTeam || c.litigationTeam || (isGeneral ? 'Unassigned Retainer Team' : '');

                const latestTimeline = c.timeline && c.timeline.length > 0 ? c.timeline[c.timeline.length - 1] : null;
                const realStatus = (latestTimeline?.status || c.status || 'OPEN').toUpperCase();

                return (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-all group">
                    <td className="px-6 py-5 font-bold text-primary">{index + 1}</td>
                    <td className="px-6 py-5">
                      {suitNo ? (
                        <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold tracking-wide">
                          {suitNo.startsWith('SUIT') || suitNo.startsWith('MATTER') ? suitNo : `SUIT NO: ${suitNo}`}
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-primary text-base">{c.title}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          isGeneral
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {isGeneral ? '🏛️ GENERAL / RETAINER' : '⚖️ LITIGATION ISSUE'}
                        </span>
                        {(c as any).subCategory && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                            {(c as any).subCategory}
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          realStatus === 'OPEN' || realStatus === 'NEW'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : realStatus === 'IN_PROGRESS' || realStatus === 'HEARING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : realStatus === 'COMPLETED' || realStatus === 'RESOLVED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                          {(!realStatus || realStatus === 'OPEN' || realStatus === 'NEW') ? 'MATTER REGISTERED' : String(realStatus).replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-medium text-gray-800">
                      <div className="font-bold text-primary text-sm">{c.client?.name || 'Client'}</div>
                      <div className="text-xs text-gray-500">{c.client?.email || '-'}</div>
                      {(c.client?.phone || (c.client as any)?.secondaryPhone) && (
                        <div className="text-xs text-gray-500 mt-0.5">📞 {[c.client?.phone, (c.client as any)?.secondaryPhone].filter(Boolean).join(', ')}</div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-700 font-medium">
                      {courtName ? (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0v-4m0 4h4" />
                          </svg>
                          <span className="font-bold text-gray-800">{courtName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-normal italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-sm text-primary font-semibold">
                      {teamName ? (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span className="font-bold text-primary">{teamName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 font-normal italic text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isStaff && (
                          <button
                            onClick={() => {
                              const ov = overrides[c.id] || {};
                              const suitNo = ov.suitNumber || c.suitNumber || '';
                              const courtName = ov.court || c.court || '';
                              const teamName = ov.litigationTeam || c.litigationTeam || '';
                              setEditingCase(c);
                              setEditTitle(c.title || '');
                              setEditSuitNo(suitNo);
                              setEditCourt(courtName);
                              setEditTeam(teamName);
                              setEditStage(ov.stage || 'PLEADINGS / PRE-TRIAL');
                              setEditPendingTask(ov.pendingTask || 'Filing of Written Address & Witness Statements');
                            }}
                            className="px-3 py-2 bg-gray-100 text-gray-700 hover:bg-secondary hover:text-white rounded-xl text-xs font-bold transition-all"
                            title="Edit Suit No., Court, Team, Stage & Pending Task"
                          >
                            Edit
                          </button>
                        )}
                        <Link 
                          href={`/dashboard/cases/${c.id}`}
                          className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-md shadow-primary/10 inline-flex items-center gap-1"
                        >
                          <span>View</span>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-gray-400 italic">
                    No case directory entries matched your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teams Management Modal */}
      {isTeamsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-primary">{categoryFilter === 'GENERAL' ? 'General Retainer' : 'Litigation'} Teams Directory</h3>
                <p className="text-xs text-gray-400">Manage teams for this workspace separately</p>
              </div>
              <button onClick={() => setIsTeamsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTeamInput}
                onChange={(e) => setNewTeamInput(e.target.value)}
                placeholder={categoryFilter === 'GENERAL' ? 'e.g. SME ADVISORY TEAM' : 'e.g. TEAM TITAN'}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-800"
              />
              <button
                onClick={handleAddTeam}
                className="px-6 py-3 bg-secondary text-white font-bold rounded-xl text-xs hover:bg-secondary/90 transition-all"
              >
                Add Team
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {teamsForWorkspace(teams, categoryFilter === 'GENERAL' ? 'GENERAL' : 'LITIGATION').map((team) => (
                <div key={team} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <span className="font-bold text-sm text-primary">{team}</span>
                  <button
                    onClick={() => handleRemoveTeam(team)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 bg-red-50 rounded-lg"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="text-right">
              <button
                onClick={() => setIsTeamsModalOpen(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Courts Management Modal */}
      {isCourtsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-primary">Courts Directory</h3>
                <p className="text-xs text-gray-400">Add or remove legal jurisdiction courts</p>
              </div>
              <button onClick={() => setIsCourtsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2">
              <span className="text-blue-500 text-sm">ℹ️</span>
              <p className="text-xs text-blue-700 leading-snug">
                Notice: If your court is not available in the directory list below, enter the name and click "Add Court" to register a new court to the system.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCourtInput}
                onChange={(e) => setNewCourtInput(e.target.value)}
                placeholder="e.g. HIGH COURT UROMI"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-800"
              />
              <button
                onClick={handleAddCourt}
                className="px-6 py-3 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-all"
              >
                Add Court
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {courts.map((court) => (
                <div key={court} className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  <span className="font-bold text-xs text-gray-800">{court}</span>
                  <button
                    onClick={() => handleRemoveCourt(court)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 bg-red-50 rounded-lg"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="text-right">
              <button
                onClick={() => setIsCourtsModalOpen(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Assignment Modal */}
      {editingCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-primary">Assign Directory Details</h3>
                <p className="text-xs text-gray-400 truncate max-w-xs">{editingCase.title}</p>
              </div>
              <button onClick={() => setEditingCase(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Case Title *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter Case Title"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Suit Number / File Reference</label>
                <input
                  type="text"
                  value={editSuitNo}
                  onChange={(e) => setEditSuitNo(e.target.value)}
                  placeholder="SUIT NO: HCB/102/2026"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Assigned Court</label>
                <select
                  value={editCourt}
                  onChange={(e) => setEditCourt(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 bg-white"
                >
                  <option value="">-- Unassigned / Select Court --</option>
                  {courts.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="mt-1.5 p-2 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
                  <span className="text-blue-500 text-xs">ℹ️</span>
                  <p className="text-[11px] text-blue-700 leading-tight">
                    Notice: If your court is not available in the dropdown, click <span className="font-bold">&quot;Courts Directory&quot;</span> at the top right to register a new court.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Assigned {editingCase.category === 'GENERAL' ? 'General Retainer' : 'Litigation'} Team
                </label>
                <select
                  value={editTeam}
                  onChange={(e) => setEditTeam(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 bg-white"
                >
                  <option value="">-- Unassigned / Select {editingCase.category === 'GENERAL' ? 'Retainer' : 'Litigation'} Team --</option>
                  {teamsForWorkspace(teams, editingCase.category === 'GENERAL' ? 'GENERAL' : 'LITIGATION').map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Litigation Stage</label>
                <select
                  value={editStage}
                  onChange={(e) => setEditStage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 bg-white"
                >
                  <option value="PLEADINGS / PRE-TRIAL">PLEADINGS / PRE-TRIAL</option>
                  <option value="TRIAL IN PROGRESS">TRIAL IN PROGRESS</option>
                  <option value="EVIDENCE & WITNESS HEARING">EVIDENCE & WITNESS HEARING</option>
                  <option value="WRITTEN ADDRESS">WRITTEN ADDRESS</option>
                  <option value="JUDGMENT & SENTENCING">JUDGMENT & SENTENCING</option>
                  <option value="APPEAL PENDING">APPEAL PENDING</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Pending Task</label>
                <input
                  type="text"
                  value={editPendingTask}
                  onChange={(e) => setEditPendingTask(e.target.value)}
                  placeholder="e.g. Filing of Written Address & Witness Statements"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEditingCase(null)}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCaseAssignment}
                className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl text-xs shadow-lg shadow-primary/20"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Page Dedicated Team Directory Register */}
      {activeTeamDirectoryModal && (
        <div className="fixed inset-0 bg-[#f8fafc] z-50 overflow-y-auto p-4 md:p-8 lg:p-10 space-y-8 animate-in fade-in duration-200">
          <div className="w-full max-w-[98%] mx-auto space-y-8 pb-20">
            {/* Top Navigation & Header Bar */}
            <div className="bg-white rounded-[32px] p-6 md:p-8 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTeamDirectoryModal(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span>Back to Cases</span>
                </button>
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 border border-secondary text-secondary flex items-center justify-center text-2xl font-bold shrink-0">
                  🛡️
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-black text-primary tracking-wide uppercase">
                      {activeTeamDirectoryModal}&apos;S CASE DIRECTORY
                    </h1>
                    <span className="px-3 py-1 bg-amber-400/10 border border-amber-400/40 text-amber-800 text-xs font-black rounded-full uppercase tracking-wider">
                      FULL PAGE REGISTER
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-1">
                    Official Dedicated Legal Directory Register for {activeTeamDirectoryModal}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {(() => {
                  const teamCases = cases.filter((c) => {
                    const ov = overrides[c.id] || {};
                    const teamName = ov.litigationTeam || c.litigationTeam || 'TEAM ANCHOR';
                    if (teamName !== activeTeamDirectoryModal) return false;
                    if (!isItemInMonth(c.createdAt, teamDirectoryMonth)) return false;
                    if (teamDirectoryQuery.trim()) {
                      const q = teamDirectoryQuery.trim().toLowerCase();
                      const cleanId = c.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                      const shortId = cleanId.length > 4 ? cleanId.slice(0, 4) : (cleanId || '102');
                      const suitNo = ov.suitNumber || c.suitNumber || `SUIT NO: HCB/${shortId}/2026`;
                      const courtName = ov.court || c.court || 'HIGH COURT BENIN CITY';
                      const stage = ov.stage || 'PLEADINGS / PRE-TRIAL';
                      const pendingTask = ov.pendingTask || 'Filing of Written Address & Witness Statements';
                      const phones = [c.client?.phone, c.client?.secondaryPhone].filter(Boolean).join(', ');
                      return [c.title, c.description, suitNo, courtName, stage, pendingTask, c.client?.name, c.client?.email, phones]
                        .filter(Boolean)
                        .some(val => String(val).toLowerCase().includes(q));
                    }
                    return true;
                  });

                  return (
                    <>
                      <button
                        onClick={() => {
                          const items = teamCases.map((c, index) => {
                            const ov = overrides[c.id] || {};
                            const cleanId = c.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                            const shortId = cleanId.length > 4 ? cleanId.slice(0, 4) : (cleanId || '102');
                            const phones = [c.client?.phone, c.client?.secondaryPhone].filter(Boolean).join(', ');
                            return {
                              sn: index + 1,
                              title: c.title,
                              suitNumber: ov.suitNumber || c.suitNumber || `SUIT NO: HCB/${shortId}/2026`,
                              court: ov.court || c.court || 'HIGH COURT BENIN CITY',
                              team: activeTeamDirectoryModal,
                              clientName: c.client?.name || 'N/A',
                              clientPhone: phones || 'N/A',
                              clientEmail: c.client?.email || 'N/A',
                              stage: ov.stage || 'PLEADINGS / PRE-TRIAL',
                              pendingTask: ov.pendingTask || 'Filing of Written Address & Witness Statements',
                              status: c.status,
                            };
                          });
                          downloadDirectoryAsPdf(items, {
                            query: teamDirectoryQuery,
                            courtFilter: 'ALL',
                            teamFilter: activeTeamDirectoryModal,
                            totalRecords: items.length,
                          });
                        }}
                        className="px-5 py-3 bg-red-600 text-white font-bold rounded-2xl text-xs flex items-center gap-2 hover:bg-red-700 transition-all shadow-md"
                      >
                        📄 Export PDF
                      </button>
                      <button
                        onClick={() => {
                          const items = teamCases.map((c, index) => {
                            const ov = overrides[c.id] || {};
                            const cleanId = c.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                            const shortId = cleanId.length > 4 ? cleanId.slice(0, 4) : (cleanId || '102');
                            const phones = [c.client?.phone, c.client?.secondaryPhone].filter(Boolean).join(', ');
                            return {
                              sn: index + 1,
                              title: c.title,
                              suitNumber: ov.suitNumber || c.suitNumber || `SUIT NO: HCB/${shortId}/2026`,
                              court: ov.court || c.court || 'HIGH COURT BENIN CITY',
                              team: activeTeamDirectoryModal,
                              clientName: c.client?.name || 'N/A',
                              clientPhone: phones || 'N/A',
                              clientEmail: c.client?.email || 'N/A',
                              stage: ov.stage || 'PLEADINGS / PRE-TRIAL',
                              pendingTask: ov.pendingTask || 'Filing of Written Address & Witness Statements',
                              status: c.status,
                            };
                          });
                          downloadDirectoryAsDocx(items, {
                            query: teamDirectoryQuery,
                            courtFilter: 'ALL',
                            teamFilter: activeTeamDirectoryModal,
                            totalRecords: items.length,
                          });
                        }}
                        className="px-5 py-3 bg-blue-600 text-white font-bold rounded-2xl text-xs flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md"
                      >
                        📝 Export DOCX
                      </button>
                    </>
                  );
                })()}

                <button
                  onClick={() => setActiveTeamDirectoryModal(null)}
                  className="px-5 py-3 bg-gray-900 text-white font-bold rounded-2xl text-xs hover:bg-gray-800 transition-all"
                >
                  Close Directory ✕
                </button>
              </div>
            </div>

            {(() => {
              const teamCases = cases.filter((c) => {
                const ov = overrides[c.id] || {};
                const teamName = ov.litigationTeam || c.litigationTeam || 'TEAM ANCHOR';
                if (teamName !== activeTeamDirectoryModal) return false;

                if (!isItemInMonth(c.createdAt, teamDirectoryMonth)) {
                  return false;
                }

                if (teamDirectoryQuery.trim()) {
                  const q = teamDirectoryQuery.trim().toLowerCase();
                  const cleanId = c.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                  const shortId = cleanId.length > 4 ? cleanId.slice(0, 4) : (cleanId || '102');
                  const suitNo = ov.suitNumber || c.suitNumber || `SUIT NO: HCB/${shortId}/2026`;
                  const courtName = ov.court || c.court || 'HIGH COURT BENIN CITY';
                  const stage = ov.stage || 'PLEADINGS / PRE-TRIAL';
                  const pendingTask = ov.pendingTask || 'Filing of Written Address & Witness Statements';
                  const phones = [c.client?.phone, c.client?.secondaryPhone].filter(Boolean).join(', ');

                  return [c.title, c.description, suitNo, courtName, stage, pendingTask, c.client?.name, c.client?.email, phones]
                    .filter(Boolean)
                    .some(val => String(val).toLowerCase().includes(q));
                }

                return true;
              });

              return (
                <div className="space-y-6">
                  {/* Date / Month Picker Filter Component */}
                  <MonthPickerFilter
                    selectedMonth={teamDirectoryMonth}
                    onChange={setTeamDirectoryMonth}
                    totalCount={teamCases.length}
                    countLabel={`matters in ${activeTeamDirectoryModal}`}
                  />

                  {/* Search Bar inside Full Page Team Directory */}
                  <DashboardSearchBar
                    value={teamDirectoryQuery}
                    onChange={setTeamDirectoryQuery}
                    placeholder={`Search ${activeTeamDirectoryModal} matters by Suit No, Title, Court, Client...`}
                    count={teamCases.length}
                    countLabel="registered matters"
                  />

                  {/* Main Full Page Table matching User Screenshot */}
                  <div className="bg-white rounded-[40px] border border-gray-200 overflow-hidden shadow-md">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-primary text-white">
                            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">S/N</th>
                            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">CASES TITLE</th>
                            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">SUIT NO.</th>
                            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">COURT</th>
                            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">CLIENT DETAILS</th>
                            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">STAGE</th>
                            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest">PENDING TASK</th>
                            <th className="px-6 py-5 text-xs font-bold uppercase tracking-widest text-right">ACTION</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {teamCases.map((c, index) => {
                            const ov = overrides[c.id] || {};
                            const suitNo = ov.suitNumber || c.suitNumber || '';
                            const courtName = ov.court || c.court || '';
                            const stage = ov.stage || 'PLEADINGS / PRE-TRIAL';
                            const pendingTask = ov.pendingTask || 'Filing of Written Address & Witness Statements';
                            const phones = [c.client?.phone, c.client?.secondaryPhone].filter(Boolean).join(', ');

                            return (
                              <tr key={c.id} className="hover:bg-gray-50/50 transition-all">
                                <td className="px-6 py-5 font-bold text-primary text-sm">{index + 1}</td>
                                <td className="px-6 py-5">
                                  <div className="font-bold text-primary text-base">{c.title}</div>
                                </td>
                                <td className="px-6 py-5">
                                  {suitNo ? (
                                    <span className="px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold">
                                      {suitNo.startsWith('SUIT') ? suitNo : `SUIT NO: ${suitNo}`}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 font-normal italic text-xs">—</span>
                                  )}
                                </td>
                                <td className="px-6 py-5 text-xs text-gray-700 font-medium">
                                  {courtName || <span className="text-gray-400 font-normal italic text-xs">—</span>}
                                </td>
                                <td className="px-6 py-5 text-xs font-medium text-gray-800">
                                  <div className="font-bold text-primary text-sm">{c.client?.name || 'N/A'}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    📞 {phones || 'No Phone Registered'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ✉️ {c.client?.email || 'No Email Registered'}
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                  <span className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-extrabold uppercase tracking-wide">
                                    {stage}
                                  </span>
                                </td>
                                <td className="px-6 py-5 text-xs font-semibold text-amber-900">
                                  <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200 px-3.5 py-2 rounded-xl">
                                    <span className="text-amber-600">📌</span>
                                    <span>{pendingTask}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {isStaff && (
                                      <button
                                        onClick={() => {
                                          const ov = overrides[c.id] || {};
                                          const suitNo = ov.suitNumber || c.suitNumber || '';
                                          const courtName = ov.court || c.court || '';
                                          const teamName = ov.litigationTeam || c.litigationTeam || activeTeamDirectoryModal || '';
                                          setEditingCase(c);
                                          setEditTitle(c.title || '');
                                          setEditSuitNo(suitNo);
                                          setEditCourt(courtName);
                                          setEditTeam(teamName);
                                          setEditStage(ov.stage || 'PLEADINGS / PRE-TRIAL');
                                          setEditPendingTask(ov.pendingTask || 'Filing of Written Address & Witness Statements');
                                        }}
                                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1"
                                        title="Edit Case Title, Suit No., Court, Stage & Pending Task"
                                      >
                                        ✏️ Edit
                                      </button>
                                    )}
                                    <Link 
                                      href={`/dashboard/cases/${c.id}`}
                                      className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-md inline-flex items-center gap-1"
                                    >
                                      <span>View</span>
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                      </svg>
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}

                          {teamCases.length === 0 && (
                            <tr>
                              <td colSpan={8} className="px-8 py-20 text-center">
                                <div className="space-y-3">
                                  <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl font-bold">
                                    📂
                                  </div>
                                  <h4 className="font-bold text-primary text-base uppercase">
                                    NO REGISTERED MATTERS FOUND FOR THIS MONTH
                                  </h4>
                                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                                    No legal matters match your selected month ({formatMonthDisplay(teamDirectoryMonth)}) and filter under {activeTeamDirectoryModal}. Try picking another month with the date timepicker above or click &quot;All Months&quot;.
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-xs font-bold text-gray-500">
                {activeTeamDirectoryModal} • Full Page Directory Register
              </span>
              <button
                onClick={() => setActiveTeamDirectoryModal(null)}
                className="px-8 py-3 bg-[#C5A059] hover:bg-[#b08e4b] text-white font-bold rounded-2xl text-xs transition-all shadow-lg"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
