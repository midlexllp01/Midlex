"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Calendar, MessageSquare, Users, Scale, Building } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import AdminDepartmentModal, { PracticeDepartment } from './AdminDepartmentModal';
import PracticeOverviewPanel from './PracticeOverviewPanel';

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
        // Let a new lawyer choose a practice before using the overview.
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
      color: 'bg-[#eaf1e7] text-[#23533e]',
    },
    { label: 'View Clients', value: stats.totalClients || filteredCases.length, icon: <Users size={22} />, color: 'bg-[#eaf1e7] text-[#23533e]' },
    { label: 'Court Hearing Dates', value: stats.upcomingCourts, icon: <Calendar size={22} />, color: 'bg-[#eaf1e7] text-[#23533e]' },
    { label: 'New Messages', value: stats.newMessages, icon: <MessageSquare size={22} />, color: 'bg-[#eaf1e7] text-[#23533e]' },
  ];

  const quickActions = [
    { label: selectedDept === 'LITIGATION' ? 'Litigation Cases' : selectedDept === 'GENERAL' ? 'Property & General Cases' : 'Open Cases', href: '/dashboard/cases' },
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
      {/* Practice selection */}
      <AdminDepartmentModal
        isOpen={isDeptModalOpen}
        onSelectDepartment={handleSelectDepartment}
        onClose={() => setIsDeptModalOpen(false)}
        currentDept={selectedDept}
      />

      <PracticeOverviewPanel currentDept={selectedDept} onSwitch={() => setIsDeptModalOpen(true)} role="lawyer" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[#dce6df] bg-white p-6">
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-6`}>
              {stat.icon}
            </div>
            <p className="text-xs font-semibold text-[#688176]">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-[#173e34]">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-xl border border-[#dce6df] bg-white px-6 py-5 text-center font-semibold text-[#23533e] transition-colors hover:border-[#7d9c89] hover:bg-[#f4f8f2]"
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
          <Link href="/dashboard/cases" className="text-sm font-semibold text-[#23533e] hover:underline">View All</Link>
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
