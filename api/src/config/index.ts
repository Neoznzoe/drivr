import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Charger le .env depuis la racine du projet (un niveau au-dessus de /api)
dotenvConfig({ path: resolve(__dirname, '../../../.env') });

// Construire l'URL de la base de données à partir des variables individuelles
function buildDatabaseUrl(): string {
  const user = process.env.POSTGRES_USER || 'drivr';
  const password = process.env.POSTGRES_PASSWORD || 'drivr_secret';
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const db = process.env.POSTGRES_DB || 'drivr';
  return `postgres://${user}:${password}@${host}:${port}/${db}`;
}

export const config = {
  // Server
  port: parseInt(process.env.API_PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Database
  databaseUrl: buildDatabaseUrl(),

  // Auth
  pasetoSecretKey: process.env.PASETO_SECRET_KEY || 'dev-paseto-secret-32-bytes-min!!',

  // Token expiration
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
} as const;

// Validation de la configuration en production
if (process.env.NODE_ENV === 'production') {
  const required = ['PASETO_SECRET_KEY', 'POSTGRES_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
