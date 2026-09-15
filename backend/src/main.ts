import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';
import { environment } from './config/environment';

async function bootstrap() {
  environment.validate();
  // Las fotos se almacenan como data URL. Un archivo de 3 MB crece al
  // codificarse en base64, por lo que el límite predeterminado de 100 KB de
  // Express no es suficiente.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  configureApp(app);
  await app.listen(environment.port);
}
void bootstrap().catch((error: unknown) => {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: string }).code
      : undefined;
  if (code === 'EADDRINUSE') {
    console.error(
      'El puerto 3001 ya está en uso. El backend ya está iniciado o existe otra instancia. Cierre la instancia anterior antes de iniciar otra.',
    );
  } else {
    console.error('No fue posible iniciar el backend.', error);
  }
  process.exitCode = 1;
});
