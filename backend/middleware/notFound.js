// backend/middleware/notFound.js
// 404 catch-all para sa unknown /api routes — consistent JSON envelope
// (hindi HTML ng express default).

import { fail } from '../shared/utils/apiResponse.js';

export function notFound(req, res) {
  return fail(res, 404, `Not found: ${req.method} ${req.originalUrl}`);
}

export default notFound;
