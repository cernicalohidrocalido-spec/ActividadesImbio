import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { buildActividadWhere } from '../lib/filters.js';

const createSchema = z.object({
  nombre: z.string().min(1).max(200),
  tiposIntervencion: z
    .array(z.string().min(1).max(80))
    .min(1, 'Selecciona al menos un tipo de intervención'),
  fecha: z.string().refine((s) => !isNaN(Date.parse(s)), 'Fecha inválida'),
  realizadaPor: z.string().min(1).max(200),
  direccion: z.string().min(1).max(500),
  descripcion: z.string().max(2000).optional().default(''),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  mes: z.string().optional(),
  tipo: z.string().optional(),
  q: z.string().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
});

export async function activityRoutes(app: FastifyInstance) {
  app.get('/api/actividades', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Query inválido', details: parsed.error.format() });
    }
    const where = buildActividadWhere(parsed.data);

    const items = await prisma.actividad.findMany({
      where,
      orderBy: { fecha: 'desc' },
      include: { fotos: true },
    });
    return { items, total: items.length };
  });

  app.get<{ Params: { id: string } }>('/api/actividades/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.status(400).send({ error: 'ID inválido' });
    const item = await prisma.actividad.findUnique({
      where: { id },
      include: { fotos: true },
    });
    if (!item) return reply.status(404).send({ error: 'No encontrada' });
    return item;
  });

  app.post('/api/actividades', async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Datos inválidos', details: parsed.error.format() });
    }
    const data = parsed.data;
    const created = await prisma.actividad.create({
      data: { ...data, fecha: new Date(data.fecha) },
      include: { fotos: true },
    });
    return reply.status(201).send(created);
  });

  app.put<{ Params: { id: string } }>('/api/actividades/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.status(400).send({ error: 'ID inválido' });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Datos inválidos', details: parsed.error.format() });
    }
    const { fecha, ...rest } = parsed.data;
    const updated = await prisma.actividad.update({
      where: { id },
      data: { ...rest, ...(fecha ? { fecha: new Date(fecha) } : {}) },
      include: { fotos: true },
    });
    return updated;
  });

  app.delete<{ Params: { id: string } }>('/api/actividades/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.status(400).send({ error: 'ID inválido' });
    await prisma.actividad.delete({ where: { id } });
    return { ok: true };
  });
}
