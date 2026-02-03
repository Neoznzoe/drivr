import 'dotenv/config';

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgres://drivr:drivr_secret@localhost:5432/drivr',

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  pasetoSecretKey: process.env.PASETO_SECRET_KEY || 'dev-paseto-secret-32-bytes-min!!',

  // Token expiration
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
} as const;

// Validation de la configuration en production
if (process.env.NODE_ENV === 'production') {
  const required = ['JWT_SECRET', 'PASETO_SECRET_KEY', 'DATABASE_URL'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
