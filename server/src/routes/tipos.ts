import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const COLORES_PERMITIDOS = [
  'success',
  'warning',
  'danger',
  'info',
  'primary',
  'secondary',
  'accent',
  'neutral',
] as const;

const createSchema = z.object({
  label: z.string().min(1, 'El nombre es obligatorio').max(80),
  color: z.enum(COLORES_PERMITIDOS).default('default'),
  order: z.number().int().min(0).max(1000).optional(),
});

const updateSchema = createSchema.partial().extend({
  activo: z.boolean().optional(),
});

// Genera un key URL-safe a partir del label
function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

async function uniqueKey(base: string): Promise<string> {
  let key = base || 'TIPO';
  let i = 1;
  while (await prisma.tipoConfig.findUnique({ where: { key } })) {
    i += 1;
    key = `${base}_${i}`;
  }
  return key;
}

export async function tiposRoutes(app: FastifyInstance) {
  // GET /api/tipos - lista (opcionalmente filtrada por activo)
  app.get('/api/tipos', async (req: FastifyRequest, reply: FastifyReply) => {
    const q = (req.query as Record<string, string>).activo;
    const where = q === 'true' ? { activo: true } : q === 'false' ? { activo: false } : {};
    const items = await prisma.tipoConfig.findMany({
      where,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    return { items, total: items.length };
  });

  // POST /api/tipos - crear
  app.post('/api/tipos', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Datos inválidos', details: parsed.error.format() });
    }
    const { label, color, order } = parsed.data;
    const baseKey = slugify(label);
    const key = await uniqueKey(baseKey);
    const maxOrder = await prisma.tipoConfig.aggregate({ _max: { order: true } });
    const created = await prisma.tipoConfig.create({
      data: {
        key,
        label,
        color,
        order: order ?? (maxOrder._max.order ?? 0) + 10,
        activo: true,
      },
    });
    return reply.status(201).send(created);
  });

  // PUT /api/tipos/:id - actualizar
  app.put<{ Params: { id: string } }>('/api/tipos/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.status(400).send({ error: 'ID inválido' });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Datos inválidos', details: parsed.error.format() });
    }
    const existing = await prisma.tipoConfig.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'No encontrado' });
    const updated = await prisma.tipoConfig.update({ where: { id }, data: parsed.data });
    return updated;
  });

  // DELETE /api/tipos/:id - desactivar (soft delete)
  app.delete<{ Params: { id: string } }>('/api/tipos/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.status(400).send({ error: 'ID inválido' });
    const existing = await prisma.tipoConfig.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send({ error: 'No encontrado' });
    // En lugar de borrar, desactivamos para preservar histórico
    await prisma.tipoConfig.update({ where: { id }, data: { activo: false } });
    return { ok: true, id };
  });
}
