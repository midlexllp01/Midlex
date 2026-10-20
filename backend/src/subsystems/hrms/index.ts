import { workspaceGuard } from './workspace.js';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Routes
import authRoutes from './routes/auth.js';
import staffRoutes from './routes/staff.js';
import attendanceRoutes from './routes/attendance.js';
import leavesRoutes from './routes/leaves.js';
import courtRoutes from './routes/court.js';
import appraisalsRoutes from './routes/appraisals.js';
import payrollRoutes from './routes/payroll.js';
import auditRoutes from './routes/audit.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check API
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    system: 'Midlex HRMS Enterprise REST API & Fullstack Web Server',
    firm: 'Midlex Legal Practice',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount REST API Routes
app.use('/api', workspaceGuard);
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/court-appearances', courtRoutes);
app.use('/api/appraisals', appraisalsRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/audit-logs', auditRoutes);

// Static Web Application Mounting
const backendPublic = path.resolve(process.cwd(), 'public');
const adminStaticPath = fs.existsSync(path.join(backendPublic, 'admin'))
  ? path.join(backendPublic, 'admin')
  : fs.existsSync(path.resolve(process.cwd(), '../admin/out'))
  ? path.resolve(process.cwd(), '../admin/out')
  : path.resolve(process.cwd(), 'admin/out');

const frontendStaticPath = fs.existsSync(path.join(backendPublic, 'frontend'))
  ? path.join(backendPublic, 'frontend')
  : fs.existsSync(path.resolve(process.cwd(), '../frontend/out'))
  ? path.resolve(process.cwd(), '../frontend/out')
  : path.resolve(process.cwd(), 'frontend/out');

if (process.env.NODE_ENV !== 'production') {
  app.get('/admin', (req: Request, res: Response) => {
    res.redirect('http://localhost:3007/admin');
  });

  app.get('/admin/*', (req: Request, res: Response) => {
    res.redirect('http://localhost:3007' + req.originalUrl);
  });
}

// 1. Serve Admin Command Center at /admin
if (fs.existsSync(adminStaticPath)) {
  console.log(`✓ Admin Command Center mounted from ${adminStaticPath}`);
  app.use('/admin', express.static(adminStaticPath));
  app.get('/admin*', (req: Request, res: Response) => {
    res.sendFile(path.join(adminStaticPath, 'index.html'));
  });
}

// 2. Serve Staff & User Portal at /
if (fs.existsSync(frontendStaticPath)) {
  console.log(`✓ Staff User Portal mounted from ${frontendStaticPath}`);
  app.use(express.static(frontendStaticPath));

  app.get('/dashboard', (req: Request, res: Response) => {
    const dashboardHtml = path.join(frontendStaticPath, 'dashboard.html');
    if (fs.existsSync(dashboardHtml)) {
      res.sendFile(dashboardHtml);
    } else {
      res.sendFile(path.join(frontendStaticPath, 'dashboard/index.html'));
    }
  });

  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(frontendStaticPath, 'index.html'));
  });
} else {
  app.get('/', (req: Request, res: Response) => {
    res.json({
      status: 'ONLINE',
      message: 'Welcome to Midlex Legal Practice HRMS Server',
      endpoints: '/api/health',
    });
  });
}

// Subsystem export

export default app;

