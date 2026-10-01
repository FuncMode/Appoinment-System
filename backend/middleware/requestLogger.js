// backend/middleware/requestLogger.js
// Thin wrapper sa config/logger.js — ang morgan setup (format, skip rules,
// log hygiene) ay doon naka-centralize.

import requestLogger from '../config/logger.js';

export default requestLogger;
