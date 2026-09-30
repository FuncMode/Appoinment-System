// backend/middleware/rateLimiter.js
// Blueprint stub - walang code pa (tingnan ang docs/BACKEND_ARCHITECTURE.md).
// Role: express-rate-limit on /api/auth/* (brute-force protection).
// Security (API4 / ASVS V2.5): keyed by IP(+route); mas mahigpit na window/limit
//   sa credential endpoints; i-log ang mga 429 (V16.3) para sa brute-force
//   monitoring; sa behind-proxy deployment, i-set ang trust proxy nang tama
//   (kung hindi, ang rate limit ay mada-market sa iisang IP).
