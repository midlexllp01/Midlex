"use client";

import React, { useEffect, useRef } from 'react';
import { ArrowRight, Building2, Check, Scale, X } from 'lucide-react';

export type PracticeDepartment = 'LITIGATION' | 'GENERAL';
const practices = [
  { id: 'LITIGATION' as const, name: 'Litigation', description: 'Court matters, hearings and litigation teams.', detail: 'Cases · Court dates · Counsel assignments', icon: Scale },
  { id: 'GENERAL' as const, name: 'General & Property', description: 'Retainers, property matters and legal advisory.', detail: 'Retainers · Property · Commercial advice', icon: Building2 },
];

export default function AdminDepartmentModal({ isOpen, onSelectDepartment, onClose, currentDept }: {
  isOpen: boolean;
  onSelectDepartment: (dept: PracticeDepartment) => void;
  onClose?: () => void;
  currentDept?: PracticeDepartment | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (isOpen && element && !element.open) element.showModal();
    if (!isOpen && element?.open) element.close();
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);

  return <dialog ref={dialog} aria-labelledby="practice-title" aria-describedby="practice-description"
    onCancel={event => { event.preventDefault(); onClose?.(); }}
    className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-xl max-h-[90dvh] overflow-y-auto rounded-3xl border border-[#dce6df] bg-white p-0 text-[#173e34] shadow-2xl backdrop:bg-[#102b23]/55 backdrop:backdrop-blur-sm">
    <div className="p-6 sm:p-8">
      <div className="mb-6 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#688176]">Midlex · Practice workspace</span>
        {onClose && <button type="button" aria-label="Close practice switcher" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-[#688176] hover:bg-[#f0f5f1] focus-visible:outline-2 focus-visible:outline-[#1c5945]"><X size={19}/></button>}
      </div>
      <h2 id="practice-title" className="text-2xl font-semibold tracking-tight">{currentDept ? 'Switch practice' : 'Choose your practice'}</h2>
      <p id="practice-description" className="mt-2 text-sm leading-6 text-[#688176]">Open the workspace for the matters you want to manage.</p>
      <div className="mt-6 space-y-3">
        {practices.map(({ id, name, description, detail, icon: Icon }) => {
          const active = currentDept === id;
          return <button key={id} type="button" onClick={() => onSelectDepartment(id)} aria-label={`Open ${name} workspace${active ? ', current practice' : ''}`}
            className={`group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c5945] sm:p-5 ${active ? 'border-[#2b694f] bg-[#f0f6ed]' : 'border-[#dce6df] bg-white hover:border-[#7d9c89] hover:bg-[#f7faf7]'}`}>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eaf1e7] text-[#23533e]"><Icon size={23} strokeWidth={1.6}/></span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-base font-semibold">{name}</span>{active && <span className="inline-flex items-center gap-1 rounded-full bg-[#ddebd6] px-2 py-0.5 text-[10px] font-semibold text-[#23533e]"><Check size={11}/> Current</span>}</span><span className="mt-1 block text-sm leading-5 text-[#688176]">{description}</span><span className="mt-3 block text-[11px] leading-5 text-[#7b8d83]">{detail}</span></span>
            <ArrowRight size={18} className="mt-1 shrink-0 text-[#50765f] transition-transform group-hover:translate-x-1"/>
          </button>;
        })}
      </div>
      <p className="mt-6 border-t border-[#e5ebe5] pt-4 text-xs leading-5 text-[#7b8d83]">You can switch practices at any time from the top of your dashboard.</p>
    </div>
  </dialog>;
}
