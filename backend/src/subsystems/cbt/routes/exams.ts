import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';
import { CbtExam } from '../types/cbt.js';

const router = Router();

// GET all exams
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  res.json({ success: true, count: db.exams.length, exams: db.exams });
});

// GET exam by id
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();
  const exam = db.exams.find((e) => e.id === id);
  if (!exam) {
    return res.status(404).json({ error: 'Exam module not found.' });
  }
  return res.json({ success: true, exam });
});

// POST create exam
router.post('/', (req: Request, res: Response) => {
  const { title, description, subject, durationMinutes, totalMarks, passingScore } = req.body;

  if (!title || !subject) {
    return res.status(400).json({ error: 'Title and subject are required.' });
  }

  const db = getDb();
  const newExam: CbtExam = {
    id: `exam-${Date.now()}`,
    title: title.trim(),
    description: description?.trim() || '',
    subject: subject.trim(),
    durationMinutes: Number(durationMinutes) || 30,
    totalMarks: Number(totalMarks) || 0,
    passingScore: Number(passingScore) || 50,
    questionCount: 0,
    showResultsImmediately: false,
    createdAt: new Date().toISOString(),
  };

  db.exams.push(newExam);
  saveDb(db);

  return res.status(201).json({ success: true, exam: newExam });
});

// PATCH update exam settings (showResultsImmediately, durationMinutes, shuffleQuestions, allowTheory, sectionAQuestionCount, theoryQuestionCount)
router.patch('/:id/settings', (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    showResultsImmediately,
    durationMinutes,
    shuffleQuestions,
    allowTheory,
    sectionAQuestionCount,
    theoryQuestionCount,
  } = req.body;

  const db = getDb();
  const exam = db.exams.find((e) => e.id === id);

  if (!exam) {
    return res.status(404).json({ error: 'Exam module not found.' });
  }

  if (typeof showResultsImmediately === 'boolean') {
    exam.showResultsImmediately = showResultsImmediately;
  }
  if (typeof durationMinutes === 'number') {
    exam.durationMinutes = Math.max(1, durationMinutes);
  }
  if (typeof shuffleQuestions === 'boolean') {
    exam.shuffleQuestions = shuffleQuestions;
  }
  if (typeof allowTheory === 'boolean') {
    exam.allowTheory = allowTheory;
  }
  if (typeof sectionAQuestionCount === 'number') {
    exam.sectionAQuestionCount = Math.max(0, sectionAQuestionCount);
  }
  if (typeof theoryQuestionCount === 'number') {
    exam.theoryQuestionCount = Math.max(0, theoryQuestionCount);
  }

  saveDb(db);
  return res.json({ success: true, exam });
});

export default router;
