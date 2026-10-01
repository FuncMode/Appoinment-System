// backend/shared/utils/ApiError.js
// Operational errors na may handa nang HTTP status — itinatapon ng services/
// controllers, kinukuha ng errorHandler. Ang stack traces ng operational errors
// ay para sa LOGS, hindi para sa client (ASVS V16.5).

export class ApiError extends Error {
  constructor(status, message, code = 'ERROR', details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details; // safe-to-show lang ang ilalagay dito
  }

  static badRequest(message, details) { return new ApiError(400, message, 'BAD_REQUEST', details); }
  static unauthorized(message = 'Authentication required') { return new ApiError(401, message, 'UNAUTHORIZED'); }
  static forbidden(message = 'You do not have permission to perform this action') { return new ApiError(403, message, 'FORBIDDEN'); }
  static notFound(message = 'Resource not found') { return new ApiError(404, message, 'NOT_FOUND'); }
  static conflict(message, details) { return new ApiError(409, message, 'CONFLICT', details); }
  static tooManyRequests(message = 'Too many requests') { return new ApiError(429, message, 'RATE_LIMITED'); }
}

export default ApiError;
