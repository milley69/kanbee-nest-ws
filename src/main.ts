import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';

import * as fs from 'fs';
import { AppModule } from './app.module';

const PORT = process.env.POST || 3555;

const bootstrap = async () => {
  const app =
    process.env.NODE_ENV === 'development'
      ? await NestFactory.create(AppModule, {
          httpsOptions: {
            key: fs.readFileSync('./.https/localhost-key.pem'),
            cert: fs.readFileSync('./.https/localhost.pem'),
          },
        })
      : await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: ['https://localhost:3000', 'https://kanbee.milley.uno'],
    credentials: true,
  });

  // app.setGlobalPrefix('/v1/api');

  app.useGlobalInterceptors();

  await app.listen(PORT);
  // console.log(`server start on http://localhost:${PORT}/v1/api`);
  console.log(`Application is running on: ${await app.getUrl()}/`);
};

bootstrap();
