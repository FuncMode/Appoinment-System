// backend/config/brevo.js
// Blueprint stub - walang code pa (tingnan ang docs/BACKEND_ARCHITECTURE.md).
// Role: Brevo (Sendinblue) email client singleton - API key + verified sender, fail-fast at startup.
// Security (API10 / ASVS V8.3): API key mula sa env lang (never hardcoded, never logged);
//   outbound HTTPS lang with request timeout; ang email failure ay best-effort
//   (hindi nito hahadlangan ang main API request — tingnan ang email.service.js).
