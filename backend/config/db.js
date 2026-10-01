// backend/config/db.js
// Supabase client singleton — iisang client sa buong app (walang per-request
// clients; ang connection pooling ay nasa supabase-js transport + Supabase
// pooler sa production). Ang service-role key dito ay RLS bypass: dito lang
// ito sa server-side env, hindi kailanman inilog o ini-embed sa client bundle
// (API2 / ASVS V6.2). Ang authorization ay nasa service/middleware layer, HINDI
// sa Supabase client (phase-1 posture).

import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

export const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: {
    // Server-to-server: walang session persistence at walang auto-refresh —
    // ang service key ay static at hindi nag-e-expire.
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export default supabase;
