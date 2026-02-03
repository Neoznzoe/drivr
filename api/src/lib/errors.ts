import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code?: string) {
    super(400, message, code);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Non autorisé', code?: string) {
    super(401, message, code);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Accès interdit', code?: string) {
    super(403, message, code);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource non trouvée', code?: string) {
    super(404, message, code);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code?: string) {
    super(409, message, code);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(422, message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        message: error.message,
        code: error.code,
        ...(error instanceof ValidationError && { errors: error.errors }),
      },
    });
  }

  // Erreurs de validation Fastify
  if (error.validation) {
    return reply.status(422).send({
      error: {
        message: 'Erreur de validation',
        code: 'VALIDATION_ERROR',
        errors: error.validation,
      },
    });
  }

  // Erreur générique
  const statusCode = error.statusCode || 500;
  const message =
    statusCode === 500 ? 'Erreur interne du serveur' : error.message;

  return reply.status(statusCode).send({
    error: {
      message,
      code: 'INTERNAL_ERROR',
    },
  });
}
