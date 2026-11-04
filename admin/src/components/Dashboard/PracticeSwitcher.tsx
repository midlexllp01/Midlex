"use client";

import { useEffect, useState } from 'react';
import { Building2, ChevronsUpDown, Scale } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import AdminDepartmentModal, { PracticeDepartment } from './AdminDepartmentModal';

export default function PracticeSwitcher() {
  const [practice, setPractice] = useState<PracticeDepartment | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const sync = () => {
      const saved = localStorage.getItem('midlex_admin_dept');
      setPractice(saved === 'GENERAL' || saved === 'LITIGATION' ? saved : null);
    };
    sync();
    window.addEventListener('midlex:practice-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('midlex:practice-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const Icon = practice === 'GENERAL' ? Building2 : Scale;
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Switch practice. Current: ${practice === 'GENERAL' ? 'General and Property' : practice === 'LITIGATION' ? 'Litigation' : 'none selected'}`}
      className="flex min-h-11 items-center gap-2 rounded-xl border border-[#dce6df] bg-[#f7faf7] px-3 py-2 text-[#23533e] transition-colors hover:bg-[#edf4e8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#23533e]">
      <Icon size={18} strokeWidth={1.7}/><span className="max-w-24 truncate text-xs font-semibold sm:max-w-none sm:text-sm">{practice === 'GENERAL' ? 'General & Property' : practice === 'LITIGATION' ? 'Litigation' : 'Choose practice'}</span><ChevronsUpDown size={14} className="text-[#7b8d83]"/>
    </button>
    <AdminDepartmentModal isOpen={open} currentDept={practice} onClose={() => setOpen(false)} onSelectDepartment={value => {
      localStorage.setItem('midlex_admin_dept', value);
      window.dispatchEvent(new Event('midlex:practice-change'));
      setOpen(false);
      if (pathname !== '/dashboard') router.push('/dashboard');
    }}/>
  </>;
}
