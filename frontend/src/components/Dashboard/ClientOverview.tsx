"use client";
import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import GeneralRetainerOverview from './GeneralRetainerOverview';

type ClientPracticeDept = 'LITIGATION' | 'GENERAL';

export default function ClientOverview() {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<ClientPracticeDept | null>(null);
  const { logout } = useAuth();

  useEffect(() => {
    // Check saved client department
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('midlex_client_dept');
      if (saved === 'LITIGATION' || saved === 'GENERAL') {
        setSelectedDept(saved);
      } else {
        logout();
        return;
      }
    }

    const fetchCases = async () => {
      try {
        const data = await apiFetch('/cases/my-cases');
        setCases(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching client cases:', error);
      }
    };
    fetchCases();
  }, [logout]);

  if (selectedDept === 'GENERAL') return <GeneralRetainerOverview />;

  // Helper to determine Litigation vs General case
  const isLitigationCase = (c: any) => {
    const text = `${c.title || ''} ${c.description || ''} ${c.category || ''} ${c.court || ''}`.toLowerCase();
    return c.category === 'LITIGATION' || text.includes('court') || text.includes('suit') || text.includes('trial') || text.includes('litigation');
  };

  const filteredCases = cases.filter((c) => {
    if (!selectedDept) return true;
    if (selectedDept === 'LITIGATION') return isLitigationCase(c);
    return !isLitigationCase(c);
  });

  return (
    <div className="space-y-8">
      {/* Top Client Branch Status Bar */}
      <div className={`p-6 rounded-[28px] text-white shadow-xl flex flex-wrap items-center justify-between gap-4 border transition-all ${
        selectedDept === 'LITIGATION'
          ? 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-blue-500/30'
          : 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-amber-500/30'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl ${
            selectedDept === 'LITIGATION' ? 'bg-blue-600/30 text-amber-300 border border-blue-400/40' : 'bg-amber-600/30 text-amber-400 border border-amber-400/40'
          }`}>
            {selectedDept === 'LITIGATION' ? '⚖️' : '🏢'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-400/30">
                ACTIVE CLIENT WORKSPACE
              </span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">
              Litigation Cases &amp; Disputes
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Viewing court litigation suits, hearing dates, and trial advocate briefs.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/profile#security"
            className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs border border-white/15 transition-all flex items-center gap-1.5"
          >
            🔒 Change Password
          </Link>
          <Link
            href={`/dashboard/cases/new?category=${selectedDept || 'LITIGATION'}`}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20"
          >
            ➕ Open New Litigation Case
          </Link>
          <span className="px-5 py-3 bg-white/10 text-white/80 font-bold rounded-2xl text-xs border border-white/10">
            Sign out to change workspace
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[40px] border border-gray-100 p-8 sm:p-10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-primary">
                  My Litigation Cases
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Showing {filteredCases.length} active matters
                </p>
              </div>
              <Link
                href={`/dashboard/cases/new?category=${selectedDept || 'LITIGATION'}`}
                className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-all"
              >
                + New Case
              </Link>
            </div>

            <div className="space-y-6">
              {filteredCases.length > 0 ? filteredCases.map((c: any) => (
                <div key={c.id} className="p-8 rounded-3xl bg-[#fafafa] border border-gray-100 hover:border-amber-300 transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full">
                        ⚖️ Litigation
                      </span>
                      <h4 className="text-lg font-bold text-primary">{c.title}</h4>
                    </div>
                    <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold rounded-full">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mb-6 leading-relaxed">{c.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400">
                      Lawyer: <strong className="text-primary">{c.lawyer?.name || 'Assigned Counsel'}</strong>
                    </span>
                    <Link 
                      href={`/dashboard/cases/${c.id}`}
                      className="px-6 py-2.5 bg-white border border-gray-200 text-primary font-bold rounded-xl text-xs hover:border-secondary hover:text-secondary transition-all shadow-sm"
                    >
                      Open Case
                    </Link>
                  </div>
                </div>
              )) : (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <p className="text-gray-500 font-bold text-sm">
                    No active litigation suits found.
                  </p>
                  <Link 
                    href={`/dashboard/cases/new?category=${selectedDept || 'LITIGATION'}`}
                    className="mt-4 px-8 py-3.5 bg-secondary text-white font-bold rounded-2xl inline-block text-xs uppercase tracking-wider shadow-lg shadow-secondary/20"
                  >
                    Open New Litigation Case
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-primary p-8 rounded-[40px] text-white">
            <h4 className="text-xl font-bold mb-3">Legal Consultation &amp; Support</h4>
            <p className="text-white/70 text-xs mb-6 leading-relaxed">
              Need immediate advice on court litigation, land title verification, or contract reviews?
            </p>
            <Link 
              href={filteredCases.length > 0 ? `/dashboard/cases/${(filteredCases[0] as any).id}` : `/dashboard/cases/new?category=${selectedDept || 'LITIGATION'}`}
              className="w-full py-4 bg-secondary text-white font-bold rounded-2xl shadow-lg shadow-secondary/20 inline-block text-center text-xs uppercase tracking-wider"
            >
              Chat with Midlex Counsel
            </Link>
          </div>

          <div className="bg-white p-8 rounded-[40px] border border-gray-100">
            <h4 className="text-xl font-bold text-primary mb-4">Upcoming Case Dates</h4>
            <div className="space-y-4">
              <p className="text-gray-400 text-xs italic">No upcoming court hearings scheduled.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
