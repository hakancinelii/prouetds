import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: false,
  }));
  app.enableCors({
    origin: true, // Allow all origins (v3 style, for testing)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger API Docs
  const config = new DocumentBuilder()
    .setTitle('ProUETDS API')
    .setDescription(
      'Multi-Tenant SaaS API for UETDS (Tarifesiz Yolcu Taşımacılığı) declarations',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'CRM-API-Key')
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Trips', 'Trip management & UETDS workflow')
    .addTag('Passengers', 'Passenger management')
    .addTag('UETDS', 'Direct UETDS service calls')
    .addTag('CRM', 'External CRM integration API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 ProUETDS Backend running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
// Railway Rebuild Trigger - CORS OPENED
