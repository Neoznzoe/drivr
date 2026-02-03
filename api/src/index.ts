import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { db } from './lib/db.js';
import { errorHandler } from './lib/errors.js';
import { registerRoutes } from './routes/index.js';
import { registerSwagger } from './lib/swagger.js';

async function bootstrap() {
  const fastify = Fastify({
    logger: {
      level: config.isDev ? 'debug' : 'info',
    },
  });

  // Plugins de sécurité
  await fastify.register(helmet);
  await fastify.register(cors, {
    origin: config.isDev ? true : config.corsOrigins,
    credentials: true,
  });
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Documentation Swagger
  await registerSwagger(fastify);

  // Gestionnaire d'erreurs global
  fastify.setErrorHandler(errorHandler);

  // Décorateur pour la connexion DB
  fastify.decorate('db', db);

  // Enregistrement des routes
  await registerRoutes(fastify);

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Démarrage du serveur
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`🚗 DRIVR API running on http://localhost:${config.port}`);
    console.log(`📚 Documentation: http://localhost:${config.port}/docs`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
