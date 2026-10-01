// backend/server.js
// HTTP bootstrap: boot ang app, makinig sa PORT. Graceful shutdown: isara muna
// ang HTTP server (tapusin ang in-flight requests) bago mag-exit. (Ang Vercel
// serverless entry ay hiwalay na maliit na adapter kapag na-deploy — walang
// listen doon.)

import { createApp } from './app.js';
import { config } from './config/env.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[server] MedicaCare backend listening on :${config.port} (${config.env})`);
});

const shutdown = (signal) => {
  console.log(`[server] ${signal} received — shutting down`);
  server.close(() => process.exit(0));
  // Force-exit kung may hindi tapos na connection pagkatapos ng 5s.
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default server;
