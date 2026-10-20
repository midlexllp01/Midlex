"use client";
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { RETAINER_NOTICE, RETAINER_PLANS, RetainerPlan, formatNaira } from '@/lib/retainerPlans';

export default function GeneralRetainerOverview() {
  const [cases, setCases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('individual');
  const selectedPlan = RETAINER_PLANS.find((plan) => plan.id === selectedPlanId) || RETAINER_PLANS[0];

  useEffect(() => {
    const savedPlan = typeof window !== 'undefined' ? localStorage.getItem('midlex_retainer_plan') : null;
    if (savedPlan && RETAINER_PLANS.some((plan) => plan.id === savedPlan)) setSelectedPlanId(savedPlan);
    Promise.all([
      apiFetch('/cases/my-cases').catch(() => []),
      apiFetch('/payments/my-payments').catch(() => []),
    ]).then(([caseData, paymentData]) => {
      setCases(Array.isArray(caseData) ? caseData.filter((item) => String(item.category || '').toUpperCase() === 'GENERAL') : []);
      setPayments(Array.isArray(paymentData) ? paymentData : []);
    });
  }, []);

  const pendingClaims = cases.filter((item) => !['CLOSED', 'RESOLVED', 'COMPLETED'].includes(String(item.status || '').toUpperCase())).length;
  const outstandingPayments = payments.filter((item) => !['PAID', 'SUCCESS', 'COMPLETED'].includes(String(item.status || '').toUpperCase())).length;
  const savePlan = (plan: RetainerPlan) => {
    setSelectedPlanId(plan.id);
    localStorage.setItem('midlex_retainer_plan', plan.id);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] bg-gradient-to-br from-[#173d27] via-[#1f5b37] to-[#a87835] p-8 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <span className="rounded-full border border-amber-200/40 bg-amber-100/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">Midlex Royalty</span>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Your General Retainer Portal</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/80">Manage your retainer protection, beneficiaries, advisory requests, payments and general legal claims from one workspace.</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-black/15 p-5 text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-100">Preferred plan</p>
            <p className="mt-2 text-xl font-black">{selectedPlan.name}</p>
            <p className="mt-1 text-xs text-white/70">{selectedPlan.duration}</p>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-amber-100/20 bg-white/10 p-4 text-xs leading-5 text-amber-50">{RETAINER_NOTICE}</div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard/profile#security" className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-white">🔒 Change Password</Link>
          <Link href="/dashboard/cases/new?category=GENERAL&subCategory=General%20Legal%20Advisory" className="rounded-xl bg-amber-400 px-5 py-3 text-xs font-black uppercase tracking-wider text-[#173d27]">Submit retainer claim</Link>
          <Link href="/dashboard/payments" className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-xs font-black uppercase tracking-wider text-white">View payments</Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[['Retainer claims', cases.length, 'General matters submitted'], ['Open claims', pendingClaims, 'Awaiting resolution'], ['Payment records', payments.length, 'Retainer transactions'], ['Outstanding items', outstandingPayments, 'Require payment attention']].map(([label, value, hint]) => (
          <div key={String(label)} className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p><p className="mt-3 text-3xl font-black text-[#173d27]">{value}</p><p className="mt-1 text-xs text-gray-500">{hint}</p></div>
        ))}
      </div>

      <section className="rounded-[32px] border border-gray-100 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#a87835]">Choose your protection</p><h2 className="mt-2 text-2xl font-black text-[#173d27]">Retainer plans</h2></div><p className="max-w-md text-right text-xs leading-5 text-gray-500">Save a preferred plan for onboarding. This does not activate cover until payment and the signed onboarding terms are completed.</p></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{RETAINER_PLANS.map((plan) => <button key={plan.id} onClick={() => savePlan(plan)} className={`text-left rounded-2xl border p-5 transition ${selectedPlan.id === plan.id ? 'border-[#a87835] bg-amber-50 ring-2 ring-amber-200' : 'border-gray-100 hover:border-amber-200'}`}><div className="flex items-start justify-between gap-3"><h3 className="font-black text-[#173d27]">{plan.name}</h3>{selectedPlan.id === plan.id && <span className="text-[10px] font-black uppercase text-[#a87835]">Selected</span>}</div><p className="mt-2 text-xs font-bold text-[#a87835]">{plan.duration}</p><p className="mt-3 text-xs leading-5 text-gray-500">{plan.summary}</p></button>)}</div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-[32px] border border-gray-100 bg-white p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#a87835]">Plan detail</p><h2 className="mt-2 text-2xl font-black text-[#173d27]">{selectedPlan.name}</h2><p className="mt-1 text-xs text-gray-500">{selectedPlan.audience} · {selectedPlan.duration}</p></div><span className="rounded-full bg-[#173d27] px-3 py-1 text-[10px] font-black uppercase text-white">Retainer</span></div><p className="mt-5 text-sm leading-6 text-gray-600">{selectedPlan.summary}</p><div className="mt-6 grid gap-6 md:grid-cols-2"><div><h3 className="font-black text-[#173d27]">What we cover</h3><ul className="mt-3 space-y-2 text-xs leading-5 text-gray-600">{selectedPlan.coverage.map((item) => <li key={item}>✓ {item}</li>)}</ul></div><div><h3 className="font-black text-[#173d27]">What we do not cover</h3><ul className="mt-3 space-y-2 text-xs leading-5 text-gray-600">{selectedPlan.exclusions.map((item) => <li key={item}>• {item}</li>)}</ul></div></div><div className="mt-6 flex flex-wrap gap-2">{selectedPlan.discounts.map((item) => <span key={item} className="rounded-full bg-amber-50 px-3 py-2 text-[11px] font-bold text-[#8a6428]">{item}</span>)}</div></div>
        <div className="rounded-[32px] bg-[#173d27] p-6 text-white sm:p-8"><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Brochure schedule</p><h2 className="mt-2 text-2xl font-black">Payment options</h2><div className="mt-6 space-y-3">{selectedPlan.schedules.map((schedule) => <div key={schedule.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4"><div><p className="text-sm font-bold">{schedule.label}</p>{schedule.total ? <p className="mt-1 text-[11px] text-white/60">Total: {formatNaira(schedule.total)}</p> : null}</div><p className="text-lg font-black text-amber-300">{formatNaira(schedule.amount)}</p></div>)}</div><p className="mt-5 text-[11px] leading-5 text-white/60">Amounts shown are transcribed from the supplied brochure and remain subject to the executed retainer agreement.</p></div>
      </section>

      <section className="rounded-[32px] border border-gray-100 bg-white p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#a87835]">Your activity</p><h2 className="mt-2 text-2xl font-black text-[#173d27]">Retainer claims</h2></div><Link href="/dashboard/cases/new?category=GENERAL&subCategory=General%20Legal%20Advisory" className="rounded-xl bg-[#173d27] px-4 py-3 text-xs font-black uppercase tracking-wider text-white">New claim</Link></div><div className="mt-6 space-y-3">{cases.length ? cases.slice(0, 5).map((item) => <Link href={`/dashboard/cases/${item.id}`} key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 p-4 hover:border-amber-300"><div><p className="font-bold text-[#173d27]">{item.title || 'General legal request'}</p><p className="mt-1 text-xs text-gray-500">{item.subCategory || 'Retainer matter'}</p><p className="mt-1 text-[11px] font-bold text-[#8a6428]">Team: {item.litigationTeam || item.lawyer?.name || 'Awaiting admin allocation'}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase text-[#8a6428]">{item.status || 'Pending'}</span></Link>) : <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">No general retainer claims yet. Submit your first request when you need legal support.</div>}</div></section>

      <section className="rounded-[32px] border border-amber-200 bg-amber-50 p-6 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a6428]">Start-up option</p><h2 className="mt-2 text-2xl font-black text-[#173d27]">Equity Premium Retainer</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Eligible corporate start-ups may explore a cash-free arrangement involving a 10% equity allocation, with governance and service rights documented in a separate agreement.</p></div><button onClick={() => savePlan(RETAINER_PLANS.find((plan) => plan.id === 'equity-premium')!)} className="rounded-xl bg-[#a87835] px-5 py-3 text-xs font-black uppercase tracking-wider text-white">Explore option</button></div></section>
    </div>
  );
}
