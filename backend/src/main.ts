import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

// Prisma returns BigInt for closedAt — make JSON.stringify handle it
(BigInt.prototype as any).toJSON = function () { return Number(this); };

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind nginx → Docker on EC2, trust the proxy so req.ip reflects the real
  // client (from X-Forwarded-For) — without this the rate limiter buckets every
  // request under the proxy IP. nginx must set X-Forwarded-For.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL,
      'https://life.rgbindia.com',
      'https://staging.life.rgbindia.com',
      'http://localhost:3000',
    ].filter(Boolean),
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Backend running on port ${port}`);
}
bootstrap();
