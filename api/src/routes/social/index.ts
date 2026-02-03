import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { authMiddleware } from '../../middleware/auth.js';

const addCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().uuid().optional(),
});

export default async function socialRoutes(fastify: FastifyInstance) {
  // ================== FRIENDSHIPS ==================

  // GET /social/friends - Liste des amis
  fastify.get('/friends', {
    schema: {
      tags: ['Social'],
      summary: 'Liste des amis',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const result = await db.query(
        `SELECT
           CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END as friend_id,
           u.username, u.display_name, u.avatar_url,
           f.accepted_at
         FROM friendships f
         JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
         WHERE (f.requester_id = $1 OR f.addressee_id = $1)
         AND f.status = 'accepted'
         ORDER BY f.accepted_at DESC`,
        [request.user!.sub]
      );

      return reply.send({
        friends: result.rows.map((f) => ({
          id: f.friend_id,
          username: f.username,
          displayName: f.display_name,
          avatarUrl: f.avatar_url,
          friendsSince: f.accepted_at,
        })),
      });
    },
  });

  // GET /social/friends/requests - Demandes d'amis reçues
  fastify.get('/friends/requests', {
    schema: {
      tags: ['Social'],
      summary: 'Demandes d\'amis reçues',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const result = await db.query(
        `SELECT f.id, f.created_at, u.id as user_id, u.username, u.display_name, u.avatar_url
         FROM friendships f
         JOIN users u ON f.requester_id = u.id
         WHERE f.addressee_id = $1 AND f.status = 'pending'
         ORDER BY f.created_at DESC`,
        [request.user!.sub]
      );

      return reply.send({
        requests: result.rows.map((r) => ({
          id: r.id,
          user: {
            id: r.user_id,
            username: r.username,
            displayName: r.display_name,
            avatarUrl: r.avatar_url,
          },
          createdAt: r.created_at,
        })),
      });
    },
  });

  // POST /social/friends/request - Envoyer une demande d'ami
  fastify.post('/friends/request', {
    schema: {
      tags: ['Social'],
      summary: 'Envoyer une demande d\'ami',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
        },
      },
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { userId } = request.body as { userId: string };

      if (userId === request.user!.sub) {
        throw new BadRequestError('Vous ne pouvez pas vous envoyer une demande d\'ami');
      }

      // Vérifier que l'utilisateur existe
      const userResult = await db.query(
        'SELECT id FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new NotFoundError('Utilisateur non trouvé');
      }

      // Vérifier qu'il n'y a pas déjà une relation
      const existingResult = await db.query(
        `SELECT id, status FROM friendships
         WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
        [request.user!.sub, userId]
      );

      if (existingResult.rows.length > 0) {
        const status = existingResult.rows[0].status;
        if (status === 'accepted') {
          throw new ConflictError('Vous êtes déjà amis');
        }
        if (status === 'pending') {
          throw new ConflictError('Une demande est déjà en attente');
        }
        if (status === 'blocked') {
          throw new ForbiddenError('Impossible d\'envoyer une demande');
        }
      }

      const result = await db.query(
        `INSERT INTO friendships (requester_id, addressee_id)
         VALUES ($1, $2)
         RETURNING id, created_at`,
        [request.user!.sub, userId]
      );

      return reply.status(201).send({
        request: {
          id: result.rows[0].id,
          createdAt: result.rows[0].created_at,
        },
      });
    },
  });

  // POST /social/friends/accept/:id - Accepter une demande
  fastify.post('/friends/accept/:id', {
    schema: {
      tags: ['Social'],
      summary: 'Accepter une demande d\'ami',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await db.query(
        `UPDATE friendships SET status = 'accepted', accepted_at = NOW()
         WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
         RETURNING id`,
        [id, request.user!.sub]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Demande non trouvée');
      }

      return reply.send({ message: 'Demande acceptée' });
    },
  });

  // POST /social/friends/reject/:id - Refuser une demande
  fastify.post('/friends/reject/:id', {
    schema: {
      tags: ['Social'],
      summary: 'Refuser une demande d\'ami',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await db.query(
        `UPDATE friendships SET status = 'rejected'
         WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
         RETURNING id`,
        [id, request.user!.sub]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Demande non trouvée');
      }

      return reply.send({ message: 'Demande refusée' });
    },
  });

  // DELETE /social/friends/:userId - Supprimer un ami
  fastify.delete('/friends/:userId', {
    schema: {
      tags: ['Social'],
      summary: 'Supprimer un ami',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { userId } = request.params as { userId: string };

      const result = await db.query(
        `DELETE FROM friendships
         WHERE status = 'accepted'
         AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
         RETURNING id`,
        [request.user!.sub, userId]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Ami non trouvé');
      }

      return reply.status(204).send();
    },
  });

  // ================== LIKES ==================

  // POST /social/sessions/:sessionId/like - Liker une session
  fastify.post('/sessions/:sessionId/like', {
    schema: {
      tags: ['Social'],
      summary: 'Liker une session',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };

      // Vérifier que la session existe et est visible
      const sessionResult = await db.query(
        `SELECT s.user_id, s.visibility FROM sessions s WHERE s.id = $1 AND s.status = 'completed'`,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        throw new NotFoundError('Session non trouvée');
      }

      const session = sessionResult.rows[0];

      // Vérifier la visibilité
      if (session.user_id !== request.user!.sub) {
        if (session.visibility === 'private') {
          throw new ForbiddenError('Session privée');
        }
        if (session.visibility === 'friends') {
          const friendshipResult = await db.query(
            `SELECT id FROM friendships
             WHERE status = 'accepted'
             AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
            [request.user!.sub, session.user_id]
          );
          if (friendshipResult.rows.length === 0) {
            throw new ForbiddenError('Session réservée aux amis');
          }
        }
      }

      // Ajouter le like (ignore si déjà liké)
      await db.query(
        `INSERT INTO likes (user_id, session_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, session_id) DO NOTHING`,
        [request.user!.sub, sessionId]
      );

      return reply.send({ liked: true });
    },
  });

  // DELETE /social/sessions/:sessionId/like - Unliker une session
  fastify.delete('/sessions/:sessionId/like', {
    schema: {
      tags: ['Social'],
      summary: 'Retirer le like d\'une session',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };

      await db.query(
        'DELETE FROM likes WHERE user_id = $1 AND session_id = $2',
        [request.user!.sub, sessionId]
      );

      return reply.send({ liked: false });
    },
  });

  // ================== COMMENTS ==================

  // GET /social/sessions/:sessionId/comments - Liste des commentaires
  fastify.get('/sessions/:sessionId/comments', {
    schema: {
      tags: ['Social'],
      summary: 'Liste des commentaires d\'une session',
    },
    handler: async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };

      const result = await db.query(
        `SELECT c.id, c.content, c.parent_id, c.created_at, c.updated_at,
                u.id as user_id, u.username, u.display_name, u.avatar_url
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.session_id = $1 AND c.deleted_at IS NULL
         ORDER BY c.created_at ASC`,
        [sessionId]
      );

      return reply.send({
        comments: result.rows.map((c) => ({
          id: c.id,
          content: c.content,
          parentId: c.parent_id,
          user: {
            id: c.user_id,
            username: c.username,
            displayName: c.display_name,
            avatarUrl: c.avatar_url,
          },
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
      });
    },
  });

  // POST /social/sessions/:sessionId/comments - Ajouter un commentaire
  fastify.post('/sessions/:sessionId/comments', {
    schema: {
      tags: ['Social'],
      summary: 'Ajouter un commentaire',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { sessionId } = request.params as { sessionId: string };
      const body = addCommentSchema.parse(request.body);

      // Vérifier que la session existe
      const sessionResult = await db.query(
        `SELECT id FROM sessions WHERE id = $1 AND status = 'completed'`,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        throw new NotFoundError('Session non trouvée');
      }

      // Si c'est une réponse, vérifier que le commentaire parent existe
      if (body.parentId) {
        const parentResult = await db.query(
          'SELECT id FROM comments WHERE id = $1 AND session_id = $2 AND deleted_at IS NULL',
          [body.parentId, sessionId]
        );
        if (parentResult.rows.length === 0) {
          throw new NotFoundError('Commentaire parent non trouvé');
        }
      }

      const result = await db.query(
        `INSERT INTO comments (user_id, session_id, content, parent_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, content, parent_id, created_at`,
        [request.user!.sub, sessionId, body.content, body.parentId]
      );

      return reply.status(201).send({
        comment: {
          id: result.rows[0].id,
          content: result.rows[0].content,
          parentId: result.rows[0].parent_id,
          createdAt: result.rows[0].created_at,
        },
      });
    },
  });

  // DELETE /social/comments/:id - Supprimer un commentaire
  fastify.delete('/comments/:id', {
    schema: {
      tags: ['Social'],
      summary: 'Supprimer un commentaire',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { id } = request.params as { id: string };

      const result = await db.query(
        `UPDATE comments SET deleted_at = NOW()
         WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [id, request.user!.sub]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Commentaire non trouvé');
      }

      return reply.status(204).send();
    },
  });

  // ================== FEED ==================

  // GET /social/feed - Feed des sessions des amis
  fastify.get('/feed', {
    schema: {
      tags: ['Social'],
      summary: 'Feed des sessions des amis',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };

      const result = await db.query(
        `SELECT s.id, s.title, s.description, s.visibility, s.distance_km,
                s.duration_seconds, s.avg_speed_kmh, s.max_speed_kmh,
                s.started_at, s.completed_at,
                v.brand as vehicle_brand, v.model as vehicle_model,
                u.id as user_id, u.username, u.display_name, u.avatar_url,
                (SELECT COUNT(*) FROM likes WHERE session_id = s.id) as likes_count,
                (SELECT COUNT(*) FROM comments WHERE session_id = s.id AND deleted_at IS NULL) as comments_count,
                EXISTS(SELECT 1 FROM likes WHERE session_id = s.id AND user_id = $1) as has_liked
         FROM sessions s
         JOIN vehicles v ON s.vehicle_id = v.id
         JOIN users u ON s.user_id = u.id
         WHERE s.status = 'completed'
         AND (
           s.visibility = 'public'
           OR (s.visibility = 'friends' AND EXISTS(
             SELECT 1 FROM friendships
             WHERE status = 'accepted'
             AND ((requester_id = $1 AND addressee_id = s.user_id) OR (requester_id = s.user_id AND addressee_id = $1))
           ))
           OR s.user_id = $1
         )
         ORDER BY s.completed_at DESC
         LIMIT $2 OFFSET $3`,
        [request.user!.sub, limit, offset]
      );

      return reply.send({
        sessions: result.rows.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
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
          user: {
            id: s.user_id,
            username: s.username,
            displayName: s.display_name,
            avatarUrl: s.avatar_url,
          },
          likesCount: parseInt(s.likes_count, 10),
          commentsCount: parseInt(s.comments_count, 10),
          hasLiked: s.has_liked,
          startedAt: s.started_at,
          completedAt: s.completed_at,
        })),
      });
    },
  });
}
