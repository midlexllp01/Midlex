"use client";
import React from 'react';
import { Calendar, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface MonthPickerFilterProps {
  selectedMonth: string; // "YYYY-MM" or "ALL"
  onChange: (month: string) => void;
  className?: string;
  totalCount?: number;
  countLabel?: string;
  compact?: boolean;
}

export function getCurrentMonthStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function formatMonthDisplay(monthStr: string): string {
  if (monthStr === 'ALL') return 'All Recorded Months';
  const [y, m] = monthStr.split('-');
  if (!y || !m) return monthStr;
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function isItemInMonth(itemDateStr?: string | Date | null, targetMonth?: string): boolean {
  if (!targetMonth || targetMonth === 'ALL') return true;
  if (!itemDateStr) return false;
  
  try {
    const dStr = typeof itemDateStr === 'string' ? itemDateStr : new Date(itemDateStr).toISOString();
    return dStr.startsWith(targetMonth);
  } catch {
    return false;
  }
}

export default function MonthPickerFilter({
  selectedMonth,
  onChange,
  className = '',
  totalCount,
  countLabel = 'items',
  compact = false,
}: MonthPickerFilterProps) {
  const currentMonth = getCurrentMonthStr();

  const handlePrevMonth = () => {
    if (selectedMonth === 'ALL') {
      onChange(currentMonth);
      return;
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    let prevY = y;
    let prevM = m - 1;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    const monthStr = `${prevY}-${String(prevM).padStart(2, '0')}`;
    onChange(monthStr);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'ALL') {
      onChange(currentMonth);
      return;
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    let nextY = y;
    let nextM = m + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const monthStr = `${nextY}-${String(nextM).padStart(2, '0')}`;
    onChange(monthStr);
  };

  if (compact) {
    return (
      <div className={`flex flex-col gap-4 rounded-2xl border border-[#dce6df] bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between ${className}`}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf1e7] text-[#23533e]">
            <Calendar size={19} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#688176]">Case period</p>
            <p className="truncate text-sm font-semibold text-[#173e34]">{formatMonthDisplay(selectedMonth)}</p>
          </div>
          {typeof totalCount === 'number' && (
            <span className="ml-1 rounded-full bg-[#eaf1e7] px-2.5 py-1 text-xs font-semibold text-[#23533e]">
              {totalCount} {countLabel}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handlePrevMonth} aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce6df] text-[#23533e] hover:bg-[#f0f6ed]"><ChevronLeft size={17} /></button>
          <input
            type="month"
            aria-label="Choose case month"
            value={selectedMonth === 'ALL' ? '' : selectedMonth}
            onChange={(event) => event.target.value && onChange(event.target.value)}
            className="h-10 rounded-xl border border-[#dce6df] bg-white px-3 text-sm font-medium text-[#173e34] outline-none focus-visible:border-[#1c5945]"
          />
          <button type="button" onClick={handleNextMonth} aria-label="Next month" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce6df] text-[#23533e] hover:bg-[#f0f6ed]"><ChevronRight size={17} /></button>
          <button type="button" onClick={() => onChange(currentMonth)} className={`h-10 rounded-xl px-3 text-xs font-semibold ${selectedMonth === currentMonth ? 'bg-[#1c5945] text-white' : 'border border-[#dce6df] text-[#23533e] hover:bg-[#f0f6ed]'}`}>This month</button>
          <button type="button" onClick={() => onChange('ALL')} className={`h-10 rounded-xl px-3 text-xs font-semibold ${selectedMonth === 'ALL' ? 'bg-[#1c5945] text-white' : 'border border-[#dce6df] text-[#23533e] hover:bg-[#f0f6ed]'}`}>All months</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 rounded-2xl border border-[#dce6df] bg-white p-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Status Label */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf1e7] text-[#23533e]">
            <Calendar size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#688176]">
                Filter by month
              </span>
              {selectedMonth === currentMonth && (
                <span className="rounded-full bg-[#eaf1e7] px-2 py-0.5 text-[10px] font-semibold text-[#23533e]">
                  Current month
                </span>
              )}
            </div>
            <h4 className="mt-1 text-base font-semibold text-[#173e34]">
              {formatMonthDisplay(selectedMonth)}
            </h4>
          </div>
        </div>

        {/* Right Date Time Picker & Control Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Nav Controls */}
          <button
            onClick={handlePrevMonth}
            title="Previous Month"
            className="flex items-center gap-1 rounded-xl border border-[#dce6df] p-2.5 text-xs font-semibold text-[#23533e] transition-colors hover:bg-[#f0f6ed]"
          >
            <ChevronLeft size={16} />
            <span className="hidden md:inline">Prev Month</span>
          </button>

          {/* HTML5 Native Month Picker Input */}
          <div className="relative">
            <input
              type="month"
              value={selectedMonth === 'ALL' ? '' : selectedMonth}
              onChange={(e) => {
                if (e.target.value) {
                  onChange(e.target.value);
                }
              }}
              className="cursor-pointer rounded-xl border border-[#dce6df] bg-white px-3 py-2 text-xs font-semibold text-[#173e34] outline-none focus-visible:border-[#1c5945]"
              title="Select Month/Year"
            />
          </div>

          <button
            onClick={handleNextMonth}
            title="Next Month"
            className="flex items-center gap-1 rounded-xl border border-[#dce6df] p-2.5 text-xs font-semibold text-[#23533e] transition-colors hover:bg-[#f0f6ed]"
          >
            <span className="hidden md:inline">Next Month</span>
            <ChevronRight size={16} />
          </button>

          {/* Current Month Quick Button */}
          <button
            onClick={() => onChange(currentMonth)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedMonth === currentMonth
                ? 'border-[#23533e] bg-[#23533e] text-white'
                : 'border-[#dce6df] bg-white text-[#23533e] hover:bg-[#f0f6ed]'
            }`}
          >
            Reset to Current Month
          </button>

          {/* All Months Button */}
          <button
            onClick={() => onChange('ALL')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedMonth === 'ALL'
                ? 'border-[#23533e] bg-[#23533e] text-white'
                : 'border-[#dce6df] bg-white text-[#23533e] hover:bg-[#f0f6ed]'
            }`}
          >
            All Months
          </button>
        </div>
      </div>

      {/* Summary Footer */}
      {typeof totalCount === 'number' && (
        <div className="flex items-center justify-between border-t border-[#e5ebe5] pt-3 text-xs font-medium text-[#688176]">
          <span>
            Showing records for <strong className="font-semibold text-[#173e34]">{formatMonthDisplay(selectedMonth)}</strong>
          </span>
          <span className="rounded-lg bg-[#eaf1e7] px-2.5 py-1 font-semibold text-[#23533e]">
            {totalCount} {countLabel} recorded
          </span>
        </div>
      )}
    </div>
  );
}
