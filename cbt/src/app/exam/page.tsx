"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getCbtExams,
  getCbtQuestions,
  getCbtSubmissions,
  saveCbtSubmission,
  CbtExam,
  CbtQuestion,
  CbtUser,
  ExamineeAnswer,
} from '@/lib/cbtStore';

type ExamPhase = 'OBJECTIVE' | 'OBJECTIVE_REVIEW' | 'THEORY';

export default function InteractiveCbtExamEngine() {
  const router = useRouter();
  const [examId, setExamId] = useState<string>('');

  const [currentUser, setCurrentUser] = useState<CbtUser | null>(null);
  const [exam, setExam] = useState<CbtExam | null>(null);

  // Question lists
  const [allQuestions, setAllQuestions] = useState<CbtQuestion[]>([]);
  const [objectiveQuestions, setObjectiveQuestions] = useState<CbtQuestion[]>([]);
  const [theoryQuestions, setTheoryQuestions] = useState<CbtQuestion[]>([]);

  // Current Phase and Index
  const [examPhase, setExamPhase] = useState<ExamPhase>('OBJECTIVE');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Examinee Answers State: questionId -> ExamineeAnswer
  const [answers, setAnswers] = useState<Record<string, ExamineeAnswer>>({});

  // Timer State (seconds)
  const [timeLeft, setTimeLeft] = useState<number>(1800);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitObjectiveModalOpen, setIsSubmitObjectiveModalOpen] = useState(false);
  const [isConfirmFinalModalOpen, setIsConfirmFinalModalOpen] = useState(false);

  // Zoom Image Modal State
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const paramId = new URLSearchParams(window.location.search).get('id');
      if (paramId) {
        setExamId(paramId);
        return;
      }
      const parts = window.location.pathname.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== 'exam') {
        setExamId(lastPart);
      } else {
        setExamId('midlex-cbt-exam');
      }
    }
  }, []);

  useEffect(() => {
    if (!examId) return;

    let candidateUser: CbtUser | null = null;
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('midlex_cbt_session');
      if (!session) {
        router.push('/');
        return;
      }
      try {
        const u = JSON.parse(session);
        candidateUser = u;
        setCurrentUser(u);
      } catch (e) {
        router.push('/');
        return;
      }
    }

    if (candidateUser) {
      const priorSub = getCbtSubmissions().find(
        (s) => s.examId === examId && s.userId === candidateUser.id
      );
      if (priorSub) {
        alert(
          '⛔ Access Prohibited: You have already completed and submitted this examination. Retakes are strictly barred unless the Chief Examiner re-allocates the examination to your candidate profile.'
        );
        router.push('/dashboard');
        return;
      }
    }

    const allExams = getCbtExams();
    const foundExam = allExams.find((e) => e.id === examId);
    if (!foundExam) {
      alert('CBT Exam not found.');
      router.push('/dashboard');
      return;
    }
    setExam(foundExam);
    setTimeLeft((foundExam.durationMinutes || 30) * 60);

    const qList = getCbtQuestions(examId);
    let finalQuestions = [...qList];
    if (foundExam.shuffleQuestions) {
      for (let i = finalQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
      }
    }
    const objs = finalQuestions.filter((q) => q.type !== 'THEORY');
    const theories = finalQuestions.filter((q) => q.type === 'THEORY');

    // Limit Section A and Theory to examiner-configured counts
    const limitObj =
      typeof foundExam.sectionAQuestionCount === 'number'
        ? Math.min(foundExam.sectionAQuestionCount, objs.length)
        : objs.length;
    const limitTheory =
      typeof foundExam.theoryQuestionCount === 'number'
        ? Math.min(foundExam.theoryQuestionCount, theories.length)
        : theories.length;

    const selectedObjs = objs.slice(0, limitObj);
    const selectedTheories = theories.slice(0, limitTheory);

    setObjectiveQuestions(selectedObjs);
    setTheoryQuestions(selectedTheories);

    const candidateSittingQuestions = [...selectedObjs, ...selectedTheories];
    setAllQuestions(candidateSittingQuestions);

    // If an exam has zero objective questions but has theory, start in theory
    if (selectedObjs.length === 0 && selectedTheories.length > 0 && foundExam.allowTheory !== false) {
      setExamPhase('THEORY');
    } else {
      setExamPhase('OBJECTIVE');
    }

    // Initialize blank answers for candidate sitting questions only
    const initAnswers: Record<string, ExamineeAnswer> = {};
    candidateSittingQuestions.forEach((q) => {
      initAnswers[q.id] = { questionId: q.id, isFlagged: false };
    });
    setAnswers(initAnswers);
  }, [examId, router]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0 && exam) {
      handleFinalSubmission();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, exam]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (questionId: string, optionKey: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedOptionKey: optionKey,
      },
    }));
  };

  const handleSelectTrueFalse = (questionId: string, val: boolean) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedTrueFalse: val,
      },
    }));
  };

  const handleShortAnswerChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        shortAnswerText: text.toUpperCase(),
      },
    }));
  };

  const handleTheoryTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        theoryAnswerText: text,
      },
    }));
  };

  const handleTheoryImageUpload = (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAnswers((prev) => ({
          ...prev,
          [questionId]: {
            ...prev[questionId],
            theoryAttachmentUrl: reader.result as string,
          },
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleFlag = (questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        isFlagged: !prev[questionId]?.isFlagged,
      },
    }));
  };

  const handleFinalSubmission = () => {
    if (!exam || !currentUser) return;
    setIsSubmitting(true);

    const relevantQuestions =
      exam.allowTheory === false ? objectiveQuestions : allQuestions;

    let totalScore = 0;
    let needsManualGrading = false;

    const finalAnswers = { ...answers };
    relevantQuestions.forEach((q) => {
      const ans = finalAnswers[q.id] || { questionId: q.id };
      if (q.type === 'MCQ') {
        const isCorrect = ans && ans.selectedOptionKey === q.correctOptionKey;
        const pts = isCorrect ? q.marks : 0;
        finalAnswers[q.id] = { ...ans, scoreAwarded: pts };
        totalScore += pts;
      } else if (q.type === 'TRUE_FALSE') {
        const isCorrect = ans && ans.selectedTrueFalse === q.correctTrueFalse;
        const pts = isCorrect ? q.marks : 0;
        finalAnswers[q.id] = { ...ans, scoreAwarded: pts };
        totalScore += pts;
      } else if (q.type === 'SHORT_ANSWER') {
        const candidateText = (ans?.shortAnswerText || '').trim().toUpperCase();
        const correctText = (q.correctShortAnswer || '').trim().toUpperCase();
        const isCorrect = candidateText.length > 0 && candidateText === correctText;
        const pts = isCorrect ? q.marks : 0;
        finalAnswers[q.id] = { ...ans, scoreAwarded: pts };
        totalScore += pts;
      } else if (q.type === 'THEORY') {
        needsManualGrading = true;
        finalAnswers[q.id] = { ...ans, scoreAwarded: ans?.scoreAwarded ?? 0 };
      }
    });

    const totalPossibleMarks =
      relevantQuestions.reduce((acc, q) => acc + q.marks, 0) || exam.totalMarks || 100;
    const percentage = Math.round((totalScore / totalPossibleMarks) * 100);
    const isPassed = percentage >= (exam.passingScore || 50);

    const submission = saveCbtSubmission({
      examId: exam.id,
      examTitle: exam.title,
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      candidateId: currentUser.candidateId,
      answers: finalAnswers,
      score: totalScore,
      totalMarks: totalPossibleMarks,
      percentage,
      isPassed,
      isGraded: !needsManualGrading,
    });

    setTimeout(() => {
      setIsSubmitting(false);
      router.push(`/results?id=${submission.id}`);
    }, 600);
  };

  if (!exam || allQuestions.length === 0 || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-xs font-bold animate-pulse">
        Initializing Computer-Based Test environment...
      </div>
    );
  }

  // Active question pool based on phase
  const activeQuestions =
    examPhase === 'THEORY' ? theoryQuestions : objectiveQuestions;

  const currentQ = activeQuestions[currentIndex] || activeQuestions[0];
  const currentAns = currentQ ? answers[currentQ.id] || {} : ({} as ExamineeAnswer);

  // Stats for Objective Section
  let objEarnedScore = 0;
  let objTotalMarks = 0;
  objectiveQuestions.forEach((q) => {
    objTotalMarks += q.marks;
    const ans = answers[q.id];
    if (q.type === 'MCQ' && ans && ans.selectedOptionKey === q.correctOptionKey) {
      objEarnedScore += q.marks;
    } else if (q.type === 'TRUE_FALSE' && ans && ans.selectedTrueFalse === q.correctTrueFalse) {
      objEarnedScore += q.marks;
    } else if (
      q.type === 'SHORT_ANSWER' &&
      ans?.shortAnswerText &&
      q.correctShortAnswer &&
      ans.shortAnswerText.trim().toUpperCase() === q.correctShortAnswer.trim().toUpperCase()
    ) {
      objEarnedScore += q.marks;
    }
  });
  const objPercentage = objTotalMarks > 0 ? Math.round((objEarnedScore / objTotalMarks) * 100) : 0;

  const answeredInActiveSection = activeQuestions.filter(
    (q) =>
      answers[q.id]?.selectedOptionKey ||
      answers[q.id]?.selectedTrueFalse !== undefined ||
      (answers[q.id]?.shortAnswerText && answers[q.id]!.shortAnswerText!.trim().length > 0) ||
      (answers[q.id]?.theoryAnswerText && answers[q.id]!.theoryAnswerText!.trim().length > 0)
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* CBT Header Bar with Timer & Candidate Badge */}
      <header className="bg-primary text-white py-2.5 sm:py-3.5 px-3.5 sm:px-6 sticky top-0 z-30 shadow-md flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <img src="/midlex-logo.png" alt="Midlex" className="h-7 sm:h-9 w-auto object-contain brightness-110 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-bold text-xs sm:text-base text-white truncate max-w-[160px] sm:max-w-none">{exam.title}</h1>
            <p className="text-[10px] sm:text-[11px] text-amber-200 truncate">
              {currentUser.name} ({currentUser.candidateId})
            </p>
          </div>
        </div>

        {/* Realtime Countdown Timer Badge & Section Badge */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto sm:ml-0">
          <div
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-mono font-black text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-inner ${
              timeLeft < 300
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-slate-900 text-amber-400 border border-amber-400/30'
            }`}
          >
            <span className="hidden xs:inline">⏱️ TIME:</span>
            <span className="xs:hidden">⏱️</span>
            <span>{formatTimer(timeLeft)}</span>
          </div>

          {examPhase === 'OBJECTIVE' && (
            <button
              onClick={() => setIsSubmitObjectiveModalOpen(true)}
              className="px-3 sm:px-5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-[11px] sm:text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              <span className="hidden sm:inline">Finish Objective Section</span>
              <span className="sm:hidden">Finish Section</span>
            </button>
          )}

          {examPhase === 'THEORY' && (
            <button
              onClick={() => setIsConfirmFinalModalOpen(true)}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              Submit Final Exam
            </button>
          )}
        </div>
      </header>

      {/* Mobile Question Quick Bar (Swipeable, Sticky under header) */}
      {examPhase !== 'OBJECTIVE_REVIEW' && (
        <div className="lg:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto sticky top-[48px] sm:top-[60px] z-20 shadow-xs">
          <span className="text-[10px] font-black text-slate-400 shrink-0 uppercase tracking-widest pl-1">
            Q:
          </span>
          {activeQuestions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const ans = answers[q.id] || {};
            const isAnswered =
              q.type === 'MCQ'
                ? !!ans.selectedOptionKey
                : q.type === 'TRUE_FALSE'
                ? typeof ans.selectedTrueFalse === 'boolean'
                : q.type === 'SHORT_ANSWER'
                ? !!ans.shortAnswerText && ans.shortAnswerText.trim().length > 0
                : (!!ans.theoryAnswerText && ans.theoryAnswerText.trim().length > 0) || !!ans.theoryAttachmentUrl;
            const isFlagged = ans.isFlagged;

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`min-w-[34px] h-[34px] px-2 rounded-xl font-black text-xs flex items-center justify-center shrink-0 transition-all ${
                  isCurrent
                    ? 'bg-primary text-white ring-2 ring-primary ring-offset-1 scale-105 shadow-xs'
                    : isFlagged
                    ? 'bg-amber-400 text-slate-900 font-extrabold'
                    : isAnswered
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 active:bg-slate-200'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* PHASE 2: Post-Objective Checkpoint View */}
      {examPhase === 'OBJECTIVE_REVIEW' ? (
        <div className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex items-center justify-center my-auto">
          <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden relative">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#0e4b29] via-[#d4a340] to-[#0e4b29]" />

            <div className="p-7 sm:p-9 space-y-6">
              <div className="text-center space-y-3">
                <div className="flex justify-center mb-3">
                  <img src="/midlex-logo.png" alt="Midlex" className="h-11 w-auto object-contain" />
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold bg-[#0e4b29]/10 text-[#0e4b29] border border-[#0e4b29]/20 tracking-wider uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#0e4b29] animate-pulse" />
                  <span>Section 1 Complete • Objective Assessment</span>
                </div>

                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Objective Section Completed
                </h2>
                <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                  Candidate <strong className="text-slate-900">{currentUser.name}</strong> (<span className="font-mono text-[#b88628] font-bold">{currentUser.candidateId}</span>), your responses for Section 1 have been recorded.
                </p>
              </div>

              {exam.showResultsImmediately ? (
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      📊 Section 1 Score Breakdown
                    </span>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                        objPercentage >= (exam.passingScore || 50)
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {objPercentage >= (exam.passingScore || 50) ? 'Passing Mark Achieved' : 'Below Threshold'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center pt-1">
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Marks Scored</p>
                      <p className="text-xl font-black text-[#0e4b29] mt-0.5">
                        {objEarnedScore} <span className="text-xs font-normal text-slate-400">/ {objTotalMarks}</span>
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Percentage</p>
                      <p className="text-xl font-black text-[#b88628] mt-0.5">{objPercentage}%</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Questions</p>
                      <p className="text-xl font-black text-slate-700 mt-0.5">{objectiveQuestions.length}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                      <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs">
                        🔒
                      </span>
                      <span>Objective Responses Sealed Under Official Regulation</span>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-bold">
                      Sealed
                    </span>
                  </div>

                  <p className="text-slate-500 text-xs leading-relaxed">
                    The Chief Examiner has set this assessment with results withheld. Your objective answers are securely recorded and held for official certification.
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-200/80 pt-3 text-[11px] text-slate-500">
                    <span>Questions Completed:</span>
                    <strong className="text-slate-800 font-bold">
                      {objectiveQuestions.length} of {objectiveQuestions.length} Items (100%)
                    </strong>
                  </div>
                </div>
              )}

              {exam.allowTheory !== false && theoryQuestions.length > 0 ? (
                <div className="bg-[#0e4b29]/[0.03] border-2 border-[#0e4b29]/20 rounded-2xl p-6 space-y-5 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0e4b29] text-white flex items-center justify-center font-bold text-base shadow-xs">
                        ✍️
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#0e4b29]">
                          Section 2: Written Theory & Legal Drafting
                        </h3>
                        <p className="text-xs text-slate-500">
                          {theoryQuestions.length} Theory Prompts Authorized
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 bg-amber-50 text-[#b88628] border border-amber-200 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Next Section
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Written theory and legal drafting prompts have been authorized for your sitting. You may now commence Section 2 to type legal translations, draft documents, and upload diagrams.
                  </p>

                  <div className="space-y-3 pt-1">
                    <button
                      onClick={() => {
                        setExamPhase('THEORY');
                        setCurrentIndex(0);
                      }}
                      className="w-full py-4 bg-[#0e4b29] hover:bg-[#072614] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-[#0e4b29]/20 hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer group"
                    >
                      <span>Begin Theory Section (Section 2)</span>
                      <span className="transition-transform group-hover:translate-x-1 font-bold">➔</span>
                    </button>

                    <div className="text-center">
                      <button
                        onClick={handleFinalSubmission}
                        disabled={isSubmitting}
                        className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors cursor-pointer underline-offset-4 hover:underline"
                      >
                        {isSubmitting ? 'Finalizing Sitting...' : 'Finalize examination sitting without taking Theory'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-2xl mx-auto font-bold">
                    🏁
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Examination Sitting Complete
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      This assessment is configured for objective evaluation only. Click below to submit your official candidate sitting.
                    </p>
                  </div>
                  <button
                    onClick={handleFinalSubmission}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-[#0e4b29] hover:bg-[#072614] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-[#0e4b29]/20 cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting Examination...' : 'Finalize & Submit Examination'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* PHASE 1 & 3: Examination Question Engine (Objective or Theory) */
        <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 grid lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="lg:col-span-3 bg-white rounded-2xl sm:rounded-[32px] border border-slate-200 p-4 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 sm:pb-4 mb-4 sm:mb-6">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="px-2.5 sm:px-3 py-1 bg-primary/10 text-primary text-[11px] sm:text-xs font-black uppercase tracking-widest rounded-full">
                    {examPhase === 'THEORY' ? 'Theory' : 'Objective'} Q{currentIndex + 1} of{' '}
                    {activeQuestions.length}
                  </span>
                  <span className="px-2.5 sm:px-3 py-1 bg-slate-100 text-slate-700 text-[11px] sm:text-xs font-bold rounded-full">
                    {currentQ.category}
                  </span>
                  {currentQ.isGerman && (
                    <span className="px-2.5 sm:px-3 py-1 bg-yellow-100 text-yellow-800 text-[11px] sm:text-xs font-black rounded-full">
                      🇩🇪 German
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 ml-auto sm:ml-0">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500">Marks: {currentQ.marks}</span>
                  <button
                    onClick={() => toggleFlag(currentQ.id)}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      currentAns.isFlagged
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {currentAns.isFlagged ? '🚩 Flagged' : '🏳️ Flag'}
                  </button>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <h2 className="text-base sm:text-xl font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                  {currentQ.questionText}
                </h2>

                {currentQ.imageUrl && (
                  <div className="mt-4">
                    <div
                      className="relative inline-block group cursor-pointer"
                      onClick={() => setZoomImageUrl(currentQ.imageUrl!)}
                    >
                      <img
                        src={currentQ.imageUrl}
                        alt="Question diagram"
                        className="max-h-64 rounded-2xl border border-slate-200 shadow-sm object-cover group-hover:opacity-90 transition-all"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl flex items-center justify-center text-white font-bold text-xs transition-opacity">
                        🔍 Click to Zoom Image
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {currentQ.type === 'MCQ' && (
                <div className="space-y-3">
                  <label className="block text-xs font-black text-primary uppercase tracking-widest mb-2">
                    Select Correct Option (A, B, C, D):
                  </label>
                  {(
                    currentQ.options || [
                      { key: 'A', text: 'Option A' },
                      { key: 'B', text: 'Option B' },
                      { key: 'C', text: 'Option C' },
                      { key: 'D', text: 'Option D' },
                    ]
                  ).map((opt) => {
                    const isSelected = currentAns.selectedOptionKey === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleSelectOption(currentQ.id, opt.key)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/10'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                              isSelected
                                ? 'bg-secondary text-white'
                                : 'bg-white text-primary border border-slate-200'
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="font-medium text-base">{opt.text}</span>
                        </div>
                        {opt.imageUrl && (
                          <img
                            src={opt.imageUrl}
                            alt={`Option ${opt.key}`}
                            className="h-10 w-10 object-cover rounded-lg border"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQ.type === 'TRUE_FALSE' && (
                <div className="space-y-4">
                  <label className="block text-xs font-black text-primary uppercase tracking-widest mb-2">
                    Select Statement Status:
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleSelectTrueFalse(currentQ.id, true)}
                      className={`p-6 rounded-2xl border-2 font-black text-lg transition-all cursor-pointer ${
                        currentAns.selectedTrueFalse === true
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg'
                          : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 border-slate-200'
                      }`}
                    >
                      ✔️ TRUE (Richtig)
                    </button>
                    <button
                      onClick={() => handleSelectTrueFalse(currentQ.id, false)}
                      className={`p-6 rounded-2xl border-2 font-black text-lg transition-all cursor-pointer ${
                        currentAns.selectedTrueFalse === false
                          ? 'bg-red-600 text-white border-red-600 shadow-lg'
                          : 'bg-slate-50 text-slate-700 hover:bg-red-50 border-slate-200'
                      }`}
                    >
                      ❌ FALSE (Falsch)
                    </button>
                  </div>
                </div>
              )}

              {currentQ.type === 'SHORT_ANSWER' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl flex items-start gap-3.5 shadow-xs">
                    <span className="text-xl mt-0.5">⚠️</span>
                    <div>
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                        Important Candidate Notice: Type in ALL CAPS
                      </h4>
                      <p className="text-xs font-semibold text-amber-900 mt-1 leading-relaxed">
                        Your answer for this question must be typed entirely in <span className="font-black underline tracking-wide">ALL CAPS</span> (UPPERCASE). (e.g. <span className="font-mono font-bold bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">AFFIDAVIT</span>).
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-primary uppercase tracking-widest mb-2">
                      Type Your Answer in Answer Box:
                    </label>
                    <input
                      type="text"
                      value={currentAns.shortAnswerText || ''}
                      onChange={(e) => handleShortAnswerChange(currentQ.id, e.target.value)}
                      placeholder="TYPE YOUR ANSWER IN ALL CAPS HERE..."
                      className="w-full px-5 py-4 bg-white border-2 border-slate-300 focus:border-[#0e4b29] rounded-2xl text-base font-black font-mono tracking-widest uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#0e4b29]/15 shadow-inner transition-all"
                    />
                    <div className="flex items-center justify-between text-xs mt-2 px-1">
                      <span className="text-[11px] font-semibold text-slate-500">
                        Letters are automatically transformed to UPPERCASE as you type.
                      </span>
                      {currentAns.shortAnswerText && currentAns.shortAnswerText.trim().length > 0 && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          ✓ Response Recorded ({currentAns.shortAnswerText.trim().length} chars)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {currentQ.type === 'THEORY' && (
                <div className="space-y-4">
                  <label className="block text-xs font-black text-primary uppercase tracking-widest mb-2">
                    Written Response & Document Attachment:
                  </label>
                  <textarea
                    rows={6}
                    value={currentAns.theoryAnswerText || ''}
                    onChange={(e) => handleTheoryTextChange(currentQ.id, e.target.value)}
                    placeholder="Type your written answer, legal draft, or translation analysis here..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-secondary/30 text-sm font-medium text-slate-800"
                  />

                  <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          📷 Attach Written Sheet Image / Diagram (Optional)
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Upload handwritten notes or drafting image for examiner review.
                        </p>
                      </div>
                      <label className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-primary/90">
                        Browse Image
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleTheoryImageUpload(currentQ.id, e)}
                        />
                      </label>
                    </div>

                    {currentAns.theoryAttachmentUrl && (
                      <div className="mt-3 flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                        <img
                          src={currentAns.theoryAttachmentUrl}
                          alt="Examinee attachment"
                          className="h-12 w-12 object-cover rounded-lg"
                        />
                        <span className="text-xs font-bold text-emerald-700">Image attached successfully</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 disabled:opacity-50 transition-all cursor-pointer"
              >
                ⬅️ Previous
              </button>

              {currentIndex < activeQuestions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((prev) => Math.min(activeQuestions.length - 1, prev + 1))}
                  className="px-8 py-3 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary/90 transition-all shadow-md cursor-pointer"
                >
                  Next Question ➡️
                </button>
              ) : examPhase === 'OBJECTIVE' ? (
                <button
                  onClick={() => setIsSubmitObjectiveModalOpen(true)}
                  className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl text-xs hover:bg-emerald-700 transition-all shadow-lg cursor-pointer"
                >
                  Complete Objective Section ➡️
                </button>
              ) : (
                <button
                  onClick={() => setIsConfirmFinalModalOpen(true)}
                  className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl text-xs hover:bg-emerald-700 transition-all shadow-lg cursor-pointer"
                >
                  Finish & Submit Exam 🏁
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-[32px] border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col justify-between h-fit">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-primary text-xs uppercase tracking-widest">
                  {examPhase === 'THEORY' ? 'Section 2: Theory Grid' : 'Section 1: Objective Grid'}
                </h3>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {answeredInActiveSection}/{activeQuestions.length}
                </span>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-4 gap-2 mb-6">
                {activeQuestions.map((q, idx) => {
                  const ans = answers[q.id] || {};
                  const isAnswered =
                    ans.selectedOptionKey ||
                    ans.selectedTrueFalse !== undefined ||
                    (ans.shortAnswerText && ans.shortAnswerText.trim().length > 0) ||
                    (ans.theoryAnswerText && ans.theoryAnswerText.trim().length > 0);
                  const isCurrent = idx === currentIndex;
                  const isFlagged = ans.isFlagged;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-11 rounded-xl font-black text-xs transition-all relative cursor-pointer ${
                        isCurrent ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''
                      } ${
                        isFlagged
                          ? 'bg-amber-400 text-slate-900 font-extrabold'
                          : isAnswered
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 text-xs border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-emerald-600 rounded-md" />
                  <span className="text-slate-600 font-medium">Answered ({answeredInActiveSection})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-slate-200 rounded-md" />
                  <span className="text-slate-600 font-medium">
                    Unanswered ({activeQuestions.length - answeredInActiveSection})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-amber-400 rounded-md" />
                  <span className="text-slate-600 font-medium">Flagged for Review</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              {examPhase === 'OBJECTIVE' ? (
                <button
                  onClick={() => setIsSubmitObjectiveModalOpen(true)}
                  className="w-full py-3.5 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-lg hover:bg-emerald-700 transition-all uppercase tracking-wider cursor-pointer"
                >
                  Complete Objective ({answeredInActiveSection}/{activeQuestions.length})
                </button>
              ) : (
                <button
                  onClick={() => setIsConfirmFinalModalOpen(true)}
                  className="w-full py-3.5 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-lg hover:bg-emerald-700 transition-all uppercase tracking-wider cursor-pointer"
                >
                  Submit Final Exam ({answeredInActiveSection}/{activeQuestions.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Action Bar */}
      {examPhase !== 'OBJECTIVE_REVIEW' && (
        <div className="lg:hidden sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3 shadow-lg flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs disabled:opacity-30 transition-all flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>⬅️</span>
            <span>Prev</span>
          </button>

          <button
            type="button"
            onClick={() => toggleFlag(currentQ.id)}
            className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer shrink-0 ${
              currentAns.isFlagged
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <span>{currentAns.isFlagged ? '🚩' : '🏳️'}</span>
            <span className="text-[11px]">{currentAns.isFlagged ? 'Flagged' : 'Flag'}</span>
          </button>

          {currentIndex < activeQuestions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(activeQuestions.length - 1, prev + 1))}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Next</span>
              <span>➡️</span>
            </button>
          ) : examPhase === 'OBJECTIVE' ? (
            <button
              type="button"
              onClick={() => setIsSubmitObjectiveModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer shrink-0"
            >
              <span>Finish Section</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsConfirmFinalModalOpen(true)}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer shrink-0"
            >
              <span>Submit 🏁</span>
            </button>
          )}
        </div>
      )}

      {zoomImageUrl && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setZoomImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-4">
            <button className="absolute top-2 right-2 px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded-full">
              ✕ Close
            </button>
            <img
              src={zoomImageUrl}
              alt="Zoomed Diagram"
              className="max-h-[80vh] max-w-full rounded-2xl mx-auto object-contain"
            />
          </div>
        </div>
      )}

      {isSubmitObjectiveModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-8 space-y-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto font-black">
              📋
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">Complete Objective Section?</h3>
              <p className="text-slate-500 text-xs mt-2">
                You have answered <strong>{answeredInActiveSection}</strong> out of{' '}
                <strong>{objectiveQuestions.length}</strong> objective questions.
                {objectiveQuestions.length - answeredInActiveSection > 0 && (
                  <span className="text-amber-600 block mt-1 font-bold">
                    Warning: {objectiveQuestions.length - answeredInActiveSection} question(s) left unanswered.
                  </span>
                )}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsSubmitObjectiveModalOpen(false)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
              >
                Return to Questions
              </button>
              <button
                onClick={() => {
                  setIsSubmitObjectiveModalOpen(false);
                  setExamPhase('OBJECTIVE_REVIEW');
                  setCurrentIndex(0);
                }}
                className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 shadow-lg cursor-pointer"
              >
                Yes, Submit Section
              </button>
            </div>
          </div>
        </div>
      )}

      {isConfirmFinalModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-8 space-y-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-3xl mx-auto font-black">
              🏁
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">Confirm Final CBT Submission?</h3>
              <p className="text-slate-500 text-xs mt-2">
                This will officially submit your examination session. Once submitted, answers cannot be edited or retaken.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirmFinalModalOpen(false)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
              >
                Return to Exam
              </button>
              <button
                onClick={handleFinalSubmission}
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit Final Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
