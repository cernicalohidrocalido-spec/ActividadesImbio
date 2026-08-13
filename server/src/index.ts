import 'dotenv/config';
import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { activityRoutes } from './routes/activities.js';
import { photoRoutes } from './routes/photos.js';
import { reportRoutes } from './routes/reports.js';
import { tiposRoutes } from './routes/tipos.js';
import { matlachoRoutes } from './routes/matlacho.js';
import { authRoutes } from './routes/auth.js';
import { ensureDefaultTipos } from './lib/ensure-tipos.js';
import { readSession, loadUsers } from './lib/auth.js';
import { isCloudinaryConfigured } from './lib/cloudinary.js';

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

const PUBLIC_API = new Set(['/api/health', '/api/login']);

app.addHook('onRequest', async (req, reply) => {
  if (req.method === 'OPTIONS') return;
  const pathOnly = req.url.split('?')[0] ?? '';
  if (PUBLIC_API.has(pathOnly)) return;
  const needsAuth = pathOnly.startsWith('/api') || pathOnly.startsWith('/uploads');
  if (!needsAuth) return;
  if (!readSession(req)) {
    return reply.status(401).send({ error: 'No autorizado' });
  }
});

await app.register(authRoutes);
await app.register(activityRoutes);
await app.register(photoRoutes);
await app.register(reportRoutes);
await app.register(tiposRoutes);
await app.register(matlachoRoutes);

app.setNotFoundHandler((req, reply) => {
  if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/uploads')) {
    return reply.sendFile('index.html', clientDist);
  }
  reply.status(404).send({ error: 'No encontrado' });
});

app.setErrorHandler((err: FastifyError, req, reply) => {
  req.log.error(err);
  const status = err.statusCode ?? 500;
  reply.status(status).send({ error: err.message ?? 'Error interno del servidor' });
});

try {
  const nTipos = await ensureDefaultTipos();
  app.log.info(`🏷️  Tipos de intervención: ${nTipos}`);
  const nUsers = loadUsers().size;
  if (nUsers === 0) {
    app.log.warn('⚠️  AUTH_USER/AUTH_PASSWORD no definidos — el login no funcionará');
  } else {
    app.log.info(`🔒 Auth activa (${nUsers} usuario(s))`);
  }
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`🚀 Server listo en http://${HOST}:${PORT}`);
  if (isCloudinaryConfigured()) {
    app.log.info('☁️  Fotos → Cloudinary');
  } else {
    app.log.warn('⚠️  CLOUDINARY_URL no definida — en producción las fotos fallarán');
    app.log.info(`📁 Uploads locales desde ${UPLOAD_DIR}`);
  }
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
