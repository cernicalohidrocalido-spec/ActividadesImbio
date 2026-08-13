import { FastifyInstance } from 'fastify';
import { promises as fs, createWriteStream } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function toDbUrl(filename: string): string {
  return `/uploads/${filename}`;
}

export async function photoRoutes(app: FastifyInstance) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  app.post<{ Params: { id: string } }>(
    '/api/actividades/:id/fotos',
    async (req, reply) => {
      const actividadId = Number(req.params.id);
      if (!Number.isFinite(actividadId)) {
        return reply.status(400).send({ error: 'ID inválido' });
      }
      const actividad = await prisma.actividad.findUnique({ where: { id: actividadId } });
      if (!actividad) {
        return reply.status(404).send({ error: 'Actividad no encontrada' });
      }

      if (!req.isMultipart()) {
        return reply.status(400).send({ error: 'Se esperaba multipart/form-data' });
      }

      const created: { id: number; url: string; filename: string }[] = [];
      const parts = req.parts();

      for await (const part of parts) {
        if (part.type !== 'file') continue;
        if (!ALLOWED_MIME.has(part.mimetype)) {
          return reply
            .status(400)
            .send({ error: `Tipo de archivo no permitido: ${part.mimetype}` });
        }

        const ext = path.extname(part.filename) || '.jpg';
        const safeExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
        const filename = `${randomUUID()}${safeExt}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        const out = createWriteStream(filepath);
        let total = 0;
        let aborted = false;
        for await (const chunk of part.file) {
          total += chunk.length;
          if (total > MAX_FILE_SIZE) {
            aborted = true;
            out.destroy();
            await fs.unlink(filepath).catch(() => {});
            break;
          }
          if (!out.write(chunk)) {
            await new Promise<void>((resolve) => out.once('drain', () => resolve()));
          }
        }
        if (aborted) {
          return reply.status(413).send({ error: 'Archivo demasiado grande (máx 10MB)' });
        }
        await new Promise<void>((resolve, reject) => {
          out.on('error', reject);
          out.on('finish', () => resolve());
          out.end();
        });

        const url = toDbUrl(filename);
        const foto = await prisma.foto.create({
          data: { url, filename, actividadId },
        });
        created.push({ id: foto.id, url: foto.url, filename: foto.filename });
      }

      return reply.status(201).send({ fotos: created });
    }
  );

  app.delete<{ Params: { id: string } }>('/api/fotos/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.status(400).send({ error: 'ID inválido' });
    const foto = await prisma.foto.findUnique({ where: { id } });
    if (!foto) return reply.status(404).send({ error: 'Foto no encontrada' });
    const filepath = path.join(UPLOAD_DIR, foto.filename);
    await fs.unlink(filepath).catch(() => {});
    await prisma.foto.delete({ where: { id } });
    return { ok: true };
  });
}
