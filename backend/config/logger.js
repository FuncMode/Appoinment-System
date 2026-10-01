// backend/config/logger.js
// Morgan setup (ASVS V16.2/V16.4): request logs ay method/path/status lang —
// walang headers (dito dumadaan ang authorization/cookies = secrets) at walang
// body (dito dumadaan ang passwords/PHI). Dev: 'dev' format (may ms); production:
// 'tiny'. Ang /api/health ay ni-skip (noise lang sa uptime probes).

import morgan from 'morgan';
import { config } from './env.js';

const format = config.isProd ? 'tiny' : 'dev';
const skip = (req) => config.env === 'test' || (req.originalUrl === '/api/health' && !config.isProd);

const requestLogger = morgan(format, { skip });
export default requestLogger;
