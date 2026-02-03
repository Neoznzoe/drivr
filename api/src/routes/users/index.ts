import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import { NotFoundError } from '../../lib/errors.js';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.js';

const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export default async function usersRoutes(fastify: FastifyInstance) {
  // GET /users/:username - Profil public d'un utilisateur
  fastify.get('/:username', {
    schema: {
      tags: ['Users'],
      summary: 'Obtenir le profil public d\'un utilisateur',
      params: {
        type: 'object',
        properties: {
          username: { type: 'string' },
        },
      },
    },
    preHandler: optionalAuthMiddleware,
    handler: async (request, reply) => {
      const { username } = request.params as { username: string };

      const result = await db.query(
        `SELECT id, username, display_name, avatar_url, bio,
                total_distance_km, total_duration_seconds, total_sessions,
                created_at
         FROM users WHERE username = $1 AND is_active = true`,
        [username]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Utilisateur non trouvé');
      }

      const user = result.rows[0];

      // Vérifier si c'est un ami (si connecté)
      let isFriend = false;
      if (request.user) {
        const friendshipResult = await db.query(
          `SELECT id FROM friendships
           WHERE status = 'accepted'
           AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
          [request.user.sub, user.id]
        );
        isFriend = friendshipResult.rows.length > 0;
      }

      return reply.send({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          stats: {
            totalDistanceKm: parseFloat(user.total_distance_km),
            totalDurationSeconds: user.total_duration_seconds,
            totalSessions: user.total_sessions,
          },
          createdAt: user.created_at,
          isFriend,
          isMe: request.user?.sub === user.id,
        },
      });
    },
  });

  // PATCH /users/me - Mettre à jour son profil
  fastify.patch('/me', {
    schema: {
      tags: ['Users'],
      summary: 'Mettre à jour son profil',
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string', maxLength: 100 },
          bio: { type: 'string', maxLength: 500 },
          avatarUrl: { type: 'string', format: 'uri' },
        },
      },
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const body = updateProfileSchema.parse(request.body);

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (body.displayName !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        values.push(body.displayName);
      }
      if (body.bio !== undefined) {
        updates.push(`bio = $${paramIndex++}`);
        values.push(body.bio);
      }
      if (body.avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(body.avatarUrl);
      }

      if (updates.length === 0) {
        return reply.send({ message: 'Aucune modification' });
      }

      values.push(request.user!.sub);

      const result = await db.query(
        `UPDATE users SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, username, display_name, avatar_url, bio`,
        values
      );

      const user = result.rows[0];

      return reply.send({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          bio: user.bio,
        },
      });
    },
  });

  // GET /users/search - Rechercher des utilisateurs
  fastify.get('/search', {
    schema: {
      tags: ['Users'],
      summary: 'Rechercher des utilisateurs',
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          q: { type: 'string', minLength: 2 },
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
        required: ['q'],
      },
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const { q, limit = 20 } = request.query as { q: string; limit?: number };

      const result = await db.query(
        `SELECT id, username, display_name, avatar_url
         FROM users
         WHERE is_active = true
         AND (username ILIKE $1 OR display_name ILIKE $1)
         AND id != $2
         ORDER BY username
         LIMIT $3`,
        [`%${q}%`, request.user!.sub, limit]
      );

      return reply.send({
        users: result.rows.map((u) => ({
          id: u.id,
          username: u.username,
          displayName: u.display_name,
          avatarUrl: u.avatar_url,
        })),
      });
    },
  });
}
