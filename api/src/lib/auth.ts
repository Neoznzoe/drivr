import { V4 } from 'paseto';
import * as argon2 from 'argon2';
import { config } from '../config/index.js';
import { UnauthorizedError } from './errors.js';

// Générer une clé secrète pour PASETO v4.local
const secretKey = Buffer.from(config.pasetoSecretKey.padEnd(32, '0').slice(0, 32));

export interface TokenPayload {
  sub: string; // user id
  email: string;
  username: string;
  type: 'access' | 'refresh';
}

export interface DecodedToken extends TokenPayload {
  iat: string;
  exp: string;
}

function parseExpiration(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // 15 minutes par défaut

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 900;
  }
}

export async function generateAccessToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  const expiresIn = parseExpiration(config.accessTokenExpiresIn);

  return V4.encrypt(
    { ...payload, type: 'access' },
    secretKey,
    {
      expiresIn: `${expiresIn}s`,
    }
  );
}

export async function generateRefreshToken(payload: Omit<TokenPayload, 'type'>): Promise<string> {
  const expiresIn = parseExpiration(config.refreshTokenExpiresIn);

  return V4.encrypt(
    { ...payload, type: 'refresh' },
    secretKey,
    {
      expiresIn: `${expiresIn}s`,
    }
  );
}

export async function verifyToken(token: string): Promise<DecodedToken> {
  try {
    const payload = await V4.decrypt<DecodedToken>(token, secretKey);
    return payload;
  } catch {
    throw new UnauthorizedError('Token invalide ou expiré');
  }
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
