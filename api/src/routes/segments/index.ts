import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import { NotFoundError } from '../../lib/errors.js';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.js';

const createSegmentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(['col', 'autoroute', 'nationale', 'departementale', 'custom']).default('custom'),
  route: z.array(
    z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
  ).min(2),
});

export default async function segmentsRoutes(fastify: FastifyInstance) {
  // GET /segments - Liste des segments
  fastify.get('/', {
    schema: {
      tags: ['Segments'],
      summary: 'Liste des segments',
    },
    handler: async (request, reply) => {
      const { type, limit = 50, offset = 0 } = request.query as {
        type?: string;
        limit?: number;
        offset?: number;
      };

      let query = `
        SELECT s.id, s.name, s.description, s.type, s.distance_km,
               s.elevation_gain, s.total_attempts, s.is_official,
               ST_AsGeoJSON(s.start_point) as start_point,
               ST_AsGeoJSON(s.end_point) as end_point,
               u.username as created_by_username
        FROM segments s
        LEFT JOIN users u ON s.created_by = u.id
        WHERE s.is_active = true
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (type) {
        query += ` AND s.type = $${paramIndex++}`;
        params.push(type);
      }

      query += ` ORDER BY s.total_attempts DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      params.push(limit, offset);

      const result = await db.query(query, params);

      return reply.send({
        segments: result.rows.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          type: s.type,
          distanceKm: parseFloat(s.distance_km),
          elevationGain: s.elevation_gain,
          totalAttempts: s.total_attempts,
          isOfficial: s.is_official,
          startPoint: s.start_point ? JSON.parse(s.start_point) : null,
          endPoint: s.end_point ? JSON.parse(s.end_point) : null,
          createdByUsername: s.created_by_username,
        })),
      });
    },
  });

  // POST /segments - Créer un segment personnalisé
  fastify.post('/', {
    schema: {
      tags: ['Segments'],
      summary: 'Créer un segment personnalisé',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const body = createSegmentSchema.parse(request.body);

      // Construire le LineString WKT
      const routeWkt = `LINESTRING(${body.route
        .map((p) => `${p.longitude} ${p.latitude}`)
        .join(', ')})`;

      const startPoint = body.route[0];
      const endPoint = body.route[body.route.length - 1];

      // Calculer la distance
      const distanceResult = await db.query(
        `SELECT ST_Length(ST_GeomFromText($1, 4326)::geography) / 1000 as distance_km`,
        [routeWkt]
      );
      const distanceKm = distanceResult.rows[0].distance_km;

      const result = await db.query(
        `INSERT INTO segments (created_by, name, description, type, route, start_point, end_point, distance_km)
         VALUES ($1, $2, $3, $4,
                 ST_GeomFromText($5, 4326)::geography,
                 ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
                 ST_SetSRID(ST_MakePoint($8, $9), 4326)::geography,
                 $10)
         RETURNING id, name, type, distance_km, created_at`,
        [
          request.user!.sub,
          body.name,
          body.description,
          body.type,
          routeWkt,
          startPoint.longitude,
          startPoint.latitude,
          endPoint.longitude,
          endPoint.latitude,
          distanceKm,
        ]
      );

      return reply.status(201).send({
        segment: {
          id: result.rows[0].id,
          name: result.rows[0].name,
          type: result.rows[0].type,
          distanceKm: parseFloat(result.rows[0].distance_km),
          createdAt: result.rows[0].created_at,
        },
      });
    },
  });

  // GET /segments/:id - Détails d'un segment
  fastify.get('/:id', {
    schema: {
      tags: ['Segments'],
      summary: 'Obtenir les détails d\'un segment',
    },
    preHandler: optionalAuthMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await db.query(
        `SELECT s.*, ST_AsGeoJSON(s.route) as route_geojson,
                ST_AsGeoJSON(s.start_point) as start_point,
                ST_AsGeoJSON(s.end_point) as end_point,
                u.username as created_by_username
         FROM segments s
         LEFT JOIN users u ON s.created_by = u.id
         WHERE s.id = $1 AND s.is_active = true`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Segment non trouvé');
      }

      const s = result.rows[0];

      return reply.send({
        segment: {
          id: s.id,
          name: s.name,
          description: s.description,
          type: s.type,
          distanceKm: parseFloat(s.distance_km),
          elevationGain: s.elevation_gain,
          elevationLoss: s.elevation_loss,
          totalAttempts: s.total_attempts,
          isOfficial: s.is_official,
          route: s.route_geojson ? JSON.parse(s.route_geojson) : null,
          startPoint: s.start_point ? JSON.parse(s.start_point) : null,
          endPoint: s.end_point ? JSON.parse(s.end_point) : null,
          createdByUsername: s.created_by_username,
          createdAt: s.created_at,
        },
      });
    },
  });

  // GET /segments/:id/leaderboard - Classement d'un segment
  fastify.get('/:id/leaderboard', {
    schema: {
      tags: ['Segments'],
      summary: 'Obtenir le classement d\'un segment',
    },
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const { limit = 50 } = request.query as { limit?: number };

      const result = await db.query(
        `SELECT sr.id, sr.duration_seconds, sr.avg_speed_kmh, sr.max_speed_kmh,
                sr.started_at, sr.completed_at,
                u.id as user_id, u.username, u.display_name, u.avatar_url,
                v.brand as vehicle_brand, v.model as vehicle_model,
                ROW_NUMBER() OVER (ORDER BY sr.duration_seconds ASC) as rank
         FROM segment_records sr
         JOIN users u ON sr.user_id = u.id
         JOIN vehicles v ON sr.vehicle_id = v.id
         WHERE sr.segment_id = $1
         ORDER BY sr.duration_seconds ASC
         LIMIT $2`,
        [id, limit]
      );

      return reply.send({
        leaderboard: result.rows.map((r) => ({
          rank: parseInt(r.rank, 10),
          id: r.id,
          durationSeconds: r.duration_seconds,
          avgSpeedKmh: parseFloat(r.avg_speed_kmh),
          maxSpeedKmh: r.max_speed_kmh ? parseFloat(r.max_speed_kmh) : null,
          user: {
            id: r.user_id,
            username: r.username,
            displayName: r.display_name,
            avatarUrl: r.avatar_url,
          },
          vehicle: {
            brand: r.vehicle_brand,
            model: r.vehicle_model,
          },
          completedAt: r.completed_at,
        })),
      });
    },
  });

  // GET /segments/:id/my-records - Mes records sur un segment
  fastify.get('/:id/my-records', {
    schema: {
      tags: ['Segments'],
      summary: 'Mes records sur un segment',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await db.query(
        `SELECT sr.*, v.brand as vehicle_brand, v.model as vehicle_model
         FROM segment_records sr
         JOIN vehicles v ON sr.vehicle_id = v.id
         WHERE sr.segment_id = $1 AND sr.user_id = $2
         ORDER BY sr.duration_seconds ASC`,
        [id, request.user!.sub]
      );

      return reply.send({
        records: result.rows.map((r) => ({
          id: r.id,
          durationSeconds: r.duration_seconds,
          avgSpeedKmh: parseFloat(r.avg_speed_kmh),
          maxSpeedKmh: r.max_speed_kmh ? parseFloat(r.max_speed_kmh) : null,
          vehicle: {
            brand: r.vehicle_brand,
            model: r.vehicle_model,
          },
          completedAt: r.completed_at,
        })),
      });
    },
  });
}
