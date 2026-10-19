"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCbtSubmissions, getCbtQuestions, getCbtExams, CbtSubmission, CbtQuestion, CbtExam, CbtUser } from '@/lib/cbtStore';

export default function CbtResultPage() {
  const [submissionId, setSubmissionId] = useState<string>('');
  const [submission, setSubmission] = useState<CbtSubmission | null>(null);
  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [exam, setExam] = useState<CbtExam | null>(null);
  const [currentUser, setCurrentUser] = useState<CbtUser | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const fromParam = new URLSearchParams(window.location.search).get('id');
      if (fromParam) {
        setSubmissionId(fromParam);
      } else {
        const parts = window.location.pathname.split('/').filter(Boolean);
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart !== 'results') {
          setSubmissionId(lastPart);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!submissionId) return;

    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('midlex_cbt_session');
      if (session) {
        try { setCurrentUser(JSON.parse(session)); } catch (e) {}
      }
    }
    const subs = getCbtSubmissions();
    const found = subs.find((s) => s.id === submissionId);
    if (found) {
      setSubmission(found);
      const qList = getCbtQuestions(found.examId);
      setQuestions(qList);

      const allExams = getCbtExams();
      const targetExam = allExams.find((e) => e.id === found.examId);
      if (targetExam) setExam(targetExam);
    }
  }, [submissionId]);

  if (!submission) return <div className="p-10 text-center animate-pulse">Loading Midlex CBT examination results...</div>;

  if (exam?.showResultsImmediately === false || exam?.showResultsImmediately === undefined) {
    return (
      <div className="min-h-screen bg-[#f7faf8] flex flex-col justify-between selection:bg-[#d4a340] selection:text-white">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#0e4b29] via-[#d4a340] to-[#0e4b29]" />
        
        <div className="flex-1 flex items-center justify-center p-3.5 sm:p-6">
          <div className="max-w-xl w-full bg-white rounded-2xl sm:rounded-[32px] border-2 border-[#0e4b29]/15 p-5 sm:p-10 shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4a340]/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex justify-center">
              <img src="/midlex-logo.png" alt="Midlex" className="h-14 w-auto object-contain" />
            </div>

            <div className="space-y-2">
              <span className="px-4 py-1.5 bg-[#0e4b29]/10 text-[#0e4b29] text-[10px] font-black uppercase tracking-widest rounded-full border border-[#0e4b29]/20">
                Examination Completed & Sealed
              </span>
              <h1 className="text-2xl font-black text-[#0e4b29] mt-3">
                Responses Successfully Recorded
              </h1>
              <p className="text-slate-500 text-xs leading-relaxed">
                Your examination responses for <strong>{submission.examTitle}</strong> have been securely recorded and sealed.
              </p>
            </div>

            <div className="bg-[#f8faf9] p-6 rounded-2xl border border-slate-200 text-left space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Candidate Name:</span>
                <strong className="text-[#0e4b29]">{submission.userName}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Candidate Email:</span>
                <strong className="text-[#0e4b29] font-medium">{submission.userEmail || submission.candidateId}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500 font-medium">Submission Timestamp:</span>
                <strong className="text-slate-800">{new Date(submission.submittedAt).toLocaleString()}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Evaluation Status:</span>
                <strong className="text-emerald-700">Sealed • Under Official Review</strong>
              </div>
            </div>

            <div className="p-4 bg-amber-50/80 rounded-2xl border border-[#d4a340]/40 text-[11px] text-amber-950 text-left flex items-start gap-2.5">
              <span className="text-base shrink-0">🔒</span>
              <span>
                <strong>Single Attempt Enforcement:</strong> This examination session is now closed and cannot be reopened or retaken. Contact the Chief Examiner if an emergency re-allocation is required.
              </span>
            </div>

            <Link
              href="/dashboard"
              className="w-full py-4 bg-[#0e4b29] hover:bg-[#072614] text-white font-bold rounded-2xl transition-all text-xs uppercase tracking-wider block shadow-lg shadow-[#0e4b29]/25"
            >
              Return to Examinee Portal
            </Link>
          </div>
        </div>

        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Midlex Legal Practice. All rights reserved.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faf8] flex flex-col justify-between selection:bg-[#d4a340] selection:text-white">
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0e4b29] via-[#d4a340] to-[#0e4b29]" />

      <div className="flex-1 max-w-4xl w-full mx-auto p-3.5 sm:p-6 space-y-6 sm:space-y-8 my-3 sm:my-6">
        <div className={`p-5 sm:p-10 rounded-2xl sm:rounded-[32px] text-white shadow-xl ${
          submission.isPassed
            ? 'bg-gradient-to-br from-[#0e4b29] via-[#146336] to-[#072614]'
            : 'bg-gradient-to-br from-red-900 via-red-800 to-red-950'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 border-b border-white/20 pb-5 sm:pb-6 mb-5 sm:mb-6">
            <div>
              <span className="px-3.5 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest inline-block">
                OFFICIAL RESULT REPORT
              </span>
              <h1 className="text-xl sm:text-3xl font-black mt-2">{submission.examTitle}</h1>
              <p className="text-xs text-white/80 mt-1">Examinee: {submission.userName} ({submission.candidateId})</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-4xl sm:text-5xl font-black">{submission.percentage}%</div>
              <span className="inline-block mt-2 px-3.5 py-1 bg-white text-slate-900 font-black text-xs uppercase tracking-widest rounded-full shadow-md">
                {submission.isPassed ? '🎉 PASSED' : '❌ FAILED'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center text-sm">
            <div className="bg-white/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
              <p className="text-[10px] uppercase font-bold text-white/70">Marks Obtained</p>
              <p className="text-lg sm:text-xl font-bold mt-1 text-[#f5c767]">{submission.score} / {submission.totalMarks}</p>
            </div>
            <div className="bg-white/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
              <p className="text-[10px] uppercase font-bold text-white/70">Submission Date</p>
              <p className="text-xs font-bold mt-1">{new Date(submission.submittedAt).toLocaleDateString()}</p>
            </div>
            <div className="bg-white/10 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
              <p className="text-[10px] uppercase font-bold text-white/70">Evaluation Status</p>
              <p className="text-xs font-bold mt-1">{submission.isGraded ? '✅ Official Grade' : '⏳ Pending Theory'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-[32px] border border-slate-200 p-4 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-base sm:text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 sm:pb-4">Detailed Question Review & Explanations</h2>

          <div className="space-y-6 divide-y divide-slate-100">
            {questions.map((q, idx) => {
              const ans = submission.answers[q.id] || {};
              let isCorrect = false;

              if (q.type === 'MCQ') {
                isCorrect = ans.selectedOptionKey === q.correctOptionKey;
              } else if (q.type === 'TRUE_FALSE') {
                isCorrect = ans.selectedTrueFalse === q.correctTrueFalse;
              } else if (q.type === 'SHORT_ANSWER') {
                isCorrect =
                  !!ans.shortAnswerText &&
                  !!q.correctShortAnswer &&
                  ans.shortAnswerText.trim().toUpperCase() === q.correctShortAnswer.trim().toUpperCase();
              }

              return (
                <div key={q.id} className="pt-6 first:pt-0 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary">Question {idx + 1} ({q.type})</span>
                    {q.type !== 'THEORY' ? (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isCorrect ? `Correct (+${q.marks} Marks)` : 'Incorrect (0 Marks)'}
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase">
                        Theory Response Submitted
                      </span>
                    )}
                  </div>

                  <p className="font-bold text-slate-800 text-base leading-relaxed">{q.questionText}</p>

                  {q.type === 'MCQ' && (
                    <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-1 border border-slate-100">
                      <p>Your Selected Option: <strong className="text-slate-900">{ans.selectedOptionKey || 'None'}</strong></p>
                      <p>Correct Option: <strong className="text-emerald-700">{q.correctOptionKey}</strong></p>
                    </div>
                  )}

                  {q.type === 'TRUE_FALSE' && (
                    <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-1 border border-slate-100">
                      <p>Your Selected Choice: <strong className="text-slate-900">{ans.selectedTrueFalse !== undefined ? (ans.selectedTrueFalse ? 'TRUE' : 'FALSE') : 'None'}</strong></p>
                      <p>Correct Statement: <strong className="text-emerald-700">{q.correctTrueFalse ? 'TRUE' : 'FALSE'}</strong></p>
                    </div>
                  )}

                  {q.type === 'SHORT_ANSWER' && (
                    <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-1 border border-slate-100 font-mono">
                      <p>Your Typed Answer: <strong className="text-slate-900 font-black">{ans.shortAnswerText || 'None'}</strong></p>
                      <p>Correct Answer (ALL CAPS): <strong className="text-emerald-700 font-black">{q.correctShortAnswer}</strong></p>
                    </div>
                  )}

                  {q.type === 'THEORY' && (
                    <div className="bg-slate-50 p-4 rounded-2xl text-xs space-y-2 border border-slate-100">
                      <p className="font-bold text-slate-700">Your Submitted Written Response:</p>
                      <p className="text-slate-800 italic bg-white p-3 rounded-xl border border-slate-200">{ans.theoryAnswerText || 'No text submitted.'}</p>
                      {ans.theoryAttachmentUrl && (
                        <div className="mt-2">
                          <p className="font-bold text-slate-700 mb-1">Attached Document Sheet:</p>
                          <img src={ans.theoryAttachmentUrl} alt="Submitted attachment" className="h-20 w-20 object-cover rounded-xl border" />
                        </div>
                      )}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-900">
                      <strong className="block mb-1">💡 Examiner Explanation:</strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-[#0e4b29] hover:bg-[#072614] text-white font-bold rounded-2xl transition-all text-xs uppercase tracking-wider inline-block shadow-lg shadow-[#0e4b29]/20"
          >
            Return to Examinee Dashboard
          </Link>
        </div>
      </div>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 mt-10">
        © {new Date().getFullYear()} Midlex Legal Practice. All rights reserved.
      </footer>
    </div>
  );
}
