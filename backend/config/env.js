// backend/config/env.js
// Central env loading/validation via dotenv — fail-fast at startup (ASVS V14.2/V8.3).
// Bakit fail-fast: mas madaling i-debug ang config error na humahadlang sa boot
// kaysa sa misconfiguration na lumalabas sa gitnang request. WALANG fallback
// values para sa secrets; ang validation errors ay variable NAME lang — hindi
// kailanman nililog ang value ng secret.

import 'dotenv/config';

const errors = [];
const required = (name) => {
  const value = (process.env[name] || '').trim();
  if (!value) errors.push(`${name} ay kulang sa .env`);
  return value;
};
const atLeast = (name, value, min) => {
  if (value && value.length < min) errors.push(`${name} ay masyadong maikli (minimum ${min} characters)`);
};

// --- Server ---
const nodeEnv = (process.env.NODE_ENV || 'development').trim();
if (!['development', 'production', 'test'].includes(nodeEnv)) {
  errors.push('NODE_ENV ay dapat development | production | test');
}
const portRaw = (process.env.PORT || '3000').trim();
const port = Number(portRaw);
if (!/^\d+$/.test(portRaw) || port < 1 || port > 65535) errors.push('PORT ay dapat 1–65535 na integer');

// --- Supabase ---
const supabaseUrl = required('SUPABASE_URL');
if (supabaseUrl) {
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== 'https:') errors.push('SUPABASE_URL ay dapat https://');
  } catch {
    errors.push('SUPABASE_URL ay hindi valid na URL');
  }
}
const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
atLeast('SUPABASE_SERVICE_ROLE_KEY', serviceRoleKey, 40);
// Legacy "eyJ..." JWT service keys ay tinatanggap pa rin ng Supabase, pero ang
// bagong key system ay sb_secret_... — warn sa production, hindi fail.
if (serviceRoleKey && !serviceRoleKey.startsWith('sb_secret_') && nodeEnv === 'production') {
  console.warn('[env] Paalala: SUPABASE_SERVICE_ROLE_KEY ay legacy JWT format — i-rotate sa sb_secret_ key kung mayroon na');
}

// --- JWT (access + refresh) ---
const jwtAccessSecret = required('JWT_ACCESS_SECRET');
const jwtRefreshSecret = required('JWT_REFRESH_SECRET');
atLeast('JWT_ACCESS_SECRET', jwtAccessSecret, 32);
atLeast('JWT_REFRESH_SECRET', jwtRefreshSecret, 32);
if (jwtAccessSecret && jwtRefreshSecret && jwtAccessSecret === jwtRefreshSecret) {
  errors.push('JWT_ACCESS_SECRET at JWT_REFRESH_SECRET ay dapat MAGKAIBA (never reuse one secret for two purposes)');
}
const jwtAccessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || '15m').trim();
const jwtRefreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d').trim();
const expiresInPattern = /^\d+(ms|s|m|h|d)$/;
if (!expiresInPattern.test(jwtAccessExpiresIn)) errors.push('JWT_ACCESS_EXPIRES_IN ay dapat format na <number><ms|s|m|h|d> (hal. 15m)');
if (!expiresInPattern.test(jwtRefreshExpiresIn)) errors.push('JWT_REFRESH_EXPIRES_IN ay dapat format na <number><ms|s|m|h|d> (hal. 7d)');

// --- Field-level encryption (PHI) — docs/ENCRYPTION_DESIGN.md ---
const encryptionKey = required('ENCRYPTION_KEY');
if (encryptionKey && !/^[0-9a-f]{64}$/i.test(encryptionKey)) {
  errors.push('ENCRYPTION_KEY ay dapat eksaktong 64 hex characters (32 bytes; openssl rand -hex 32)');
}

// --- CORS ---
const corsOriginsRaw = required('CORS_ORIGINS');
const corsOrigins = corsOriginsRaw ? corsOriginsRaw.split(',').map((o) => o.trim()).filter(Boolean) : [];
if (corsOrigins.length === 0) errors.push('CORS_ORIGINS ay kulang (comma-separated frontend origins)');
for (const origin of corsOrigins) {
  if (origin === '*') {
    errors.push('BAWAL ang wildcard "*" sa CORS_ORIGINS (strict allowlist lang — ASVS V14.4)');
  } else {
    try {
      new URL(origin);
    } catch {
      errors.push('Isang CORS_ORIGINS entry ay hindi valid na origin (buong https://... ang bawat entry)');
    }
  }
}

// --- Brevo email ---
const brevoApiKey = required('BREVO_API_KEY');
if (brevoApiKey && !brevoApiKey.startsWith('xkeysib-')) {
  errors.push('BREVO_API_KEY ay dapat nagsisimula sa "xkeysib-" (Brevo v3 API key, hindi SMTP key)');
}
const emailFromName = required('EMAIL_FROM_NAME');
const emailFromAddress = required('EMAIL_FROM_ADDRESS');
if (emailFromAddress && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFromAddress)) {
  errors.push('EMAIL_FROM_ADDRESS ay hindi valid na email');
}

if (errors.length > 0) {
  throw new Error(`[env] Config validation FAILED — ayusin ang backend/.env:\n  - ${errors.join('\n  - ')}`);
}

export const config = Object.freeze({
  env: nodeEnv,
  isProd: nodeEnv === 'production',
  port,
  supabase: Object.freeze({ url: supabaseUrl, serviceRoleKey }),
  jwt: Object.freeze({
    accessSecret: jwtAccessSecret,
    refreshSecret: jwtRefreshSecret,
    accessExpiresIn: jwtAccessExpiresIn,
    refreshExpiresIn: jwtRefreshExpiresIn,
  }),
  encryptionKey,
  cors: Object.freeze({ origins: Object.freeze(corsOrigins) }),
  brevo: Object.freeze({ apiKey: brevoApiKey, fromName: emailFromName, fromAddress: emailFromAddress }),
});

export default config;
