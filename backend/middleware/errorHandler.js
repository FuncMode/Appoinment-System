// backend/middleware/errorHandler.js
// Central error handler (ASVS V16.5 / API8): generic message sa client; ang
// stack at internal details ay SA LOGS lang (hindi info leak). Ang ApiError ay
// may dala nang intended status; lahat ng iba ay 500 na walang detalye.

import ApiError from '../shared/utils/ApiError.js';
import { fail } from '../shared/utils/apiResponse.js';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    // Operational error: expected, may specific na status. Log minimal.
    if (err.status >= 500) console.error(`[error] ${err.code}: ${err.message}`);
    return fail(res, err.status, err.message, err.details);
  }

  // Unexpected error: hindi inaasahan — log ang stack sa server, generic sa client.
  console.error('[error] Unexpected:', err.stack || err.message || err);
  return fail(res, 500, 'Internal server error');
}

export default errorHandler;
