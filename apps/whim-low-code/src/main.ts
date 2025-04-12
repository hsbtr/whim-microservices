import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import {
  TransformInterceptor,
  AllExceptionsFilter,
  HttpExceptionFilter,
} from '@comm/comm';
import { generateDocument } from './doc';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());
  app.enableVersioning({
    type: VersioningType.URI,
  });

  generateDocument(app);

  // 添加热更新
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }

  await app.listen(3000);
}
bootstrap();
