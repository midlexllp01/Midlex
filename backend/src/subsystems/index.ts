import type { Express } from 'express';
import hrmsApp from './hrms/index.js';
import cbtApp from './cbt/index.js';
// @ts-ignore
import aiApp from './ai/index.js';

export function mountSubsystems(app: Express) {
  // Global Health Checks
  app.get(['/health', '/healthz'], (req, res) => {
    res.json({
      status: 'healthy',
      service: 'midlex-unified-backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ONLINE',
      service: 'Midlex Unified Core & Subsystems Platform',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      subsystems: ['workspace', 'legal-llp', 'hrms', 'cbt', 'ai', 'realty'],
    });
  });

  // Mount HRMS Subsystem (both directly and namespaced)
  app.use(hrmsApp);
  app.use('/api/hrms', hrmsApp);
  app.use('/hrms', hrmsApp);

  // Mount CBT Subsystem (both directly and namespaced)
  app.use(cbtApp);
  app.use('/api/cbt', cbtApp);
  app.use('/cbt', cbtApp);

  // Mount AI Subsystem (both directly and namespaced)
  if (aiApp) {
    app.use(aiApp);
    app.use('/api/ai', aiApp);
    app.use('/ai', aiApp);
  }

  console.log('[Unified Backend] HRMS, CBT, and AI subsystems successfully mounted into monolithic API gateway.');
}
