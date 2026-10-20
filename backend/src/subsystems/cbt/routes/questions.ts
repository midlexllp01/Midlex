import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../config/database.js';
import { CbtQuestion } from '../types/cbt.js';

const router = Router();

// GET questions (optionally filter by examId)
router.get('/', (req: Request, res: Response) => {
  const { examId } = req.query;
  const db = getDb();

  let result = db.questions;
  if (examId && typeof examId === 'string') {
    result = db.questions.filter((q) => q.examId === examId);
  }

  res.json({ success: true, count: result.length, questions: result });
});

// POST create question
router.post('/', (req: Request, res: Response) => {
  const {
    examId,
    type,
    category,
    questionText,
    isGerman,
    caseSensitive,
    imageUrl,
    options,
    correctOptionKey,
    correctTrueFalse,
    correctTheoryKeyword,
    explanation,
    marks,
  } = req.body;

  if (!examId || !type || !questionText) {
    return res.status(400).json({ error: 'examId, type, and questionText are required.' });
  }

  const db = getDb();
  const exam = db.exams.find((e) => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: 'Exam not found.' });
  }

  const newQuestion: CbtQuestion = {
    id: `q-${Date.now()}`,
    examId,
    type,
    category: category || 'General',
    questionText,
    isGerman: !!isGerman,
    caseSensitive: !!caseSensitive,
    imageUrl,
    options,
    correctOptionKey,
    correctTrueFalse,
    correctTheoryKeyword,
    explanation,
    marks: Number(marks) || 10,
  };

  db.questions.push(newQuestion);

  // Update exam metrics
  exam.questionCount = db.questions.filter((q) => q.examId === examId).length;
  exam.totalMarks += newQuestion.marks;

  saveDb(db);
  return res.status(201).json({ success: true, question: newQuestion });
});

// DELETE question
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  const idx = db.questions.findIndex((q) => q.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  const [deleted] = db.questions.splice(idx, 1);
  const exam = db.exams.find((e) => e.id === deleted.examId);
  if (exam) {
    exam.questionCount = db.questions.filter((q) => q.examId === deleted.examId).length;
    exam.totalMarks = Math.max(0, exam.totalMarks - deleted.marks);
  }

  saveDb(db);
  return res.json({ success: true, message: 'Question successfully deleted.' });
});

export default router;
