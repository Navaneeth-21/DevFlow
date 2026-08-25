import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.use(helmet());

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  app.setGlobalPrefix(process.env.API_PREFIX!);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: process.env.API_VERSION!,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Removes properties that are not defined in your DTO.

      transform: true, // Automatically converts values into the types declared in your DTO.

      forbidNonWhitelisted: true, // Instead of silently removing unknown fields, this option throws a 400 Bad Request

      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
