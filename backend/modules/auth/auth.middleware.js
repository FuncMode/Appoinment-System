// backend/modules/auth/auth.middleware.js
// Blueprint stub - walang code pa (tingnan ang docs/BACKEND_ARCHITECTURE.md).
// Role: requireAuth (verify JWT), requireRole('patient'|'admin'|'doctor').
// Security (API2/API5 / ASVS V3.4/V4.1): i-verify ang signature + exp + iss/aud
//   sa BAWAT request (huwag magtiwala sa client-claimed role); requireRole sa
//   bawat admin/doctor route = function-level authorization (BFLA); ang
//   object-level checks (BOLA) ay nasa service layer per module.
