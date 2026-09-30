// backend/shared/services/email.service.js
// Blueprint stub - walang code pa (tingnan ang docs/BACKEND_ARCHITECTURE.md).
// Role: Thin wrapper over Brevo API - sendEmail({to, subject, html}); used by notifications & auth.
// Security (API10 / ASVS V16.5): timeout + retry cap sa Brevo call; best-effort
//   ang email — ang pagkabigo nito ay inilog PERO hindi nagpapabagsak sa API
//   request; template values ay i-e-escape bago isama sa HTML (huwag raw insert);
//   ang API key at recipient addresses ay huwag isama sa log lines.
