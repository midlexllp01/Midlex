export interface CbtUser {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'USER';
  candidateId: string;
  assignedExamIds: string[];
  createdAt: string;
}

export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'THEORY';

export interface QuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
  imageUrl?: string;
}

export interface CbtQuestion {
  id: string;
  examId: string;
  type: QuestionType;
  category: string;
  questionText: string;
  isGerman?: boolean;
  caseSensitive?: boolean;
  imageUrl?: string;
  options?: QuestionOption[];
  correctOptionKey?: 'A' | 'B' | 'C' | 'D';
  correctTrueFalse?: boolean;
  correctShortAnswer?: string;
  correctTheoryKeyword?: string;
  explanation?: string;
  marks: number;
}

export interface CbtExam {
  id: string;
  title: string;
  description: string;
  subject: string;
  durationMinutes: number;
  totalMarks: number;
  passingScore: number;
  questionCount: number;
  showResultsImmediately?: boolean;
  shuffleQuestions?: boolean;
  allowTheory?: boolean;
  sectionAQuestionCount?: number;
  theoryQuestionCount?: number;
  createdAt: string;
}

export interface ExamineeAnswer {
  questionId: string;
  selectedOptionKey?: 'A' | 'B' | 'C' | 'D';
  selectedTrueFalse?: boolean;
  shortAnswerText?: string;
  theoryAnswerText?: string;
  theoryAttachmentUrl?: string;
  isFlagged?: boolean;
  scoreAwarded?: number;
  adminGradingNotes?: string;
}

export interface CbtSubmission {
  id: string;
  examId: string;
  examTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  candidateId: string;
  answers: Record<string, ExamineeAnswer>;
  score: number;
  totalMarks: number;
  percentage: number;
  isPassed: boolean;
  isGraded: boolean;
  submittedAt: string;
}
