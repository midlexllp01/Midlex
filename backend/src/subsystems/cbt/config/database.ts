import fs from 'fs';
import path from 'path';
import { CbtUser, CbtExam, CbtQuestion, CbtSubmission } from '../types/cbt.js';

export interface CbtDatabaseSchema {
  users: CbtUser[];
  exams: CbtExam[];
  questions: CbtQuestion[];
  submissions: CbtSubmission[];
}

const DEFAULT_USERS: CbtUser[] = [
  {
    id: 'user-admin-1',
    name: 'Chief Examiner / Super Admin',
    email: 'admin@midlex.com',
    password: 'admin123',
    role: 'ADMIN',
    candidateId: 'ADM-001',
    assignedExamIds: ['midlex-cbt-exam'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-admin-2',
    name: 'Abeddy (Administrator)',
    email: 'abeddybaba@gmail.com',
    password: 'Abeddy9498#',
    role: 'ADMIN',
    candidateId: 'ADM-002',
    assignedExamIds: ['midlex-cbt-exam'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-examinee-1',
    name: 'Sammie Okon',
    email: 'user@midlex.com',
    password: 'user123',
    role: 'USER',
    candidateId: 'MID-CBT-8890',
    assignedExamIds: ['midlex-cbt-exam'],
    createdAt: new Date().toISOString(),
  }
];

const DEFAULT_EXAMS: CbtExam[] = [
  {
    id: 'midlex-cbt-exam',
    title: 'Midlex Comprehensive Legal & Language Examination',
    description: 'Unified single-session CBT assessment combining German Grammar Translation, BGB Civil Code Analysis, High Court Civil Procedure, and Case Drafting.',
    subject: 'German Philology & Legal Practice',
    durationMinutes: 60,
    totalMarks: 140,
    passingScore: 70,
    questionCount: 7,
    showResultsImmediately: false,
    shuffleQuestions: false,
    allowTheory: true,
    sectionAQuestionCount: 5,
    theoryQuestionCount: 2,
    createdAt: new Date().toISOString(),
  }
];

const DEFAULT_QUESTIONS: CbtQuestion[] = [
  {
    id: 'q-ger-1',
    examId: 'midlex-cbt-exam',
    type: 'MCQ',
    category: 'German Grammar (Grammatik)',
    questionText: 'Welches Wort vervollständigt den Satz korrekt? "Der Rechtsanwalt verhandelt _____ dem Gericht in Berlin."',
    isGerman: true,
    options: [
      { key: 'A', text: 'vor (before / in front of)' },
      { key: 'B', text: 'nach (after)' },
      { key: 'C', text: 'durch (through)' },
      { key: 'D', text: 'ohne (without)' },
    ],
    correctOptionKey: 'A',
    explanation: 'Im deutschen Juristendeutsch steht die Präposition "vor" bei Gerichtsterminen ("vor Gericht").',
    marks: 20,
  },
  {
    id: 'q-ger-2',
    examId: 'midlex-cbt-exam',
    type: 'TRUE_FALSE',
    category: 'German Civil Code (BGB Legal Logic)',
    questionText: 'Richtig oder Falsch? (True or False?)\nIm deutschen Bürgerlichen Gesetzbuch (§ 433 BGB) verpflichtet der Kaufvertrag den Verkäufer zur Übergabe der Sache frei von Sach- und Rechtsmängeln.',
    isGerman: true,
    correctTrueFalse: true,
    explanation: 'Richtig (True). Gemäß § 433 Abs. 1 Satz 2 BGB muss der Verkäufer dem Käufer die Sache frei von Sach- und Rechtsmängeln verschaffen.',
    marks: 20,
  },
  {
    id: 'q-ger-3',
    examId: 'midlex-cbt-exam',
    type: 'MCQ',
    category: 'Diagram & Document Analysis',
    questionText: 'Betrachten Sie das untenstehende Dokumenten-Symbol. Welcher juristische Begriff passt am besten zur Grundbuch-Eintragung?',
    isGerman: true,
    imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    options: [
      { key: 'A', text: 'Auflassung (Conveyance of property title)' },
      { key: 'B', text: 'Kündigung (Termination of employment)' },
      { key: 'C', text: 'Testament (Will & Probate)' },
      { key: 'D', text: 'Scheidung (Divorce petition)' },
    ],
    correctOptionKey: 'A',
    explanation: 'Die Auflassung bezeichnet im deutschen Sachenrecht die Einigung zwischen Veräußerer und Erwerber über den Übergang des Eigentums an einem Grundstück.',
    marks: 20,
  },
  {
    id: 'q-ger-4',
    examId: 'midlex-cbt-exam',
    type: 'THEORY',
    category: 'German Translation & Written Theory',
    questionText: '✍️ German Theory Exercise:\nÜbersetzen Sie den folgenden juristischen Satz ins Englische und erläutern Sie die Bedeutung:\n"Die Parteien vereinbaren als Gerichtsstand für alle Streitigkeiten das Landgericht Frankfurt am Main."\n\n(Optionally attach a scanned handwritten page image below)',
    isGerman: true,
    explanation: 'Sample English Translation: "The parties agree that the place of jurisdiction for all disputes shall be the Regional Court of Frankfurt am Main."',
    marks: 25,
  },
  {
    id: 'q-leg-1',
    examId: 'midlex-cbt-exam',
    type: 'MCQ',
    category: 'Civil Procedure',
    questionText: 'Under Order 3 of High Court Rules, what document initiates a contentious land dispute lawsuit where witness cross-examination is required?',
    options: [
      { key: 'A', text: 'Writ of Summons with Statement of Claim' },
      { key: 'B', text: 'Originating Summons' },
      { key: 'C', text: 'Motion ex-parte' },
      { key: 'D', text: 'Letter of Demand' },
    ],
    correctOptionKey: 'A',
    explanation: 'Contentious matters involving disputes of facts must be initiated by Writ of Summons with Statement of Claim.',
    marks: 15,
  },
  {
    id: 'q-leg-2',
    examId: 'midlex-cbt-exam',
    type: 'TRUE_FALSE',
    category: 'Property Law',
    questionText: 'True or False?\nUnder the Land Use Act 1978, all land comprised in the territory of each State is vested in the Governor of that State.',
    correctTrueFalse: true,
    explanation: 'True. Section 1 of the Land Use Act 1978 vests all land in each state in the Governor to hold in trust for Nigerians.',
    marks: 15,
  },
  {
    id: 'q-leg-3',
    examId: 'midlex-cbt-exam',
    type: 'THEORY',
    category: 'Legal Drafting Theory',
    questionText: '✍️ Theory & Case Drafting:\nDraft the commencement clause of a Deed of Assignment between Chief Uzoma Okonti (Assignor) and Midlex Realty (Assignee) for property in Benin City. Upload diagram/deed image if available.',
    explanation: 'Commencement clause should accurately state date, parties, recitals, and Certificate of Occupancy registration details.',
    marks: 25,
  }
];

const defaultDatabase: CbtDatabaseSchema = {
  users: DEFAULT_USERS,
  exams: DEFAULT_EXAMS,
  questions: DEFAULT_QUESTIONS,
  submissions: [],
};

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'cbt_db.json');

let memoryDb: CbtDatabaseSchema = defaultDatabase;

try {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.exams)) {
      memoryDb = parsed;
    } else {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDatabase, null, 2), 'utf-8');
      memoryDb = defaultDatabase;
    }
  } else {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDatabase, null, 2), 'utf-8');
    memoryDb = defaultDatabase;
  }
} catch (error) {
  console.warn('Using in-memory CBT database fallback:', error);
  memoryDb = defaultDatabase;
}

export function getDb(): CbtDatabaseSchema {
  return memoryDb;
}

export function saveDb(newDb: CbtDatabaseSchema): void {
  memoryDb = newDb;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(newDb, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error persisting CBT database to disk:', error);
  }
}
