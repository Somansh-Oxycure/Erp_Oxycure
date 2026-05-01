import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { ProposalsService } from './proposals/proposals.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  // ─── Ensure upload directories exist ─────────────────────────────────────
  ProposalsService.ensureUploadDir();

  // ─── Serve uploaded files as static assets ───────────────────────────────
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // ─── Security ──────────────────────────────────────────────────────────────
  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: configService.get('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Global Prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── Validation ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Filters & Interceptors ────────────────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // ─── Swagger ───────────────────────────────────────────────────────────────
  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Oxycure ERP API')
      .setDescription('Oxycure ERP Phase 1 — Lead to Order API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // ─── Env-var validation ──────────────────────────────────────────────────
  const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missing  = required.filter((k) => !configService.get<string>(k));
  if (missing.length) {
    console.error(`\n❌  Missing required environment variables: ${missing.join(', ')}\n`);
    process.exit(1);
  }

  // ─── Listen ────────────────────────────────────────────────────────────────
  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);

  console.log(`\n🚀 Oxycure API running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger docs:          http://localhost:${port}/api/docs\n`);
}

bootstrap();
