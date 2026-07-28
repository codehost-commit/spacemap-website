import http from 'node:http';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { buildRoutes } from './http/routes.js';
import { Propagator } from './propagation/propagator.js';
import { TleCatalog } from './tle/catalog.js';
import { WsHub } from './ws/hub.js';

async function main() {
  const catalog = new TleCatalog();
  await catalog.start();
  const propagator = new Propagator(catalog);

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', buildRoutes(catalog, propagator));

  const server = http.createServer(app);
  const hub = new WsHub(server, propagator);
  hub.start();

  server.listen(config.port, () => {
    console.log(`[spacemap] backend listening on http://localhost:${config.port}`);
    console.log(`[spacemap] WS endpoint: ws://localhost:${config.port}/ws`);
  });

  const shutdown = () => {
    console.log('[spacemap] shutting down…');
    hub.stop();
    catalog.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[spacemap] fatal:', err);
  process.exit(1);
});
