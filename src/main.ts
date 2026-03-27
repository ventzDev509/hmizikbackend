import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ServiceAccount } from "firebase-admin";
import * as fs from 'fs';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: process.env.LINK,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  try {
  const configPath = join(process.cwd(), 'firebase-adminsdk.json');
    // Verifikasyon si fichye a la tout bon vre
    if (!fs.existsSync(configPath)) {
      throw new Error(`Fichye Firebase la manke nan: ${configPath}`);
    }

    const serviceAccount = JSON.parse(
      fs.readFileSync(configPath, 'utf8')
    ) as ServiceAccount;

   console.log('2. Nest App kreye!');
    if (!admin.apps.length) { 
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin inisyalize ak siksè!');
    }
  } catch (error) {
    console.error('Erè Firebase Admin:', error.message);
  }

  await app.listen(process.env.PORT ?? 3000);
  console.log(` Sèvè H-MIZIK ap kouri sou pòt: ${process.env.PORT ?? 3000}`);
}
bootstrap();