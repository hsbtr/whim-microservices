import { NestFactory } from '@nestjs/core';
import { DevopsModule } from './devops.module';
import { VersioningType } from '@nestjs/common';
import {
  TransformInterceptor,
  AllExceptionsFilter,
  HttpExceptionFilter,
} from '@comm/comm';
import { generateDocument } from './doc';

async function bootstrap() {
  const app = await NestFactory.create(DevopsModule);
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
  app.enableVersioning({
    type: VersioningType.URI,
  });

  generateDocument(app);
  await app.listen(3001);
}
bootstrap();
