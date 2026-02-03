import { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

export async function registerSwagger(fastify: FastifyInstance) {
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'DRIVR API',
        description: 'API pour l\'application DRIVR - Strava pour automobile',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Serveur de développement',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'PASETO',
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Authentification et gestion de compte' },
        { name: 'Users', description: 'Gestion des utilisateurs' },
        { name: 'Vehicles', description: 'Gestion des véhicules' },
        { name: 'Sessions', description: 'Sessions de conduite' },
        { name: 'Segments', description: 'Segments de route' },
        { name: 'Social', description: 'Fonctionnalités sociales' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
}
