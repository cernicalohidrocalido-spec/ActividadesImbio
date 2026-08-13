import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { activityRoutes } from './routes/activities.js';
import { photoRoutes } from './routes/photos.js';
import { reportRoutes } from './routes/reports.js';
import { tiposRoutes } from './routes/tipos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

const app = Fastify({
  logger: { level: 'info' },
});

await app.register(cors, {
  origin: CORS_ORIGIN.split(',').map((s) => s.trim()),
  credentials: true,
});

await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024, files: 20 },
});

await app.register(fastifyStatic, {
  root: path.resolve(process.cwd(), UPLOAD_DIR),
  prefix: '/uploads/',
  decorateReply: false,
});

const clientDist = path.resolve(__dirname, '../../client/dist');
await app.register(fastifyStatic, {
  root: clientDist,
  prefix: '/',
  wildcard: false,
});

app.get('/api/health', async () => ({ ok: true, ts: new Date().toISOString() }));

app.setNotFoundHandler((req, reply) => {
  if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    return reply.sendFile('index.html', clientDist);
  }
  reply.status(404).send({ error: 'No encontrado' });
});

await app.register(activityRoutes);
await app.register(photoRoutes);
await app.register(reportRoutes);
await app.register(tiposRoutes);

app.setErrorHandler((err, req, reply) => {
  req.log.error(err);
  const status = err.statusCode ?? 500;
  reply.status(status).send({ error: err.message ?? 'Error interno del servidor' });
});

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`🚀 Server listo en http://${HOST}:${PORT}`);
  app.log.info(`📁 Uploads servidos desde ${UPLOAD_DIR}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
