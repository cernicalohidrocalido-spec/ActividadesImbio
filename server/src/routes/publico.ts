import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { buildActividadWhere } from '../lib/filters.js';

const listQuerySchema = z.object({
  mes: z.string().optional(),
  tipo: z.string().optional(),
  q: z.string().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

export async function publicoRoutes(app: FastifyInstance) {
  app.get('/api/publico/actividades', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Query inválido' });
    }
    const where = buildActividadWhere(parsed.data);
    const items = await prisma.actividad.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: { fotos: true },
    });
    return { items, total: items.length };
  });

  app.get('/api/publico/tipos', async () => {
    const items = await prisma.tipoConfig.findMany({
      where: { activo: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    return { items, total: items.length };
  });
}
