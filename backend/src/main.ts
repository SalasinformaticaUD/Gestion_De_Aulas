import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { environment } from './config/environment';

async function bootstrap() {
  environment.validate();
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(environment.port);
}
void bootstrap();
