import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.js';

const createSessionSchema = z.object({
  vehicleId: z.string().uuid(),
  title: z.string().max(200).optional(),
  startPoint: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

const addPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  speedKmh: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().min(0).optional(),
  recordedAt: z.string().datetime().optional(),
});

const completeSessionSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  visibility: z.enum(['private', 'friends', 'public']).default('private'),
  endPoint: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export default async function sessionsRoutes(fastify: FastifyInstance) {
  // POST /sessions - Démarrer une session
  fastify.post('/', {
    schema: {
      tags: ['Sessions'],
      summary: 'Démarrer une nouvelle session de conduite',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const body = createSessionSchema.parse(request.body);

      // Vérifier que le véhicule appartient à l'utilisateur
      const vehicleResult = await db.query(
        'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2 AND is_active = true',
        [body.vehicleId, request.user!.sub]
      );

      if (vehicleResult.rows.length === 0) {
        throw new BadRequestError('Véhicule non trouvé ou non autorisé');
      }

      // Vérifier qu'il n'y a pas de session active
      const activeSession = await db.query(
        "SELECT id FROM sessions WHERE user_id = $1 AND status IN ('active', 'paused')",
        [request.user!.sub]
      );

      if (activeSession.rows.length > 0) {
        throw new BadRequestError('Une session est déjà en cours');
      }

      // Créer la session
      const result = await db.query(
        `INSERT INTO sessions (user_id, vehicle_id, title, start_point, status)
         VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, 'active')
         RETURNING id, status, started_at`,
        [
          request.user!.sub,
          body.vehicleId,
          body.title,
          body.startPoint.longitude,
          body.startPoint.latitude,
        ]
      );

      const session = result.rows[0];

      return reply.status(201).send({
        session: {
          id: session.id,
          status: session.status,
          startedAt: session.started_at,
        },
      });
    },
  });

  // POST /sessions/:id/points - Ajouter un point GPS
  fastify.post('/:id/points', {
    schema: {
      tags: ['Sessions'],
      summary: 'Ajouter un point GPS à la session',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = addPointSchema.parse(request.body);

      // Vérifier que la session existe et appartient à l'utilisateur
      const sessionResult = await db.query(
        "SELECT id, status FROM sessions WHERE id = $1 AND user_id = $2 AND status = 'active'",
        [id, request.user!.sub]
      );

      if (sessionResult.rows.length === 0) {
        throw new NotFoundError('Session non trouvée ou non active');
      }

      // Obtenir le prochain numéro de séquence
      const seqResult = await db.query(
        'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM session_points WHERE session_id = $1',
        [id]
      );
      const sequenceNumber = seqResult.rows[0].next_seq;

      // Ajouter le point
      await db.query(
        `INSERT INTO session_points (session_id, point, latitude, longitude, altitude, speed_kmh, heading, accuracy, recorded_at, sequence_number)
         VALUES ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()), $9)`,
        [
          id,
          body.latitude,
          body.longitude,
          body.altitude,
          body.speedKmh,
          body.heading,
          body.accuracy,
          body.recordedAt,
          sequenceNumber,
        ]
      );

      return reply.status(201).send({ success: true, sequenceNumber });
    },
  });

  // POST /sessions/:id/points/batch - Ajouter plusieurs points GPS
  fastify.post('/:id/points/batch', {
    schema: {
      tags: ['Sessions'],
      summary: 'Ajouter plusieurs points GPS à la session',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const points = z.array(addPointSchema).parse(request.body);

      if (points.length === 0) {
        throw new BadRequestError('Aucun point fourni');
      }

      // Vérifier que la session existe
      const sessionResult = await db.query(
        "SELECT id FROM sessions WHERE id = $1 AND user_id = $2 AND status = 'active'",
        [id, request.user!.sub]
      );

      if (sessionResult.rows.length === 0) {
        throw new NotFoundError('Session non trouvée ou non active');
      }

      // Obtenir le prochain numéro de séquence
      const seqResult = await db.query(
        'SELECT COALESCE(MAX(sequence_number), 0) as current_seq FROM session_points WHERE session_id = $1',
        [id]
      );
      let sequenceNumber = seqResult.rows[0].current_seq;

      // Insérer tous les points
      const values: unknown[] = [];
      const placeholders: string[] = [];

      points.forEach((point, index) => {
        sequenceNumber++;
        const offset = index * 9;
        placeholders.push(
          `($${offset + 1}, ST_SetSRID(ST_MakePoint($${offset + 3}, $${offset + 2}), 4326)::geography, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, COALESCE($${offset + 8}, NOW()), $${offset + 9})`
        );
        values.push(
          id,
          point.latitude,
          point.longitude,
          point.altitude ?? null,
          point.speedKmh ?? null,
          point.heading ?? null,
          point.accuracy ?? null,
          point.recordedAt ?? null,
          sequenceNumber
        );
      });

      await db.query(
        `INSERT INTO session_points (session_id, point, latitude, longitude, altitude, speed_kmh, heading, accuracy, recorded_at, sequence_number)
         VALUES ${placeholders.join(', ')}`,
        values
      );

      return reply.status(201).send({ success: true, pointsAdded: points.length });
    },
  });

  // POST /sessions/:id/pause - Mettre en pause
  fastify.post('/:id/pause', {
    schema: {
      tags: ['Sessions'],
      summary: 'Mettre la session en pause',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await db.query(
        `UPDATE sessions SET status = 'paused', paused_at = NOW()
         WHERE id = $1 AND user_id = $2 AND status = 'active'
         RETURNING id, status, paused_at`,
        [id, request.user!.sub]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Session non trouvée ou non active');
      }

      return reply.send({ session: result.rows[0] });
    },
  });

  // POST /sessions/:id/resume - Reprendre
  fastify.post('/:id/resume', {
    schema: {
      tags: ['Sessions'],
      summary: 'Reprendre la session',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await db.query(
        `UPDATE sessions SET status = 'active', paused_at = NULL
         WHERE id = $1 AND user_id = $2 AND status = 'paused'
         RETURNING id, status`,
        [id, request.user!.sub]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Session non trouvée ou non en pause');
      }

      return reply.send({ session: result.rows[0] });
    },
  });

  // POST /sessions/:id/complete - Terminer la session
  fastify.post('/:id/complete', {
    schema: {
      tags: ['Sessions'],
      summary: 'Terminer et finaliser la session',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = completeSessionSchema.parse(request.body);

      // Vérifier que la session existe
      const sessionResult = await db.query(
        "SELECT id, vehicle_id, started_at FROM sessions WHERE id = $1 AND user_id = $2 AND status IN ('active', 'paused')",
        [id, request.user!.sub]
      );

      if (sessionResult.rows.length === 0) {
        throw new NotFoundError('Session non trouvée ou déjà terminée');
      }

      const session = sessionResult.rows[0];

      // Calculer les statistiques depuis les points
      const statsResult = await db.query(
        `SELECT
           COUNT(*) as point_count,
           AVG(speed_kmh) as avg_speed,
           MAX(speed_kmh) as max_speed,
           ST_Length(ST_MakeLine(point::geometry ORDER BY sequence_number)::geography) / 1000 as distance_km
         FROM session_points
         WHERE session_id = $1`,
        [id]
      );

      const stats = statsResult.rows[0];
      const durationSeconds = Math.floor(
        (new Date().getTime() - new Date(session.started_at).getTime()) / 1000
      );

      // Construire le tracé
      const routeResult = await db.query(
        `SELECT ST_AsText(ST_MakeLine(point::geometry ORDER BY sequence_number)) as route_wkt
         FROM session_points WHERE session_id = $1`,
        [id]
      );

      // Mettre à jour la session
      const updateResult = await db.query(
        `UPDATE sessions SET
           status = 'completed',
           completed_at = NOW(),
           title = COALESCE($3, title),
           description = $4,
           visibility = $5,
           end_point = ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography,
           distance_km = $8,
           duration_seconds = $9,
           avg_speed_kmh = $10,
           max_speed_kmh = $11,
           route = ST_GeomFromText($12, 4326)::geography
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [
          id,
          request.user!.sub,
          body.title,
          body.description,
          body.visibility,
          body.endPoint.latitude,
          body.endPoint.longitude,
          stats.distance_km || 0,
          durationSeconds,
          stats.avg_speed || 0,
          stats.max_speed || 0,
          routeResult.rows[0]?.route_wkt,
        ]
      );

      // Mettre à jour les stats utilisateur
      await db.query(
        `UPDATE users SET
           total_distance_km = total_distance_km + $2,
           total_duration_seconds = total_duration_seconds + $3,
           total_sessions = total_sessions + 1
         WHERE id = $1`,
        [request.user!.sub, stats.distance_km || 0, durationSeconds]
      );

      // Mettre à jour les stats véhicule
      await db.query(
        `UPDATE vehicles SET
           total_distance_km = total_distance_km + $2,
           total_duration_seconds = total_duration_seconds + $3,
           total_sessions = total_sessions + 1
         WHERE id = $1`,
        [session.vehicle_id, stats.distance_km || 0, durationSeconds]
      );

      return reply.send({
        session: {
          id: updateResult.rows[0].id,
          status: updateResult.rows[0].status,
          title: updateResult.rows[0].title,
          visibility: updateResult.rows[0].visibility,
          stats: {
            distanceKm: parseFloat(updateResult.rows[0].distance_km),
            durationSeconds: updateResult.rows[0].duration_seconds,
            avgSpeedKmh: parseFloat(updateResult.rows[0].avg_speed_kmh),
            maxSpeedKmh: parseFloat(updateResult.rows[0].max_speed_kmh),
          },
          completedAt: updateResult.rows[0].completed_at,
        },
      });
    },
  });

  // GET /sessions - Liste des sessions de l'utilisateur
  fastify.get('/', {
    schema: {
      tags: ['Sessions'],
      summary: 'Liste des sessions de l\'utilisateur',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };

      const result = await db.query(
        `SELECT s.id, s.title, s.status, s.visibility, s.distance_km, s.duration_seconds,
                s.avg_speed_kmh, s.max_speed_kmh, s.started_at, s.completed_at,
                v.brand as vehicle_brand, v.model as vehicle_model,
                (SELECT COUNT(*) FROM likes WHERE session_id = s.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE session_id = s.id AND deleted_at IS NULL) as comments_count
         FROM sessions s
         JOIN vehicles v ON s.vehicle_id = v.id
         WHERE s.user_id = $1
         ORDER BY s.started_at DESC
         LIMIT $2 OFFSET $3`,
        [request.user!.sub, limit, offset]
      );

      return reply.send({
        sessions: result.rows.map((s) => ({
          id: s.id,
          title: s.title,
          status: s.status,
          visibility: s.visibility,
          stats: {
            distanceKm: parseFloat(s.distance_km || '0'),
            durationSeconds: s.duration_seconds || 0,
            avgSpeedKmh: parseFloat(s.avg_speed_kmh || '0'),
            maxSpeedKmh: parseFloat(s.max_speed_kmh || '0'),
          },
          vehicle: {
            brand: s.vehicle_brand,
            model: s.vehicle_model,
          },
          likesCount: parseInt(s.likes_count, 10),
          commentsCount: parseInt(s.comments_count, 10),
          startedAt: s.started_at,
          completedAt: s.completed_at,
        })),
      });
    },
  });

  // GET /sessions/:id - Détails d'une session
  fastify.get('/:id', {
    schema: {
      tags: ['Sessions'],
      summary: 'Obtenir les détails d\'une session',
    },
    preHandler: optionalAuthMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await db.query(
        `SELECT s.*, v.brand as vehicle_brand, v.model as vehicle_model, v.color as vehicle_color,
                u.username, u.display_name, u.avatar_url,
                ST_AsGeoJSON(s.route) as route_geojson,
                ST_X(s.start_point::geometry) as start_lng, ST_Y(s.start_point::geometry) as start_lat,
                ST_X(s.end_point::geometry) as end_lng, ST_Y(s.end_point::geometry) as end_lat,
                (SELECT COUNT(*) FROM likes WHERE session_id = s.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE session_id = s.id AND deleted_at IS NULL) as comments_count
         FROM sessions s
         JOIN vehicles v ON s.vehicle_id = v.id
         JOIN users u ON s.user_id = u.id
         WHERE s.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Session non trouvée');
      }

      const s = result.rows[0];

      // Vérifier les permissions de visibilité
      const isOwner = request.user?.sub === s.user_id;
      if (!isOwner) {
        if (s.visibility === 'private') {
          throw new ForbiddenError('Session privée');
        }
        if (s.visibility === 'friends' && request.user) {
          const friendshipResult = await db.query(
            `SELECT id FROM friendships
             WHERE status = 'accepted'
             AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
            [request.user.sub, s.user_id]
          );
          if (friendshipResult.rows.length === 0) {
            throw new ForbiddenError('Session réservée aux amis');
          }
        }
      }

      // Vérifier si l'utilisateur a liké
      let hasLiked = false;
      if (request.user) {
        const likeResult = await db.query(
          'SELECT id FROM likes WHERE session_id = $1 AND user_id = $2',
          [id, request.user.sub]
        );
        hasLiked = likeResult.rows.length > 0;
      }

      return reply.send({
        session: {
          id: s.id,
          title: s.title,
          description: s.description,
          status: s.status,
          visibility: s.visibility,
          stats: {
            distanceKm: parseFloat(s.distance_km || '0'),
            durationSeconds: s.duration_seconds || 0,
            avgSpeedKmh: parseFloat(s.avg_speed_kmh || '0'),
            maxSpeedKmh: parseFloat(s.max_speed_kmh || '0'),
          },
          route: s.route_geojson ? JSON.parse(s.route_geojson) : null,
          startPoint: s.start_lat ? { latitude: s.start_lat, longitude: s.start_lng } : null,
          endPoint: s.end_lat ? { latitude: s.end_lat, longitude: s.end_lng } : null,
          vehicle: {
            brand: s.vehicle_brand,
            model: s.vehicle_model,
            color: s.vehicle_color,
          },
          user: {
            id: s.user_id,
            username: s.username,
            displayName: s.display_name,
            avatarUrl: s.avatar_url,
          },
          likesCount: parseInt(s.likes_count, 10),
          commentsCount: parseInt(s.comments_count, 10),
          hasLiked,
          isOwner,
          startedAt: s.started_at,
          completedAt: s.completed_at,
        },
      });
    },
  });

  // DELETE /sessions/:id/cancel - Annuler une session en cours
  fastify.delete('/:id/cancel', {
    schema: {
      tags: ['Sessions'],
      summary: 'Annuler une session en cours',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await db.query(
        `UPDATE sessions SET status = 'cancelled'
         WHERE id = $1 AND user_id = $2 AND status IN ('active', 'paused')
         RETURNING id`,
        [id, request.user!.sub]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Session non trouvée ou déjà terminée');
      }

      return reply.status(204).send();
    },
  });
}
