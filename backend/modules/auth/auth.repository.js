// backend/modules/auth/auth.repository.js
// Blueprint stub - walang code pa (tingnan ang docs/BACKEND_ARCHITECTURE.md).
// Role: Data access only: patients / admins / doctor_accounts / refresh_tokens via Supabase.
// Security (ASVS V1.2/V6.2): parameterized / Supabase query-builder lang — HUWAG
//   string-built na SQL (injection); sa refresh_tokens: HASH lang ng token ang
//   stored (hindi raw token), at laging may expires_at/revoked_at check sa query.
