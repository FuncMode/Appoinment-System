import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// MEDIUM-001 (docs/FRONTEND_SECURITY_AUDIT.md): ship a Content-Security-Policy
// with every production build. It is injected at build time instead of being
// written into index.html because Vite's dev server prepends an inline
// react-refresh preamble, which a `script-src 'self'` policy would block.
// A <meta> CSP cannot express `frame-ancestors`, and X-Frame-Options /
// X-Content-Type-Options / Permissions-Policy are header-only — set those at
// the hosting provider once a host is chosen.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://randomuser.me",
  "connect-src 'self'",
  "frame-src https://www.openstreetmap.org",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function securityMeta() {
  return {
    name: 'security-csp',
    apply: 'build',
    transformIndexHtml() {
      return [{
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend',
      }];
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), securityMeta()],
});
