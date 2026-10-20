import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';
import { CbtSubmission, ExamineeAnswer } from '../types/cbt.js';

const router = Router();

// GET all submissions (optional ?examId=... or ?userId=...)
router.get('/', (req: Request, res: Response) => {
  const { examId, userId } = req.query;
  const db = getDb();

  let list = db.submissions;
  if (examId && typeof examId === 'string') {
    list = list.filter((s) => s.examId === examId);
  }
  if (userId && typeof userId === 'string') {
    list = list.filter((s) => s.userId === userId);
  }

  res.json({ success: true, count: list.length, submissions: list });
});

// GET single submission by id
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const sub = db.submissions.find((s) => s.id === id);
  if (!sub) {
    return res.status(404).json({ error: 'Submission record not found.' });
  }
  return res.json({ success: true, submission: sub });
});

// POST submit exam answers
router.post('/', (req: Request, res: Response) => {
  const { examId, userId, answers } = req.body;

  if (!examId || !userId || !answers) {
    return res.status(400).json({ error: 'examId, userId, and answers map are required.' });
  }

  const db = getDb();
  const exam = db.exams.find((e) => e.id === examId);
  const user = db.users.find((u) => u.id === userId);

  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const questions = db.questions.filter((q) => q.examId === examId);
  let totalScore = 0;
  let hasTheory = false;

  const evaluatedAnswers: Record<string, ExamineeAnswer> = {};

  questions.forEach((q) => {
    const examineeAns = answers[q.id] || {};
    let scoreAwarded = 0;

    if (q.type === 'MCQ') {
      if (examineeAns.selectedOptionKey && examineeAns.selectedOptionKey === q.correctOptionKey) {
        scoreAwarded = q.marks;
      }
    } else if (q.type === 'TRUE_FALSE') {
      if (typeof examineeAns.selectedTrueFalse === 'boolean' && examineeAns.selectedTrueFalse === q.correctTrueFalse) {
        scoreAwarded = q.marks;
      }
    } else if (q.type === 'THEORY') {
      hasTheory = true;
      scoreAwarded = examineeAns.scoreAwarded || 0;
    }

    totalScore += scoreAwarded;
    evaluatedAnswers[q.id] = {
      ...examineeAns,
      questionId: q.id,
      scoreAwarded,
    };
  });

  const totalMarks = exam.totalMarks || 100;
  const percentage = Math.round((totalScore / totalMarks) * 100);
  const isPassed = totalScore >= exam.passingScore;

  const newSubmission: CbtSubmission = {
    id: `sub-${Date.now()}`,
    examId: exam.id,
    examTitle: exam.title,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    candidateId: user.candidateId,
    answers: evaluatedAnswers,
    score: totalScore,
    totalMarks,
    percentage,
    isPassed,
    isGraded: !hasTheory, // If no theory questions, auto-graded
    submittedAt: new Date().toISOString(),
  };

  db.submissions.unshift(newSubmission);
  saveDb(db);

  return res.status(201).json({ success: true, submission: newSubmission });
});

// PATCH grade theory questions and update score
router.patch('/:id/grade', (req: Request, res: Response) => {
  const { id } = req.params;
  const { answers, newScore, isPassed } = req.body;

  const db = getDb();
  const sub = db.submissions.find((s) => s.id === id);

  if (!sub) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  if (answers) {
    sub.answers = answers;
  }
  if (typeof newScore === 'number') {
    sub.score = newScore;
    sub.percentage = Math.round((newScore / (sub.totalMarks || 100)) * 100);
  }
  if (typeof isPassed === 'boolean') {
    sub.isPassed = isPassed;
  }
  sub.isGraded = true;

  saveDb(db);
  return res.json({ success: true, submission: sub });
});

// DELETE submission (clear attempt & permit retake)
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const idx = db.submissions.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Submission not found.' });
  }

  const [removed] = db.submissions.splice(idx, 1);
  saveDb(db);

  return res.json({
    success: true,
    message: `Submission cleared. Candidate ${removed.userName} can now retake ${removed.examTitle}.`,
  });
});

export default router;
