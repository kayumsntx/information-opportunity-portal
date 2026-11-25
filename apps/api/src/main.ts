import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());

  // Input Validation & Transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS Configuration
  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins = frontendUrl
    ? [frontendUrl, 'http://localhost:3000']
    : ['http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Information & Opportunity Portal API')
    .setDescription(
      'REST API documentation for Information & Opportunity Portal backend',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Start HTTP Server
  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');

  console.log(`API running at http://0.0.0.0:${port}`);
  console.log(`Swagger documentation available at http://0.0.0.0:${port}/api/docs`);
}

void bootstrap();
