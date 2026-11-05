"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Calendar, MessageSquare, Users, Scale, Building } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import AdminDepartmentModal, { PracticeDepartment } from './AdminDepartmentModal';

interface LawyerStats {
  totalClients: number;
  activeCases: number;
  upcomingCourts: number;
  newMessages: number;
}

interface LawyerCase {
  id: string;
  title: string;
  description?: string;
  category?: string;
  suitNumber?: string;
  court?: string;
  litigationTeam?: string;
  client?: { name: string };
  createdAt?: string;
}

export default function LawyerOverview() {
  const [selectedDept, setSelectedDept] = useState<PracticeDepartment | null>(null);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState<boolean>(false);

  const [cases, setCases] = useState<LawyerCase[]>([]);
  const [stats, setStats] = useState<LawyerStats>({
    totalClients: 0,
    activeCases: 0,
    upcomingCourts: 0,
    newMessages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check saved lawyer department selection
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('midlex_admin_dept') as PracticeDepartment | null;
      if (saved) {
        setSelectedDept(saved);
      } else {
        // Open 2-squares choice modal by default on lawyer login
        setIsDeptModalOpen(true);
      }
    }

    const fetchOverview = async () => {
      try {
        const [statsData, casesData] = await Promise.all([
          apiFetch<LawyerStats>('/lawyer/stats').catch(() => ({ totalClients: 0, activeCases: 0, upcomingCourts: 0, newMessages: 0 })),
          apiFetch<LawyerCase[]>('/cases/my-cases').catch(() => apiFetch<LawyerCase[]>('/lawyer/cases')).catch(() => []),
        ]);
        setStats(statsData);
        setCases(Array.isArray(casesData) ? casesData : []);
      } catch (error) {
        console.error('Error fetching lawyer overview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const handleSelectDepartment = (dept: PracticeDepartment) => {
    setSelectedDept(dept);
    setIsDeptModalOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('midlex_admin_dept', dept);
    }
  };

  // Helper to determine if a case is Litigation vs General
  const isLitigationCase = (c: any) => {
    const text = `${c.title || ''} ${c.description || ''} ${c.category || ''} ${c.court || ''} ${c.suitNumber || ''}`.toLowerCase();
    return (
      c.suitNumber ||
      c.court ||
      c.litigationTeam ||
      c.category === 'LITIGATION' ||
      text.includes('court') ||
      text.includes('suit') ||
      text.includes('trial') ||
      text.includes('litigation')
    );
  };

  const filteredCases = cases.filter((c) => {
    if (!selectedDept) return true;
    if (selectedDept === 'LITIGATION') return isLitigationCase(c);
    return !isLitigationCase(c);
  });

  const statCards = [
    {
      label: selectedDept === 'LITIGATION' ? 'Litigation Suits' : selectedDept === 'GENERAL' ? 'Property & General Cases' : 'Open Cases',
      value: filteredCases.length,
      icon: selectedDept === 'LITIGATION' ? <Scale size={22} /> : <Building size={22} />,
      color: selectedDept === 'LITIGATION' ? 'bg-blue-600' : 'bg-amber-600',
    },
    { label: 'View Clients', value: stats.totalClients || filteredCases.length, icon: <Users size={22} />, color: 'bg-green-500' },
    { label: 'Court Hearing Dates', value: stats.upcomingCourts, icon: <Calendar size={22} />, color: 'bg-amber-500' },
    { label: 'New Messages', value: stats.newMessages, icon: <MessageSquare size={22} />, color: 'bg-emerald-500' },
  ];

  const quickActions = [
    { label: selectedDept === 'LITIGATION' ? '⚖️ Litigation Cases' : selectedDept === 'GENERAL' ? '🏢 Property & General Cases' : 'Open Cases', href: '/dashboard/cases' },
    { label: 'View Clients', href: '/dashboard/clients' },
    { label: 'Messages', href: '/dashboard/messages' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-44 bg-white rounded-[28px] border border-gray-100" />
          ))}
        </div>
        <div className="h-20 bg-white rounded-[28px] border border-gray-100" />
        <div className="h-80 bg-white rounded-[32px] border border-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 2 Squares Department Choice Modal for Lawyer */}
      <AdminDepartmentModal
        isOpen={isDeptModalOpen}
        onSelectDepartment={handleSelectDepartment}
        onClose={() => setIsDeptModalOpen(false)}
        currentDept={selectedDept}
      />

      {/* 2 Big Interactive Profile Choice Buttons for Lawyer */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-slate-500">
            CHOOSE LAWYER ADVOCACY PROFILE WORKSPACE
          </span>
          {selectedDept && (
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Active: {selectedDept === 'LITIGATION' ? '⚖️ Litigation Court Advocacy' : '🏢 General & Property Conveyancing'}
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* LITIGATION PROFILE BUTTON */}
          <button
            type="button"
            onClick={() => handleSelectDepartment('LITIGATION')}
            className={`p-6 sm:p-8 rounded-[32px] border-2 text-left transition-all relative overflow-hidden group shadow-lg ${
              selectedDept === 'LITIGATION'
                ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white border-blue-500 shadow-blue-900/30 scale-[1.01]'
                : 'bg-white text-slate-900 border-slate-200 hover:border-blue-500 hover:shadow-xl'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl mb-4 ${
                selectedDept === 'LITIGATION' ? 'bg-blue-500/20 text-amber-300 border border-blue-400/30' : 'bg-blue-50 text-blue-700 border border-blue-100'
              }`}>
                ⚖️
              </div>
              <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                selectedDept === 'LITIGATION' ? 'bg-amber-400 text-slate-950' : 'bg-blue-100 text-blue-800'
              }`}>
                LITIGATION ADVOCACY
              </span>
            </div>

            <h3 className={`text-2xl font-black mb-2 ${selectedDept === 'LITIGATION' ? 'text-white' : 'text-slate-900'}`}>
              Litigation Advocacy Profile
            </h3>
            <p className={`text-xs leading-relaxed ${selectedDept === 'LITIGATION' ? 'text-slate-300' : 'text-slate-500'}`}>
              Manage High Court suits, trial calendars, witness evidence, pleadings, written addresses, and allocated litigation team registers.
            </p>

            <div className={`mt-6 pt-4 border-t flex items-center justify-between text-xs font-bold ${
              selectedDept === 'LITIGATION' ? 'border-white/10 text-amber-300' : 'border-slate-100 text-blue-700'
            }`}>
              <span>Manage Litigation Practice ➔</span>
              {selectedDept === 'LITIGATION' && <span className="bg-emerald-500 text-slate-950 px-3.5 py-1 rounded-full text-[10px] font-black">ACTIVE VIEW</span>}
            </div>
          </button>

          {/* GENERAL & PROPERTY PROFILE BUTTON */}
          <button
            type="button"
            onClick={() => handleSelectDepartment('GENERAL')}
            className={`p-6 sm:p-8 rounded-[32px] border-2 text-left transition-all relative overflow-hidden group shadow-lg ${
              selectedDept === 'GENERAL'
                ? 'bg-gradient-to-br from-amber-950 via-slate-900 to-amber-950 text-white border-amber-500 shadow-amber-900/30 scale-[1.01]'
                : 'bg-white text-slate-900 border-slate-200 hover:border-amber-500 hover:shadow-xl'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl mb-4 ${
                selectedDept === 'GENERAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}>
                🏢
              </div>
              <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${
                selectedDept === 'GENERAL' ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-900'
              }`}>
                REALTY & CONVEYANCING
              </span>
            </div>

            <h3 className={`text-2xl font-black mb-2 ${selectedDept === 'GENERAL' ? 'text-white' : 'text-slate-900'}`}>
              General & Property Profile
            </h3>
            <p className={`text-xs leading-relaxed ${selectedDept === 'GENERAL' ? 'text-slate-300' : 'text-slate-500'}`}>
              Manage land title verifications, Certificate of Occupancy searches, Samson Sabbat property auto-allocations, and commercial advisory.
            </p>

            <div className={`mt-6 pt-4 border-t flex items-center justify-between text-xs font-bold ${
              selectedDept === 'GENERAL' ? 'border-white/10 text-amber-300' : 'border-slate-100 text-amber-700'
            }`}>
              <span>Manage Property & General Practice ➔</span>
              {selectedDept === 'GENERAL' && <span className="bg-emerald-500 text-slate-950 px-3.5 py-1 rounded-full text-[10px] font-black">ACTIVE VIEW</span>}
            </div>
          </button>
        </div>
      </div>

      {/* Top Lawyer Practice Status Bar */}
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
                ACTIVE LAWYER PRACTICE WORKSPACE
              </span>
            </div>
            <h3 className="text-xl font-black text-white mt-1">
              {selectedDept === 'LITIGATION' ? 'Litigation Practice & Court Advocacy' : 'General & Property (Realty) Practice'}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {selectedDept === 'LITIGATION'
                ? 'Managing court trial dates, pleadings, hearing schedules, & litigation counsel briefs.'
                : 'Managing land title searches, Samson Sabbat property allocations, & corporate advisory.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDeptModalOpen(true)}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
        >
          Switch practice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-[28px] border border-gray-100 p-8 shadow-sm">
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white mb-6`}>
              {stat.icon}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="bg-white border border-gray-100 rounded-2xl px-6 py-5 text-center font-bold text-primary hover:border-secondary hover:text-secondary transition-all"
          >
            {action.label}
          </Link>
        ))}
      </div>

      <section className="bg-white rounded-[32px] border border-gray-100 p-6 sm:p-10 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h3 className="text-2xl font-bold text-primary">
            {selectedDept === 'LITIGATION' ? 'Active Litigation Cases' : selectedDept === 'GENERAL' ? 'Active Property & General Cases' : 'Recent Cases'}
          </h3>
          <Link href="/dashboard/cases" className="text-secondary font-bold text-sm">View All</Link>
        </div>

        <div className="space-y-8">
          {filteredCases.length > 0 ? filteredCases.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-primary font-bold">
                {(c.client?.name || c.title || 'C').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-primary truncate">{c.title}</p>
                <p className="text-sm text-gray-500">By Client {c.client?.name || 'Unknown'}</p>
              </div>
              <Link
                href={`/dashboard/cases/${c.id}`}
                className="px-6 py-3 bg-gray-50 rounded-xl text-primary font-bold hover:bg-primary hover:text-white transition-all"
              >
                View Case
              </Link>
            </div>
          )) : (
            <div className="text-center py-12 text-gray-400 italic">
              No active {selectedDept === 'LITIGATION' ? 'litigation suits' : 'general or property cases'} found.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
