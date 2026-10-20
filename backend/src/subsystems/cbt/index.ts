import { workspaceGuard } from './workspace.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import examsRoutes from './routes/exams.js';
import questionsRoutes from './routes/questions.js';
import submissionsRoutes from './routes/submissions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Root Welcome & Health Check API
app.get(['/', '/healthz', '/api/health'], (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    system: 'Midlex CBT Assessment Platform REST API',
    firm: 'Midlex Legal Practice',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: [
      '/api/auth',
      '/api/users',
      '/api/exams',
      '/api/questions',
      '/api/submissions',
    ],
  });
});

// Mount REST API Routes
app.use('/api', workspaceGuard);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/submissions', submissionsRoutes);

// Subsystem export

export default app;

