import { FastifyInstance } from 'fastify';
import authRoutes from './auth/index.js';
import usersRoutes from './users/index.js';
import vehiclesRoutes from './vehicles/index.js';
import sessionsRoutes from './sessions/index.js';
import segmentsRoutes from './segments/index.js';
import socialRoutes from './social/index.js';

export async function registerRoutes(fastify: FastifyInstance) {
  // API v1
  await fastify.register(
    async (app) => {
      await app.register(authRoutes, { prefix: '/auth' });
      await app.register(usersRoutes, { prefix: '/users' });
      await app.register(vehiclesRoutes, { prefix: '/vehicles' });
      await app.register(sessionsRoutes, { prefix: '/sessions' });
      await app.register(segmentsRoutes, { prefix: '/segments' });
      await app.register(socialRoutes, { prefix: '/social' });
    },
    { prefix: '/api/v1' }
  );
}
