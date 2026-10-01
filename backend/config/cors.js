// backend/config/cors.js
// Strict origin allowlist mula lang sa CORS_ORIGINS env (ASVS V14.4 / API8).
// Bakit walang wildcard: ang '*' origin (lalo na't kasabay ng credentials) ay
// nagpapahintulot sa KAHIT ANONG site na tawagin ang API habang may dala itong
// token ng user. Ang requests na walang Origin header (curl, health probes,
// same-origin) ay pinapayagan — hindi sila browser-CSRF surface.

import cors from 'cors';
import { config } from './env.js';

const corsOptions = {
  origin(origin, callback) {
    if (!origin || config.cors.origins.includes(origin)) return callback(null, true);
    // Server-side log lang (hindi response leak) para makita ang blocked origin.
    console.warn(`[cors] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  maxAge: 86400,
};

const corsMiddleware = cors(corsOptions);
export default corsMiddleware;
