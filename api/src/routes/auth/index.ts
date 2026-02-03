import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../../lib/db.js';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../../lib/auth.js';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
} from '../../lib/errors.js';
import { authMiddleware } from '../../middleware/auth.js';

// Schemas de validation
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre'
    ),
  username: z
    .string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(50, 'Le nom d\'utilisateur ne peut pas dépasser 50 caractères')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'
    ),
  displayName: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requis'),
});

export default async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/register
  fastify.post('/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Créer un nouveau compte',
      body: {
        type: 'object',
        required: ['email', 'password', 'username'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          username: { type: 'string', minLength: 3, maxLength: 50 },
          displayName: { type: 'string', maxLength: 100 },
        },
      },
    },
    handler: async (request, reply) => {
      const body = registerSchema.parse(request.body);

      // Vérifier si l'email existe déjà
      const existingEmail = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [body.email]
      );
      if (existingEmail.rows.length > 0) {
        throw new ConflictError('Cet email est déjà utilisé');
      }

      // Vérifier si le username existe déjà
      const existingUsername = await db.query(
        'SELECT id FROM users WHERE username = $1',
        [body.username]
      );
      if (existingUsername.rows.length > 0) {
        throw new ConflictError('Ce nom d\'utilisateur est déjà pris');
      }

      // Hasher le mot de passe
      const passwordHash = await hashPassword(body.password);

      // Créer l'utilisateur
      const result = await db.query(
        `INSERT INTO users (email, password_hash, username, display_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, username, display_name, created_at`,
        [body.email, passwordHash, body.username, body.displayName || body.username]
      );

      const user = result.rows[0];

      // Générer les tokens
      const tokenPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
      };

      const accessToken = await generateAccessToken(tokenPayload);
      const refreshToken = await generateRefreshToken(tokenPayload);

      // Sauvegarder le refresh token
      await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address)
         VALUES ($1, $2, NOW() + INTERVAL '7 days', $3)`,
        [user.id, refreshToken, request.ip]
      );

      return reply.status(201).send({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.display_name,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    },
  });

  // POST /auth/login
  fastify.post('/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Se connecter',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const body = loginSchema.parse(request.body);

      // Trouver l'utilisateur
      const result = await db.query(
        `SELECT id, email, username, display_name, password_hash, is_active
         FROM users WHERE email = $1`,
        [body.email]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedError('Email ou mot de passe incorrect');
      }

      const user = result.rows[0];

      if (!user.is_active) {
        throw new UnauthorizedError('Ce compte a été désactivé');
      }

      // Vérifier le mot de passe
      const isValid = await verifyPassword(user.password_hash, body.password);
      if (!isValid) {
        throw new UnauthorizedError('Email ou mot de passe incorrect');
      }

      // Mettre à jour last_login_at
      await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [
        user.id,
      ]);

      // Générer les tokens
      const tokenPayload = {
        sub: user.id,
        email: user.email,
        username: user.username,
      };

      const accessToken = await generateAccessToken(tokenPayload);
      const refreshToken = await generateRefreshToken(tokenPayload);

      // Sauvegarder le refresh token
      await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address)
         VALUES ($1, $2, NOW() + INTERVAL '7 days', $3)`,
        [user.id, refreshToken, request.ip]
      );

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.display_name,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    },
  });

  // POST /auth/refresh
  fastify.post('/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'Rafraîchir le token d\'accès',
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const body = refreshSchema.parse(request.body);

      // Vérifier le refresh token
      const decoded = await verifyToken(body.refreshToken);

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Token invalide');
      }

      // Vérifier que le token existe en base et n'est pas révoqué
      const tokenResult = await db.query(
        `SELECT id FROM refresh_tokens
         WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > NOW()`,
        [decoded.sub, body.refreshToken]
      );

      if (tokenResult.rows.length === 0) {
        throw new UnauthorizedError('Token révoqué ou expiré');
      }

      // Révoquer l'ancien refresh token
      await db.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
        [body.refreshToken]
      );

      // Générer de nouveaux tokens
      const tokenPayload = {
        sub: decoded.sub,
        email: decoded.email,
        username: decoded.username,
      };

      const accessToken = await generateAccessToken(tokenPayload);
      const refreshToken = await generateRefreshToken(tokenPayload);

      // Sauvegarder le nouveau refresh token
      await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address)
         VALUES ($1, $2, NOW() + INTERVAL '7 days', $3)`,
        [decoded.sub, refreshToken, request.ip]
      );

      return reply.send({
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    },
  });

  // POST /auth/logout
  fastify.post('/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Se déconnecter',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      // Révoquer tous les refresh tokens de l'utilisateur
      await db.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [request.user!.sub]
      );

      return reply.send({ message: 'Déconnexion réussie' });
    },
  });

  // GET /auth/me
  fastify.get('/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Obtenir les informations de l\'utilisateur connecté',
      security: [{ bearerAuth: [] }],
    },
    preHandler: authMiddleware,
    handler: async (request, reply) => {
      const result = await db.query(
        `SELECT id, email, username, display_name, avatar_url, bio,
                total_distance_km, total_duration_seconds, total_sessions,
                created_at, is_verified
         FROM users WHERE id = $1`,
        [request.user!.sub]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedError('Utilisateur non trouvé');
      }

      const user = result.rows[0];

      return reply.send({
        user: {
          id: user.id,
          email: user.email,
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
          isVerified: user.is_verified,
        },
      });
    },
  });
}
