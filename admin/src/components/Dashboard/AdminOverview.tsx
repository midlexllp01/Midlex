"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DollarSign, FileText, TrendingUp, Users, Scale, Building } from 'lucide-react';
import { apiFetch } from '@/lib/api';

import MonthPickerFilter, { getCurrentMonthStr, isItemInMonth } from './MonthPickerFilter';
import AdminDepartmentModal, { PracticeDepartment } from './AdminDepartmentModal';

interface AdminStats {
  totalCases: number;
  activeLawyers: number;
  pendingPayments: number;
  totalRevenue: number;
}

interface ActivityItem {
  id: string;
  title: string;
  createdAt?: string;
  client?: { name: string };
}

export default function AdminOverview() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());
  const [selectedDept, setSelectedDept] = useState<PracticeDepartment | null>(null);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState<boolean>(false);

  const [allCases, setAllCases] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check saved department
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('midlex_admin_dept') as PracticeDepartment | null;
      if (saved === 'LITIGATION' || saved === 'GENERAL') {
        setSelectedDept(saved);
      } else {
        // Open 2-squares selection modal by default on initial admin login
        setIsDeptModalOpen(true);
      }
    }

    const fetchOverview = async () => {
      try {
        const [casesData, paymentsData, clientsData, activityData] = await Promise.all([
          apiFetch('/cases').catch(() => []),
          apiFetch('/payments').catch(() => []),
          apiFetch('/users/clients').catch(() => []),
          apiFetch<ActivityItem[]>('/admin/recent-activity').catch(() => []),
        ]);
        setAllCases(Array.isArray(casesData) ? casesData : []);
        setAllPayments(Array.isArray(paymentsData) ? paymentsData : []);
        setAllClients(Array.isArray(clientsData) ? clientsData : []);
        setActivity(Array.isArray(activityData) ? activityData : []);
      } catch (error) {
        console.error('Error fetching admin overview:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, []);

  useEffect(() => {
    const sync = () => {
      const value = localStorage.getItem('midlex_admin_dept');
      if (value === 'LITIGATION' || value === 'GENERAL') setSelectedDept(value);
    };
    window.addEventListener('midlex:practice-change', sync);
    return () => window.removeEventListener('midlex:practice-change', sync);
  }, []);

  const handleSelectDepartment = (dept: PracticeDepartment) => {
    setSelectedDept(dept);
    setIsDeptModalOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('midlex_admin_dept', dept);
      window.dispatchEvent(new Event('midlex:practice-change'));
    }
  };

  // Helper to determine if a case is Litigation vs General / Property
  const isLitigationCase = (c: any) => {
    const category = String(c.category || '').toUpperCase();
    if (category === 'GENERAL') return false;
    if (category === 'LITIGATION') return true;
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

  const isGeneralCase = (c: any) => {
    const category = String(c.category || '').toUpperCase();
    if (category === 'GENERAL') return true;
    if (category === 'LITIGATION') return false;
    const text = `${c.title || ''} ${c.description || ''} ${c.category || ''} ${c.assignedLawyer || ''}`.toLowerCase();
    return (
      category === 'PROPERTY' ||
      category === 'REALTY' ||
      text.includes('property') ||
      text.includes('realty') ||
      text.includes('title') ||
      text.includes('samson') ||
      text.includes('general') ||
      !isLitigationCase(c)
    );
  };

  // Filter cases based on month & chosen department
  const filteredMonthCases = allCases.filter(c => isItemInMonth(c.createdAt, selectedMonth));
  const deptFilteredCases = filteredMonthCases.filter(c => {
    if (!selectedDept) return true;
    return selectedDept === 'LITIGATION' ? isLitigationCase(c) : isGeneralCase(c);
  });

  const filteredPayments = allPayments.filter(p => isItemInMonth(p.createdAt || p.paidAt, selectedMonth));
  const filteredClients = allClients.filter(cl => isItemInMonth(cl.createdAt, selectedMonth));

  const totalRevenue = filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pendingPaymentsCount = filteredPayments.filter(p => p.status === 'PENDING').length;

  const statCards = [
    {
      label: selectedDept === 'LITIGATION' ? 'Litigation Suits (This Month)' : selectedDept === 'GENERAL' ? 'Property & General Cases' : 'All Cases (This Month)',
      value: deptFilteredCases.length,
      icon: selectedDept === 'LITIGATION' ? <Scale size={22} /> : <Building size={22} />,
      color: selectedDept === 'LITIGATION' ? 'bg-blue-600' : 'bg-amber-600'
    },
    { label: 'Clients Registered', value: filteredClients.length, icon: <Users size={22} />, color: 'bg-green-500' },
    { label: 'Pending Payments', value: pendingPaymentsCount, icon: <DollarSign size={22} />, color: 'bg-amber-500' },
    { label: 'Monthly Revenue', value: `NGN ${totalRevenue.toLocaleString()}`, icon: <TrendingUp size={22} />, color: 'bg-emerald-500' },
  ];

  const quickActions = [
    { label: selectedDept === 'LITIGATION' ? '⚖️ Litigation Cases' : selectedDept === 'GENERAL' ? '🏢 Property & General Cases' : 'Open Cases', href: '/dashboard/cases' },
    { label: 'View Clients', href: '/dashboard/clients' },
    { label: 'Review Payments', href: '/dashboard/payments' },
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
      {/* 2 Squares Department Selection Modal */}
      <AdminDepartmentModal
        isOpen={isDeptModalOpen}
        onSelectDepartment={handleSelectDepartment}
        onClose={() => setIsDeptModalOpen(false)}
        currentDept={selectedDept}
      />

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#dce6df] bg-white p-5 sm:p-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7b8d83]">Practice overview</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#173e34]">{selectedDept === 'LITIGATION' ? 'Litigation' : selectedDept === 'GENERAL' ? 'General & Property' : 'Your practice'}</h2>
          <p className="mt-1 text-sm text-[#688176]">{selectedDept === 'LITIGATION' ? 'Court matters, upcoming hearings and the teams handling them.' : 'Retainers, property matters and your advisory teams.'}</p>
        </div>
        <button type="button" onClick={() => setIsDeptModalOpen(true)} className="rounded-xl border border-[#ccdcd0] px-4 py-2.5 text-sm font-semibold text-[#23533e] hover:bg-[#f0f6ed]">Switch practice</button>
      </section>

      <MonthPickerFilter
        selectedMonth={selectedMonth}
        onChange={setSelectedMonth}
        totalCount={deptFilteredCases.length}
        countLabel={`${selectedDept === 'LITIGATION' ? 'litigation suits' : 'general cases'} this month`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-[28px] border border-gray-100 p-8 shadow-sm">
            <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center text-white mb-6`}>
              {stat.icon}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-primary break-words">{stat.value}</p>
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
        <h3 className="text-2xl font-bold text-primary mb-8">Recent Activity</h3>
        <div className="space-y-8">
          {activity.length > 0 ? activity.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-primary font-bold">
                {(item.client?.name || item.title || 'C').charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-primary truncate">New case filed: {item.title}</p>
                <p className="text-sm text-gray-500">By Client {item.client?.name || 'Unknown'}</p>
              </div>
              <Link
                href={`/dashboard/cases/${item.id}`}
                className="px-6 py-3 bg-gray-50 rounded-xl text-primary font-bold hover:bg-primary hover:text-white transition-all"
              >
                View
              </Link>
            </div>
          )) : (
            <div className="text-center py-12 text-gray-400 italic">No recent activity.</div>
          )}
        </div>
      </section>
    </div>
  );
}
