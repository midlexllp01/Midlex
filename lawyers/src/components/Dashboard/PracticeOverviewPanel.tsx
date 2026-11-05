"use client";

import { ArrowRight, Building2, Scale } from 'lucide-react';
import type { PracticeDepartment } from './AdminDepartmentModal';

export default function PracticeOverviewPanel({
  currentDept,
  onSwitch,
  role,
}: {
  currentDept: PracticeDepartment | null;
  onSwitch: () => void;
  role: 'admin' | 'lawyer';
}) {
  const isLitigation = currentDept === 'LITIGATION';
  const Icon = isLitigation ? Scale : Building2;
  const title = currentDept === 'LITIGATION' ? 'Litigation' : currentDept === 'GENERAL' ? 'General & Property' : 'Choose a practice';
  const description = !currentDept
    ? 'Select the matters you want to manage.'
    : isLitigation
    ? role === 'admin'
      ? 'Court matters, hearing dates and counsel assignments in one view.'
      : 'Your court matters, hearing dates and assigned litigation work.'
    : role === 'admin'
      ? 'Retainers, property matters and legal advisory in one view.'
      : 'Your retainers, property matters and advisory work.';

  return (
    <section className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-[#dce6df] bg-[#f4f8f2] p-6 sm:p-8">
      <div className="flex min-w-0 items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e3eee0] text-[#23533e]">
          <Icon size={24} strokeWidth={1.6} />
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#688176]">Practice workspace</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#173e34]">{title}</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[#587267]">{description}</p>
        </div>
      </div>
      <button type="button" onClick={onSwitch} className="inline-flex items-center gap-2 rounded-xl border border-[#b9cfbf] bg-white px-4 py-2.5 text-sm font-semibold text-[#23533e] transition-colors hover:bg-[#eaf3e7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c5945]">
        Switch practice <ArrowRight size={16} />
      </button>
    </section>
  );
}
