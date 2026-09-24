// Temporary dev-only smoke test: server-render every route to catch runtime errors.
// Run with: node scripts/smoke.mjs   (requires: npm i --no-save jsdom)
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import React from 'react';
import { renderToString } from 'react-dom/server';

const routes = [
  '/', '/landing', '/register', '/login', '/forgot-password', '/admin/login', '/mobile',
  '/services', '/doctors', '/about', '/contact', '/privacy', '/terms',
  '/patient/dashboard', '/patient/doctors', '/patient/availability/d1',
  '/patient/book', '/patient/confirmation', '/patient/status',
  '/patient/history', '/patient/appointment/ap1', '/patient/profile',
  '/patient/records', '/patient/messages', '/patient/help',
  '/admin/dashboard', '/admin/patients', '/admin/doctors', '/admin/appointments',
  '/admin/stories', '/admin/reports', '/admin/settings',
  '/patient/availability/unknown-id', '/patient/appointment/unknown-id',
];

let failed = 0;

for (const route of routes) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.localStorage = dom.window.localStorage;
  // jsdom lacks matchMedia/ResizeObserver; responsive listings (doctors) need them.
  dom.window.matchMedia = (query) => ({
    matches: false, media: query,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
  });
  dom.window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  // jsdom lacks requestAnimationFrame too — gsap's ScrollTrigger (pulled in by
  // the public pages via reactbits) calls it at module-evaluation time, so the
  // polyfill must exist on globalThis before the app is SSR-loaded.
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  dom.window.location.hash = route;

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });
  try {
    const { default: App } = await vite.ssrLoadModule('/src/App.jsx');
    const { StoreProvider } = await vite.ssrLoadModule('/src/shared/components.jsx');
    const html = renderToString(React.createElement(StoreProvider, null, React.createElement(App)));
    const label = html.match(/data-screen-label="([^"]*)"/);
    if (!html || html.length < 200) throw new Error('rendered HTML suspiciously small');
    console.log('OK   ', route.padEnd(32), '→', label ? label[1] : '(no label)', `(${html.length} chars)`);
  } catch (e) {
    failed++;
    console.log('FAIL ', route.padEnd(32), '→', e.message);
  } finally {
    await vite.close();
  }
}

console.log(failed === 0 ? '\nAll routes rendered without errors.' : `\n${failed} route(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
