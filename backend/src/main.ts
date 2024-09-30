import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS para permitir todas las solicitudes desde cualquier origen
  app.enableCors({
    origin: '*',  // Cambia '*' por la URL de tu frontend en producción para mayor seguridad
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const server = app.getHttpAdapter().getInstance();

  // Servir archivos estáticos
  server.use(express.static(join(__dirname, '../public')));

  // Middleware para servir index.html solo si la ruta no coincide con una API
  server.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(__dirname, '../public', 'index.html'));
    } else {
      next();
    }
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
