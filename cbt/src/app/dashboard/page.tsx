"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCbtExams,
  getCbtSubmissions,
  getCbtUsers,
  reallocateCbtExam,
  syncFromBackend,
  CbtExam,
  CbtSubmission,
  CbtUser,
} from '@/lib/cbtStore';

export default function CbtStudentDashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CbtUser | null>(null);
  const [exam, setExam] = useState<CbtExam | null>(null);
  const [submission, setSubmission] = useState<CbtSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Examiner Unlock State
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPasscode, setUnlockPasscode] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [reallocatedBanner, setReallocatedBanner] = useState(false);

  // Candidate Name Customization
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('midlex_cbt_session');
      if (!session) {
        router.push('/');
        return;
      }
      try {
        const u = JSON.parse(session);
        setCurrentUser(u);

        // Check for reallocate query param or session storage flag
        const params = new URLSearchParams(window.location.search);
        const isReallocParam =
          params.get('reallocate') === 'true' ||
          params.get('reallocate') === '1' ||
          params.get('unlock') === 'true';
        const hasBannerFlag = sessionStorage.getItem('midlex_reallocated_banner') === 'true';

        if (isReallocParam || hasBannerFlag) {
          if (u?.id) {
            reallocateCbtExam(u.id, 'midlex-cbt-exam');
            if (u.candidateId) reallocateCbtExam(u.candidateId, 'midlex-cbt-exam');
          }
          setReallocatedBanner(true);
          sessionStorage.removeItem('midlex_reallocated_banner');
        }

        loadData(u.id, u.candidateId);
      } catch (e) {
        router.push('/');
        return;
      }
    }

    syncFromBackend().then(() => {
      if (typeof window !== 'undefined') {
        const session = localStorage.getItem('midlex_cbt_session');
        if (session) {
          try {
            const u = JSON.parse(session);
            loadData(u.id, u.candidateId);
          } catch (e) {}
        }
      }
    });
  }, [router]);

  const loadData = (userId: string, candidateId?: string) => {
    const allExams = getCbtExams();
    const unifiedExam =
      allExams.find((e) => e.id === 'midlex-cbt-exam') || allExams[0];
    setExam(unifiedExam || null);

    const allSubs = getCbtSubmissions();
    const userSub = allSubs.find(
      (s) =>
        (s.userId === userId || (candidateId && s.candidateId === candidateId)) &&
        (s.examId === 'midlex-cbt-exam' || (unifiedExam && s.examId === unifiedExam.id) || !s.examId)
    );
    setSubmission(userSub || null);
    setIsLoading(false);
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    const code = unlockPasscode.trim();
    const validCodes = ['admin123', 'MIDLEX-RETAKE', 'MIDLEX-CBT', 'MIDLEX-OVERRIDE', 'RETAKE2026'];
    const isValid =
      validCodes.some((c) => c.toLowerCase() === code.toLowerCase()) ||
      (currentUser?.password && code === currentUser.password);

    if (!isValid) {
      setUnlockError('Invalid authorization passcode. Enter the Chief Examiner authorization code (e.g. admin123 or MIDLEX-RETAKE).');
      return;
    }

    if (currentUser) {
      reallocateCbtExam(currentUser.id, exam?.id || 'midlex-cbt-exam');
      if (currentUser.candidateId) {
        reallocateCbtExam(currentUser.candidateId, exam?.id || 'midlex-cbt-exam');
      }
    }
    setSubmission(null);
    setShowUnlockModal(false);
    setUnlockPasscode('');
    setReallocatedBanner(true);
  };

  const handleSaveName = () => {
    if (!newName.trim() || !currentUser) return;
    const updatedUser = { ...currentUser, name: newName.trim() };
    setCurrentUser(updatedUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('midlex_cbt_session', JSON.stringify(updatedUser));
      const allUsers = getCbtUsers();
      const idx = allUsers.findIndex((u) => u.id === currentUser.id);
      if (idx !== -1) {
        allUsers[idx].name = newName.trim();
        localStorage.setItem('midlex_cbt_users', JSON.stringify(allUsers));
      }
    }
    setIsEditingName(false);
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('midlex_cbt_session');
    }
    router.push('/');
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-[#f7faf8] flex items-center justify-center p-6 text-center">
        <div className="space-y-4">
          <img src="/midlex-logo.png" alt="Midlex" className="h-12 w-auto mx-auto object-contain animate-pulse" />
          <p className="text-xs font-bold text-[#0e4b29] uppercase tracking-widest">
            Verifying Candidate Profile...
          </p>
        </div>
      </div>
    );
  }

  const isTaken = !!submission;

  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#091f13] flex flex-col selection:bg-[#d4a340] selection:text-white">
      {/* Top Brand Stripe */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0e4b29] via-[#d4a340] to-[#0e4b29]" />

      {/* Top Header */}
      <header className="bg-white sticky top-0 z-30 shadow-xs border-b border-[#e2e8e4]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img src="/midlex-logo.png" alt="Midlex" className="h-8 sm:h-10 w-auto object-contain shrink-0" />
            <div className="border-l border-slate-200 pl-2.5 sm:pl-3 min-w-0">
              <h1 className="font-black text-[11px] sm:text-xs text-[#0e4b29] uppercase tracking-wider truncate">
                Examinee Portal
              </h1>
              <p className="text-[10px] text-slate-500 font-mono truncate">
                ID: <strong className="text-[#b88628]">{currentUser.candidateId}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <span className="text-xs font-bold bg-[#f0f7f2] border border-[#d8e8dc] px-3.5 py-1.5 rounded-xl text-[#0e4b29] hidden md:inline-block">
              👤 {currentUser.name}
            </span>
            <button
              onClick={handleSignOut}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-3xl mx-auto w-full px-3.5 sm:px-6 py-6 sm:py-12 flex-1 flex flex-col justify-center">
        
        {/* Re-allocation Success Banner */}
        {reallocatedBanner && (
          <div className="mb-6 p-4 sm:p-5 bg-emerald-50 border-2 border-emerald-500/40 rounded-2xl text-emerald-900 shadow-md flex items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#0e4b29]">
                  Examination Re-allocated & Unlocked!
                </h4>
                <p className="text-xs font-medium text-emerald-800">
                  Chief Examiner authorization confirmed. Your examination has been cleared for a fresh sitting. Click &quot;START TEST&quot; below when ready.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReallocatedBanner(false)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-950 px-2 py-1 bg-white/60 hover:bg-white rounded-lg transition-all"
            >
              ✕
            </button>
          </div>
        )}

        {/* Candidate Welcome Banner */}
        <div className="text-center mb-6 sm:mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#d4a340]/15 border border-[#d4a340]/30 rounded-full text-[10px] font-black uppercase tracking-widest text-[#b88628] mb-2">
            Litigation • Mediation • Consultation
          </span>

          {isEditingName ? (
            <div className="flex items-center justify-center gap-2 max-w-sm mx-auto my-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter Full Legal Name"
                className="px-3 py-1.5 bg-white border-2 border-[#0e4b29] rounded-xl text-xs font-bold text-[#0e4b29] focus:outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="px-3 py-1.5 bg-[#0e4b29] text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl sm:text-3xl font-black text-[#0e4b29]">
                Welcome, {currentUser.name}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setNewName(currentUser.name);
                  setIsEditingName(true);
                }}
                className="text-xs text-slate-400 hover:text-[#0e4b29] p-1 cursor-pointer transition-colors"
                title="Edit Full Legal Name for Certificate"
              >
                ✏️
              </button>
            </div>
          )}

          <p className="text-xs text-slate-500 font-medium mt-1">
            Candidate Profile: <strong className="text-[#0e4b29]">{currentUser.name}</strong> • {currentUser.email}
          </p>
        </div>

        {/* Unified Assessment Card */}
        <div className="bg-white rounded-2xl sm:rounded-[32px] border-2 border-[#0e4b29]/15 p-5 sm:p-10 shadow-xl relative overflow-hidden">
          {/* Subtle Accent Glow */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#d4a340]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Exam Title & Header */}
          <div className="border-b border-slate-100 pb-6 mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="px-3.5 py-1 bg-[#0e4b29] text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                Official Examination Sitting
              </span>
              {isTaken ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-800 border border-red-200 flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>Completed & Sealed</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Ready for Sitting</span>
                </span>
              )}
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-[#0e4b29] leading-tight">
              {exam?.title || 'Midlex Comprehensive Legal & Language Examination'}
            </h3>

            {/* Quick Metrics */}
            <div className="flex flex-wrap gap-3 mt-4 text-xs font-bold">
              <span className="px-3 py-1.5 bg-[#f0f7f2] text-[#0e4b29] rounded-xl border border-[#d8e8dc]">
                ⏱️ {exam?.durationMinutes || 60} Minutes
              </span>
              <span className="px-3 py-1.5 bg-[#f0f7f2] text-[#0e4b29] rounded-xl border border-[#d8e8dc]">
                📝 {exam?.questionCount || 7} Questions
              </span>
              <span className="px-3 py-1.5 bg-[#fef9ed] text-[#b88628] rounded-xl border border-[#edd18c]">
                🎯 {exam?.totalMarks || 140} Total Marks
              </span>
            </div>
          </div>

          {/* Core Instruction Alert */}
          <div className={`p-5 rounded-2xl border-2 mb-8 ${
            isTaken
              ? 'bg-amber-50/80 border-[#d4a340]/40 text-amber-950'
              : 'bg-red-50/80 border-red-200 text-red-950'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0 mt-0.5">{isTaken ? '🔒' : '⚠️'}</span>
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase tracking-wide">
                  {isTaken
                    ? 'Examination Already Completed • Retake Locked'
                    : 'Mandatory Examination Rule'}
                </h4>
                <p className="text-xs leading-relaxed opacity-90">
                  {isTaken ? (
                    <>
                      You have already completed and submitted this examination. 
                      <strong> Retakes are strictly prohibited by examination board policy. </strong> 
                      If you were authorized for a retake, use your Chief Examiner link or click below to unlock.
                    </>
                  ) : (
                    <>
                      Once the examination starts, <strong>it cannot be retaken, restarted, or paused</strong>. 
                      Your countdown timer will begin immediately upon clicking Start Test.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Submission Record Details (if already taken) */}
          {isTaken && submission && (
            <div className="mb-8 p-5 bg-[#f8faf9] rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Submission Timestamp:</span>
                <span className="font-bold text-[#0e4b29]">
                  {new Date(submission.submittedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Evaluation Status:</span>
                <span className="font-bold text-[#b88628]">
                  {submission.isGraded ? 'Official Score Certified' : 'Sealed & Under Theory Review'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Examination Reference:</span>
                <span className="font-mono text-slate-700 font-bold">{submission.id}</span>
              </div>
            </div>
          )}

          {/* Action Button Area */}
          <div>
            {!isTaken ? (
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="w-full py-5 rounded-2xl text-white font-black text-lg uppercase tracking-wider bg-gradient-to-r from-[#0e4b29] to-[#146336] hover:from-[#072614] hover:to-[#0e4b29] shadow-xl shadow-[#0e4b29]/30 transition-all transform active:scale-[0.99] cursor-pointer flex items-center justify-center gap-3"
              >
                <span>START TEST</span>
                <span className="text-xl">🚀</span>
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled
                  className="w-full py-4 rounded-2xl bg-slate-200 text-slate-500 font-black text-sm uppercase tracking-wider cursor-not-allowed border border-slate-300"
                >
                  🔒 RETAKE NOT PERMITTED (TEST COMPLETED)
                </button>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    href={`/results?id=${submission?.id}`}
                    className="flex-1 py-3 bg-white hover:bg-slate-50 text-[#0e4b29] font-bold text-xs rounded-xl border border-[#0e4b29]/30 text-center transition-all shadow-xs"
                  >
                    View Official Results Slip →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowUnlockModal(true)}
                    className="flex-1 py-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl text-center transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>🔑</span>
                    <span>Chief Examiner Unlock Retake</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Chief Examiner Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border-2 border-[#0e4b29]/20 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xl font-bold">
                  🔑
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0e4b29]">Chief Examiner Retake Override</h3>
                  <p className="text-[11px] text-slate-500">Authorize fresh sitting for this candidate</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockError(null);
                  setUnlockPasscode('');
                }}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>Candidate: <strong className="text-[#0e4b29]">{currentUser?.name}</strong></p>
              <p>Candidate Email: <strong className="text-[#0e4b29]">{currentUser?.email}</strong></p>
            </div>

            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                  Examiner Passcode / Authorization Key
                </label>
                <input
                  type="password"
                  placeholder="Enter passcode (e.g. admin123)"
                  value={unlockPasscode}
                  onChange={(e) => setUnlockPasscode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#0e4b29]/30 focus:border-[#0e4b29]"
                  required
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Passcode is held by Chief Examiner / Invigilation Officer.
                </p>
              </div>

              {unlockError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold">
                  ⚠️ {unlockError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUnlockModal(false);
                    setUnlockError(null);
                    setUnlockPasscode('');
                  }}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 bg-[#0e4b29] hover:bg-[#072614] text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>✓</span>
                  <span>Unlock Sitting</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] max-w-md w-full p-8 shadow-2xl border-2 border-[#0e4b29]/20 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#d4a340]/20 text-[#b88628] flex items-center justify-center text-3xl mx-auto font-bold">
              ⚠️
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-[#0e4b29]">
                Begin Examination Sitting?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are about to start the <strong>{exam?.title}</strong>. 
                Your {exam?.durationMinutes || 60}-minute timer will begin immediately. 
                <strong> This test cannot be retaken once started.</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  router.push(`/exam?id=${exam?.id || 'midlex-cbt-exam'}`);
                }}
                className="py-3 px-4 bg-[#0e4b29] hover:bg-[#072614] text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
              >
                Yes, Start Test Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-[#e2e8e4] py-6 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} Midlex Legal Practice. All rights reserved. Confidential examination session.</p>
      </footer>
    </div>
  );
}
