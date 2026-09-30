// backend/config/db.js
// Blueprint stub - walang code pa (tingnan ang docs/BACKEND_ARCHITECTURE.md).
// Role: Supabase client singleton (SUPABASE_URL + service-role key).
// Security (API2 / ASVS V6.2): ang service-role key ay RLS bypass — dito lang
//   ito sa server, hindi kailanman inilog o ini-embed sa client bundle; ang
//   authorization ay nasa service/middleware layer (tingnan ang BACKEND_SECURITY_AUDIT.md).
//   Gamitin ang Supabase connection pooler sa production (huwag per-request conns).
