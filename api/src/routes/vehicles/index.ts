import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { authMiddleware } from '../../middleware/auth.js';

const createVehicleSchema = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  color: z.string().max(50).optional(),
  licensePlate: z.string().max(20).optional(),
  photoUrl: z.string().url().optional(),
  engineType: z.enum(['essence', 'diesel', 'electrique', 'hybride']).optional(),
  horsepower: z.number().int().positive().optional(),
});

const updateVehicleSchema = createVehicleSchema.partial();

export default async function vehiclesRoutes(fastify: FastifyInstance) {
  // GET /vehicles - Liste des véhicules de l'utilisateur
  fastify.get('/', {
    schema: {
      tags: ['Vehicles'],
      summary: 'Liste des véhicules de l\'utilisateur',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const result = await db.query(
        `SELECT id, brand, model, year, color, license_plate, photo_url,
                engine_type, horsepower, total_distance_km, total_duration_seconds,
                total_sessions, is_primary, created_at
         FROM vehicles
         WHERE user_id = $1 AND is_active = true
         ORDER BY is_primary DESC, created_at DESC`,
        [request.user!.sub]
      );

      return reply.send({
        vehicles: result.rows.map((v) => ({
          id: v.id,
          brand: v.brand,
          model: v.model,
          year: v.year,
          color: v.color,
          licensePlate: v.license_plate,
          photoUrl: v.photo_url,
          engineType: v.engine_type,
          horsepower: v.horsepower,
          stats: {
            totalDistanceKm: parseFloat(v.total_distance_km),
            totalDurationSeconds: v.total_duration_seconds,
            totalSessions: v.total_sessions,
          },
          isPrimary: v.is_primary,
          createdAt: v.created_at,
        })),
      });
    },
  });

  // POST /vehicles - Créer un véhicule
  fastify.post('/', {
    schema: {
      tags: ['Vehicles'],
      summary: 'Créer un nouveau véhicule',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['brand', 'model'],
        properties: {
          brand: { type: 'string' },
          model: { type: 'string' },
          year: { type: 'integer' },
          color: { type: 'string' },
          licensePlate: { type: 'string' },
          photoUrl: { type: 'string' },
          engineType: { type: 'string', enum: ['essence', 'diesel', 'electrique', 'hybride'] },
          horsepower: { type: 'integer' },
        },
      },
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const body = createVehicleSchema.parse(request.body);

      // Vérifier si l'utilisateur a déjà des véhicules
      const existingVehicles = await db.query(
        'SELECT COUNT(*) as count FROM vehicles WHERE user_id = $1 AND is_active = true',
        [request.user!.sub]
      );

      const isPrimary = parseInt(existingVehicles.rows[0].count, 10) === 0;

      const result = await db.query(
        `INSERT INTO vehicles (user_id, brand, model, year, color, license_plate, photo_url, engine_type, horsepower, is_primary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, brand, model, year, color, license_plate, photo_url, engine_type, horsepower, is_primary, created_at`,
        [
          request.user!.sub,
          body.brand,
          body.model,
          body.year,
          body.color,
          body.licensePlate,
          body.photoUrl,
          body.engineType,
          body.horsepower,
          isPrimary,
        ]
      );

      const vehicle = result.rows[0];

      return reply.status(201).send({
        vehicle: {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          licensePlate: vehicle.license_plate,
          photoUrl: vehicle.photo_url,
          engineType: vehicle.engine_type,
          horsepower: vehicle.horsepower,
          isPrimary: vehicle.is_primary,
          createdAt: vehicle.created_at,
        },
      });
    },
  });

  // GET /vehicles/:id - Détails d'un véhicule
  fastify.get('/:id', {
    schema: {
      tags: ['Vehicles'],
      summary: 'Obtenir les détails d\'un véhicule',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await db.query(
        `SELECT id, brand, model, year, color, license_plate, photo_url,
                engine_type, horsepower, total_distance_km, total_duration_seconds,
                total_sessions, is_primary, created_at
         FROM vehicles
         WHERE id = $1 AND user_id = $2 AND is_active = true`,
        [id, request.user!.sub]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Véhicule non trouvé');
      }

      const v = result.rows[0];

      return reply.send({
        vehicle: {
          id: v.id,
          brand: v.brand,
          model: v.model,
          year: v.year,
          color: v.color,
          licensePlate: v.license_plate,
          photoUrl: v.photo_url,
          engineType: v.engine_type,
          horsepower: v.horsepower,
          stats: {
            totalDistanceKm: parseFloat(v.total_distance_km),
            totalDurationSeconds: v.total_duration_seconds,
            totalSessions: v.total_sessions,
          },
          isPrimary: v.is_primary,
          createdAt: v.created_at,
        },
      });
    },
  });

  // PATCH /vehicles/:id - Modifier un véhicule
  fastify.patch('/:id', {
    schema: {
      tags: ['Vehicles'],
      summary: 'Modifier un véhicule',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = updateVehicleSchema.parse(request.body);

      // Vérifier que le véhicule appartient à l'utilisateur
      const existing = await db.query(
        'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2 AND is_active = true',
        [id, request.user!.sub]
      );

      if (existing.rows.length === 0) {
        throw new NotFoundError('Véhicule non trouvé');
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      const fieldMap: Record<string, string> = {
        brand: 'brand',
        model: 'model',
        year: 'year',
        color: 'color',
        licensePlate: 'license_plate',
        photoUrl: 'photo_url',
        engineType: 'engine_type',
        horsepower: 'horsepower',
      };

      for (const [key, dbField] of Object.entries(fieldMap)) {
        if (body[key as keyof typeof body] !== undefined) {
          updates.push(`${dbField} = $${paramIndex++}`);
          values.push(body[key as keyof typeof body]);
        }
      }

      if (updates.length === 0) {
        return reply.send({ message: 'Aucune modification' });
      }

      values.push(id);

      const result = await db.query(
        `UPDATE vehicles SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, brand, model, year, color, license_plate, photo_url, engine_type, horsepower, is_primary`,
        values
      );

      const vehicle = result.rows[0];

      return reply.send({
        vehicle: {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          licensePlate: vehicle.license_plate,
          photoUrl: vehicle.photo_url,
          engineType: vehicle.engine_type,
          horsepower: vehicle.horsepower,
          isPrimary: vehicle.is_primary,
        },
      });
    },
  });

  // DELETE /vehicles/:id - Supprimer un véhicule
  fastify.delete('/:id', {
    schema: {
      tags: ['Vehicles'],
      summary: 'Supprimer un véhicule',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      // Vérifier que le véhicule appartient à l'utilisateur
      const existing = await db.query(
        'SELECT id, is_primary FROM vehicles WHERE id = $1 AND user_id = $2 AND is_active = true',
        [id, request.user!.sub]
      );

      if (existing.rows.length === 0) {
        throw new NotFoundError('Véhicule non trouvé');
      }

      // Soft delete
      await db.query(
        'UPDATE vehicles SET is_active = false WHERE id = $1',
        [id]
      );

      // Si c'était le véhicule primaire, en assigner un autre
      if (existing.rows[0].is_primary) {
        await db.query(
          `UPDATE vehicles SET is_primary = true
           WHERE user_id = $1 AND is_active = true AND id != $2
           ORDER BY created_at
           LIMIT 1`,
          [request.user!.sub, id]
        );
      }

      return reply.status(204).send();
    },
  });

  // POST /vehicles/:id/set-primary - Définir comme véhicule principal
  fastify.post('/:id/set-primary', {
    schema: {
      tags: ['Vehicles'],
      summary: 'Définir comme véhicule principal',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      await db.transaction(async (client) => {
        // Vérifier que le véhicule existe et appartient à l'utilisateur
        const existing = await client.query(
          'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2 AND is_active = true',
          [id, request.user!.sub]
        );

        if (existing.rows.length === 0) {
          throw new NotFoundError('Véhicule non trouvé');
        }

        // Retirer le statut primaire des autres véhicules
        await client.query(
          'UPDATE vehicles SET is_primary = false WHERE user_id = $1',
          [request.user!.sub]
        );

        // Définir ce véhicule comme primaire
        await client.query(
          'UPDATE vehicles SET is_primary = true WHERE id = $1',
          [id]
        );
      });

      return reply.send({ message: 'Véhicule défini comme principal' });
    },
  });
}
