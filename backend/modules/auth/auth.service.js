// backend/modules/auth/auth.service.js
// Blueprint stub - walang code pa (tingnan ang docs/BACKEND_ARCHITECTURE.md).
// Role: bcrypt verify/rotate + JWT issue/refresh; role derived from the account source na tumugma (patient | admin | doctor).
// Security (ASVS V2.4/V3.3/V6.2): bcrypt cost >= 10 (o argon2id); constant-time
//   compare; GENERIC login/forgot errors (walang account enumeration — parehong
//   message sa "walang account" at "maling password"); access token maikli (15m) +
//   refresh rotation with REUSE DETECTION (pag nagamit ulit ang lumang refresh
//   token, i-revoke ang buong family); JWT: HS256 secret >= 32 bytes, i-validate
//   ang iss/aud/exp sa bawat verify.
