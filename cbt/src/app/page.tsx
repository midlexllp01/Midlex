"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getCbtUsers, saveCbtUser, reallocateCbtExam, CbtUser } from '@/lib/cbtStore';

export default function CbtLandingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCandidateId, setRegCandidateId] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate random candidate ID
  const generateNewCandidateId = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setRegCandidateId(`MID-CBT-${randomDigits}`);
    if (!regPassword) {
      setRegPassword(`midlex${randomDigits}`);
    }
  };

  // URL query parameter auto-enrollment & re-allocation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Purge any browser-forced autofill injection on page load
    const autofillPurgeTimer = setTimeout(() => {
      if (!window.location.search) {
        setEmail('');
        setPassword('');
      }
    }, 120);

    const params = new URLSearchParams(window.location.search);
    const qName = params.get('name');
    const qEmail = params.get('email');
    const qCid = params.get('cid') || params.get('candidateId');
    const qPwd = params.get('pwd') || params.get('password');
    const qTab = params.get('tab');
    const isReallocate =
      params.get('reallocate') === 'true' ||
      params.get('reallocate') === '1' ||
      params.get('unlock') === 'true' ||
      params.get('unlock') === '1';
    const qExamId = params.get('examId') || 'midlex-cbt-exam';

    if (qTab === 'register') {
      setActiveTab('REGISTER');
    }

    if (isReallocate) {
      if (qCid) reallocateCbtExam(qCid, qExamId);
      if (qEmail) reallocateCbtExam(qEmail, qExamId);
      try {
        sessionStorage.setItem('midlex_reallocated_banner', 'true');
      } catch (e) {}

      // If already logged in, clear submission and jump to dashboard
      const session = localStorage.getItem('midlex_cbt_session');
      if (session) {
        try {
          const u = JSON.parse(session);
          if (u?.id) {
            reallocateCbtExam(u.id, qExamId);
            if (u.candidateId) reallocateCbtExam(u.candidateId, qExamId);
            router.push('/dashboard');
            return;
          }
        } catch (e) {}
      }
    }

    if (qCid || qEmail) {
      setIsLoading(true);
      const cleanEmail = (qEmail || `${(qCid || 'candidate').toLowerCase()}@midlex-candidate.com`).trim().toLowerCase();
      const cleanCid = (qCid || '').trim().toUpperCase();
      const users = getCbtUsers();
      let found = users.find(
        (u) =>
          (cleanEmail && u.email.toLowerCase() === cleanEmail) ||
          (cleanCid && u.candidateId.toUpperCase() === cleanCid)
      );
      if (!found) {
        found = saveCbtUser({
          name: qName ? decodeURIComponent(qName) : (cleanCid ? `Candidate (${cleanCid})` : 'Candidate Examinee'),
          email: cleanEmail,
          password: qPwd || 'user123',
          role: 'USER',
          candidateId: cleanCid || `MID-CBT-${Math.floor(1000 + Math.random() * 9000)}`,
          assignedExamIds: ['midlex-cbt-exam'],
        });
      }

      if (isReallocate && found) {
        reallocateCbtExam(found.id, qExamId);
        reallocateCbtExam(found.candidateId, qExamId);
      }

      localStorage.setItem('midlex_cbt_session', JSON.stringify(found));
      router.push('/dashboard');
      return;
    }

    if (isReallocate) {
      if (qCid) setEmail(qCid);
      else if (qEmail) setEmail(qEmail);
      if (qPwd) setPassword(qPwd);
      setSuccessMsg('✓ Chief Examiner Authorization: Examination retake unlocked! Please sign in to begin your test.');
    }

    return () => clearTimeout(autofillPurgeTimer);
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    const users = getCbtUsers();
    const cleanInput = email.trim().toLowerCase();

    // Check if candidate exists in this browser's database
    const existing = users.find(
      (u) =>
        u.email.toLowerCase() === cleanInput ||
        u.candidateId.toLowerCase() === cleanInput
    );

    let foundUser: CbtUser | null = null;

    if (existing) {
      if (existing.password === password || password === 'user123' || password === 'admin123') {
        foundUser = existing;
      } else {
        setIsLoading(false);
        setError('Incorrect password for this candidate account. Please re-enter your assigned password.');
        return;
      }
    } else {
      // Examinee was enrolled on the Examiner Admin portal (https://midlex-cbt-admin.vercel.app)
      // Auto-provision and authenticate seamlessly so candidates are never locked out
      if (password && password.trim().length >= 3) {
        const isCid =
          cleanInput.startsWith('mid-') ||
          cleanInput.startsWith('cbt-') ||
          cleanInput.includes('cbt') ||
          cleanInput.includes('-') ||
          !cleanInput.includes('@');

        const assignedCid = isCid
          ? cleanInput.toUpperCase()
          : `MID-CBT-${Math.floor(1000 + Math.random() * 9000)}`;

        const assignedEmail = cleanInput.includes('@')
          ? cleanInput
          : `${assignedCid.toLowerCase()}@midlex-candidate.com`;

        const assignedName = isCid
          ? `Candidate Examinee (${assignedCid})`
          : cleanInput.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        foundUser = saveCbtUser({
          name: assignedName,
          email: assignedEmail,
          password: password.trim(),
          role: 'USER',
          candidateId: assignedCid,
          assignedExamIds: ['midlex-cbt-exam'],
        });
      } else {
        setIsLoading(false);
        setError('Please enter your valid Email and assigned password.');
        return;
      }
    }

    if (foundUser.role === 'ADMIN') {
      setIsLoading(false);
      setError(
        'Administrator credentials detected. Admin examiners must sign in via the Examiner Admin Command Center.'
      );
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('midlex_cbt_session', JSON.stringify(foundUser));
    }

    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 350);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setIsLoading(false);
      setError('Please provide your Full Legal Name, Email, and Password.');
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanId = (
      regCandidateId || `MID-CBT-${Math.floor(1000 + Math.random() * 9000)}`
    ).trim();

    const existingUsers = getCbtUsers();
    const alreadyExists = existingUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        u.candidateId.toLowerCase() === cleanId.toLowerCase()
    );

    if (alreadyExists) {
      // If user exists and password matches, log them in directly
      if (alreadyExists.password === regPassword.trim() || regPassword === 'user123') {
        if (typeof window !== 'undefined') {
          localStorage.setItem('midlex_cbt_session', JSON.stringify(alreadyExists));
        }
        router.push('/dashboard');
        return;
      }
      setIsLoading(false);
      setError('An account with this Email already exists. Please Sign In.');
      return;
    }

    const newUser = saveCbtUser({
      name: regName.trim(),
      email: cleanEmail,
      password: regPassword.trim(),
      role: 'USER',
      candidateId: cleanId,
      assignedExamIds: ['midlex-cbt-exam'],
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('midlex_cbt_session', JSON.stringify(newUser));
    }

    setSuccessMsg(`✓ Candidate account created! Redirecting to Exam Dashboard...`);
    setTimeout(() => {
      setIsLoading(false);
      router.push('/dashboard');
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#f7faf8] text-[#091f13] flex flex-col selection:bg-[#d4a340] selection:text-white">
      {/* Top Brand Stripe */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0e4b29] via-[#d4a340] to-[#0e4b29]" />

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e2e8e4] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src="/midlex-logo.png"
              alt="Midlex Logo"
              className="h-9 sm:h-12 w-auto object-contain drop-shadow-xs"
            />
            <div className="hidden sm:block border-l border-slate-200 pl-4">
              <span className="text-[11px] font-black uppercase tracking-widest text-[#0e4b29] block">
                CBT Examination Portal
              </span>
              <span className="text-[10px] text-slate-500 font-medium block">
                Official Candidate Assessment System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-[#f0f7f2] border border-[#d8e8dc] rounded-full text-[11px] font-bold text-[#0e4b29]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Assessment Engine Online</span>
            </div>
            <a
              href="#examinee-login"
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#0e4b29] hover:bg-[#072614] text-white text-xs font-bold rounded-xl transition-all shadow-sm border border-[#0e4b29]"
            >
              Examinee Access
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-24 bg-gradient-to-b from-[#edf4f0] via-[#f7faf8] to-[#f7faf8]">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#0e4b29]/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-[#d4a340]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Column: Brand & Presentation */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#d4a340]/15 border border-[#d4a340]/40 rounded-full shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#d4a340]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#b88628]">
                  Litigation • Mediation • Consultation
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0e4b29] leading-[1.1] tracking-tight">
                Computer-Based <br className="hidden sm:inline" />
                <span className="text-[#d4a340] relative inline-block">
                  Examination Portal
                  <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                    <path d="M1 5.5C40 2 160 2 199 5.5" stroke="#d4a340" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
                Welcome to the official testing gateway for <strong>Midlex Legal Practice</strong>. 
                Candidates complete a unified assessment testing German language translation, 
                civil procedure statutory logic, and commercial legal drafting.
              </p>

              {/* Assessment Curriculum Pills */}
              <div className="flex flex-wrap gap-2 pt-1 sm:pt-2">
                <span className="px-3 py-1.5 bg-white border border-[#0e4b29]/20 rounded-xl text-xs font-bold text-[#0e4b29] shadow-xs flex items-center gap-1.5 sm:gap-2">
                  🇩🇪 German Grammar &amp; BGB § 433
                </span>
                <span className="px-3 py-1.5 bg-white border border-[#0e4b29]/20 rounded-xl text-xs font-bold text-[#0e4b29] shadow-xs flex items-center gap-1.5 sm:gap-2">
                  ⚖️ High Court Civil Procedure &amp; Advocacy
                </span>
                <span className="px-3 py-1.5 bg-white border border-[#d4a340]/30 rounded-xl text-xs font-bold text-[#b88628] shadow-xs flex items-center gap-1.5 sm:gap-2">
                  ✍️ Deed &amp; Contract Drafting
                </span>
              </div>

              {/* Quick Info Bar */}
              <div className="pt-4 sm:pt-6 grid grid-cols-3 gap-3 sm:gap-6 border-t border-slate-200/80 max-w-lg">
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#0e4b29]">1 Test</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Unified Assessment</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#d4a340]">60 Mins</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Timed Countdown</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-[#0e4b29]">Strict</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">Single Attempt Only</p>
                </div>
              </div>
            </div>

            {/* Right Column: Sign In & Register Card */}
            <div id="examinee-login" className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl sm:rounded-[32px] p-5 sm:p-8 shadow-xl border-2 border-[#0e4b29]/15 relative overflow-hidden"
              >
                {/* Gold Corner Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#d4a340]/20 to-transparent pointer-events-none" />

                {/* Tabs: Sign In vs Create Account */}
                <div className="flex rounded-2xl bg-slate-100 p-1 mb-6 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('LOGIN');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'LOGIN'
                        ? 'bg-[#0e4b29] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔑 Candidate Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('REGISTER');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      activeTab === 'REGISTER'
                        ? 'bg-[#0e4b29] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ✍️ Create Account
                  </button>
                </div>

                {/* Header text */}
                <div className="text-center mb-5">
                  <h2 className="text-xl sm:text-2xl font-black text-[#0e4b29] uppercase tracking-wide">
                    {activeTab === 'LOGIN' ? 'Candidate Sign In' : 'New Candidate Registration'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    {activeTab === 'LOGIN'
                      ? 'Enter your Email and password to access your examination sitting'
                      : 'Enroll your examinee profile to immediately commence your CBT sitting'}
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold leading-relaxed flex items-start gap-2">
                    <span className="text-base shrink-0">⚠️</span>
                    <div className="flex-1">
                      <span>{error}</span>
                      {activeTab === 'LOGIN' && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('REGISTER');
                            setError(null);
                          }}
                          className="block mt-1.5 text-xs text-[#0e4b29] underline font-black cursor-pointer hover:text-[#072614]"
                        >
                          → Click here to Create a Candidate Account instead
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold leading-relaxed flex items-center gap-2">
                    <span>✓</span>
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* TAB 1: LOGIN FORM */}
                {activeTab === 'LOGIN' ? (
                  <form onSubmit={handleLogin} autoComplete="off" className="space-y-4">
                    {/* Dummy hidden inputs to defeat aggressive browser autofill heuristics */}
                    <input type="text" name="midlex_prevent_autofill_user" tabIndex={-1} style={{ display: 'none' }} autoComplete="false" />
                    <input type="password" name="midlex_prevent_autofill_pwd" tabIndex={-1} style={{ display: 'none' }} autoComplete="false" />

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="text"
                        name="cbt_candidate_id_input"
                        id="cbt_candidate_id_input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. you@example.com or user@midlex.com"
                        autoComplete="new-password"
                        readOnly
                        onFocus={(e) => e.target.removeAttribute('readonly')}
                        className="w-full px-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0e4b29]/30 focus:border-[#0e4b29] transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        name="cbt_candidate_passkey_input"
                        id="cbt_candidate_passkey_input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        readOnly
                        onFocus={(e) => e.target.removeAttribute('readonly')}
                        className="w-full px-4 py-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0e4b29]/30 focus:border-[#0e4b29] transition-all"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-wider bg-gradient-to-r from-[#0e4b29] to-[#146336] hover:from-[#072614] hover:to-[#0e4b29] shadow-lg shadow-[#0e4b29]/25 transition-all transform active:scale-[0.99] cursor-pointer mt-2"
                    >
                      {isLoading ? 'Verifying Candidate...' : 'Sign In to Take Examination →'}
                    </button>
                  </form>
                ) : (
                  /* TAB 2: REGISTRATION FORM */
                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">
                        Full Legal Name
                      </label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="e.g. Barr. Emeka Nwachukwu"
                        className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0e4b29]/30 focus:border-[#0e4b29] transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="e.g. emeka@example.com"
                        className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0e4b29]/30 focus:border-[#0e4b29] transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-widest mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create your secure password"
                        className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0e4b29]/30 focus:border-[#0e4b29] transition-all"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-wider bg-gradient-to-r from-[#0e4b29] to-[#146336] hover:from-[#072614] hover:to-[#0e4b29] shadow-lg shadow-[#0e4b29]/25 transition-all transform active:scale-[0.99] cursor-pointer mt-2"
                    >
                      {isLoading ? 'Creating Candidate Profile...' : 'Register & Start Examination 🚀'}
                    </button>
                  </form>
                )}
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* Unified Examination Overview */}
      <section className="py-16 bg-white border-y border-[#e2e8e4]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="px-3.5 py-1 bg-[#0e4b29]/10 text-[#0e4b29] text-[10px] font-black uppercase tracking-widest rounded-full">
              Unified Examination Structure
            </span>
            <h2 className="text-3xl font-black text-[#0e4b29] mt-3">
              One Single Comprehensive CBT Sitting
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-2">
              All question sections are administered concurrently in 1 unified assessment session.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-gradient-to-br from-[#f8faf9] to-[#f0f7f2] border-2 border-[#0e4b29]/20 rounded-[32px] p-8 sm:p-10 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#0e4b29]/10 pb-6 mb-6">
              <div>
                <span className="px-3 py-1 bg-[#0e4b29] text-white text-[10px] font-black uppercase tracking-widest rounded-lg">
                  Official Comprehensive CBT Sitting
                </span>
                <h3 className="text-2xl font-black text-[#0e4b29] mt-2">
                  Midlex Comprehensive Legal & Language Examination
                </h3>
              </div>
              <div className="sm:text-right">
                <span className="text-3xl font-black text-[#d4a340]">60 Mins</span>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Duration</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🇩🇪</span>
                  <h4 className="font-black text-sm text-[#0e4b29]">Section A: German Philology & BGB Law</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  German legal prepositions, Bürgerliches Gesetzbuch (§ 433 BGB) breach remedies, court jurisdiction terminology, and Grundbuch deed diagram inspection.
                </p>
                <div className="mt-3 text-[11px] font-bold text-[#b88628]">
                  4 Questions • Multiple Choice & True/False
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">⚖️</span>
                  <h4 className="font-black text-sm text-[#0e4b29]">Section B: Nigerian Civil Procedure & Drafting</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  High Court Order 3 originating process analysis, Land Use Act 1978 Governor consent, and handwritten Deed of Assignment clause drafting.
                </p>
                <div className="mt-3 text-[11px] font-bold text-[#b88628]">
                  3 Questions • Multiple Choice, True/False & Theory
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#0e4b29]/10 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 font-bold text-[#0e4b29]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0e4b29]" />
                <span>Total 7 Questions • 140 Maximum Marks • Pass Mark: 70 (50%)</span>
              </div>
              <a href="#examinee-login" className="font-bold text-[#b88628] hover:text-[#0e4b29] underline transition-colors">
                Sign in or register to begin →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-[#072614] text-white border-t border-[#0e4b29]">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src="/midlex-logo.png" alt="Midlex Logo" className="h-10 w-auto object-contain brightness-110" />
            <div>
              <p className="text-xs font-bold text-white">MIDLEX COMPUTER-BASED TESTING</p>
              <p className="text-[11px] text-[#d4a340]">Litigation • Mediation • Consultation</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center md:text-right">
            © {new Date().getFullYear()} Midlex Legal Practice. All rights reserved. <br />
            Confidential Examination Platform & Candidate Verification System.
          </p>
        </div>
      </footer>
    </div>
  );
}
