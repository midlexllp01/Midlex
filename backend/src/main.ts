import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { mountSubsystems } from './subsystems/index.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'https://midlex-backend.onrender.com',
    'https://api.thispage.xyz',
    'https://api.this.xyz',
    'https://midlex.thispage.xyz',
    'https://midlex.this.xyz',
    'https://mobile.thispage.xyz',
    'https://mobile.this.xyz',
    'https://admin.thispage.xyz',
    'https://admin.this.xyz',
    'https://lawyers.thispage.xyz',
    'https://lawyers.this.xyz',
    'https://cbt.thispage.xyz',
    'https://cbt.this.xyz',
    'https://media.thispage.xyz',
    'https://media.this.xyz',
    'https://mip.thispage.xyz',
    'https://mip.this.xyz',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.thispage.xyz') ||
        origin.endsWith('.this.xyz') ||
        origin.includes('thispage.xyz') ||
        origin.includes('this.xyz') ||
        origin.endsWith('.midlex.xyz') ||
        origin.includes('midlex.xyz') ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
      forbidUnknownValues: false,
    }),
  );

  const expressApp = app.getHttpAdapter().getInstance();
  mountSubsystems(expressApp);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`[NestApplication] Server listening on http://0.0.0.0:${port}`);
}
bootstrap().catch((err) => {
  console.error('[startup] Backend failed to start', err);
  process.exit(1);
});
