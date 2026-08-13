import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  verifyCredentials,
  signSession,
  setSessionCookie,
  clearSessionCookie,
  readSession,
  loadUsers,
} from '../lib/auth.js';

const loginSchema = z.object({
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200),
});

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/login', async (req, reply) => {
    if (loadUsers().size === 0) {
      return reply.status(503).send({
        error: 'Auth no configurada. Define AUTH_USER y AUTH_PASSWORD en Render → Environment.',
      });
    }
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Usuario y contraseña son obligatorios' });
    }
    const { username, password } = parsed.data;
    if (!verifyCredentials(username, password)) {
      return reply.status(401).send({ error: 'Usuario o contraseña incorrectos' });
    }
    setSessionCookie(reply, signSession({ username }));
    return { ok: true, username };
  });

  app.post('/api/logout', async (_req, reply) => {
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get('/api/me', async (req, reply) => {
    const session = readSession(req);
    if (!session) return reply.status(401).send({ error: 'No autorizado' });
    return { username: session.username };
  });
}
