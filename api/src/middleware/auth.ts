import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, DecodedToken } from '../lib/auth.js';
import { UnauthorizedError } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: DecodedToken;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Token d\'authentification requis');
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    throw new UnauthorizedError('Format du token invalide');
  }

  const decoded = await verifyToken(token);

  if (decoded.type !== 'access') {
    throw new UnauthorizedError('Type de token invalide');
  }

  request.user = decoded;
}

export async function optionalAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return;
  }

  try {
    const decoded = await verifyToken(token);
    if (decoded.type === 'access') {
      request.user = decoded;
    }
  } catch {
    // Token invalide, on continue sans authentification
  }
}
