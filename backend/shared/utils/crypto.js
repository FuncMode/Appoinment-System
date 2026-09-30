// backend/shared/utils/crypto.js
// Blueprint stub - walang code pa (tingnan ang docs/BACKEND_ARCHITECTURE.md
// at docs/ENCRYPTION_DESIGN.md para sa buong field-level encryption design).
// Role: AES-256-GCM field encryption para sa PHI columns:
//   encryptField(plaintext) -> "v1:<iv>:<tag>:<ciphertext>" (versioned, base64)
//   decryptField(ciphertext) -> plaintext (INVOKED ONLY AFTER authz/BOLA check)
//   blindIndex(value) -> HMAC-SHA256 hex (equality search sa encrypted fields)
// Security (ASVS V6.2/V6.3 — Cryptography):
//   - AES-256-GCM (AEAD): confidentiality + integrity; random 12-byte IV
//     PER field PER write — huwag i-reuse ang IV na may parehong key.
//   - Key mula sa process.env.ENCRYPTION_KEY (32-byte hex) — HINDI kailanman
//     nasa source, nasa DB, nasa logs, o nasa frontend.
//   - Versioned ciphertext prefix ("v1:") = path para sa key rotation.
//   - Blind index: HMAC-SHA256 ng normalized value — para sa equality search
//     (hal. phone) sa encrypted columns; hindi reversible kung walang key.
//   - Production: palitan ang raw env key ng envelope encryption
//     (KMS / Supabase Vault) — tingnan ang ENCRYPTION_DESIGN.md §Key management.