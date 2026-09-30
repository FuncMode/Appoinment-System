// backend/middleware/errorHandler.js
// Blueprint stub - walang code pa (tingnan ang docs/BACKEND_ARCHITECTURE.md).
// Role: Central error -> consistent JSON {success, message, details}.
// Security (ASVS V16.5 / API8): generic message sa client; stack traces at
//   internal/DB error details ay SA LOGS lang — hindi sa response (walang info
//   leak); consistent na 4xx/5xx mapping; ang hindi inaasahang error ay 500 na
//   walang detalye.
