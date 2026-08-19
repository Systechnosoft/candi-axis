import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BootstrapService } from './bootstrap/bootstrap.service';
import * as dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for the UI dev origin
  const origins = process.env.UI_ORIGIN
    ? process.env.UI_ORIGIN.split(',').map((o) => o.trim())
    : 'http://localhost:3001';

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  // Run idempotent bootstrap (roles, modules, first admin user)
  const bootstrapService = app.get(BootstrapService);
  await bootstrapService.run();

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`CA API running on port ${port} and listening on 0.0.0.0`);
}
bootstrap();
