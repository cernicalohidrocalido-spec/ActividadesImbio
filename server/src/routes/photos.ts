import { FastifyInstance } from 'fastify';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  destroyImage,
  isCloudinaryConfigured,
  optimizeUrl,
  uploadImageBuffer,
} from '../lib/cloudinary.js';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const jsonSchema = z.object({
  fotos: z
    .array(
      z.object({
        filename: z.string().max(200).optional(),
        mime: z.string().max(80).optional(),
        data: z.string().min(80),
      })
    )
    .min(1)
    .max(10),
});

function isAllowedImage(mimetype: string, filename: string): boolean {
  const mime = (mimetype || '').split(';')[0].trim().toLowerCase();
  const ext = path.extname(filename || '').toLowerCase();
  if (ALLOWED_MIME.has(mime)) return true;
  if ((mime === '' || mime === 'application/octet-stream') && ALLOWED_EXT.has(ext)) {
    return true;
  }
  return false;
}

function toLocalUrl(filename: string): string {
  return `/uploads/${filename}`;
}

async function saveFoto(
  buffer: Buffer,
  originalName: string,
  actividadId: number
): Promise<{ id: number; url: string; filename: string }> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw Object.assign(new Error('Archivo demasiado grande (máx 10MB)'), { statusCode: 413 });
  }
  const id = randomUUID();
  const ext = path.extname(originalName) || '.jpg';
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
  let url: string;
  let filename: string;
  if (isCloudinaryConfigured()) {
    const uploaded = await uploadImageBuffer(buffer, id);
    filename = uploaded.public_id;
    url = optimizeUrl(uploaded.secure_url);
  } else if (process.env.NODE_ENV === 'production') {
    throw Object.assign(
      new Error(
        'Falta CLOUDINARY_URL. En Render → Environment pega cloudinary://API_KEY:API_SECRET@CLOUD_NAME'
      ),
      { statusCode: 503 }
    );
  } else {
    filename = `${id}${safeExt}`;
    await fs.writeFile(path.join(UPLOAD_DIR, filename), buffer);
    url = toLocalUrl(filename);
  }
  const foto = await prisma.foto.create({
    data: { url, filename, actividadId },
  });
  return { id: foto.id, url: foto.url, filename: foto.filename };
}

function decodeDataUrl(raw: string): Buffer {
  const cleaned = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw;
  return Buffer.from(cleaned.replace(/\s/g, ''), 'base64');
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

      const created: { id: number; url: string; filename: string }[] = [];

      try {
        if (req.isMultipart()) {
          const parts = req.parts();
          for await (const part of parts) {
            if (part.type !== 'file') continue;
            if (!isAllowedImage(part.mimetype, part.filename)) {
              return reply.status(400).send({
                error: `Tipo de archivo no permitido. Usa JPG, PNG o WebP.`,
              });
            }
            const withBuf = part as typeof part & { toBuffer?: () => Promise<Buffer> };
            const buffer =
              typeof withBuf.toBuffer === 'function'
                ? await withBuf.toBuffer()
                : await (async () => {
                    const chunks: Buffer[] = [];
                    let total = 0;
                    for await (const chunk of part.file) {
                      total += chunk.length;
                      if (total > MAX_FILE_SIZE) {
                        throw Object.assign(new Error('Archivo demasiado grande (máx 10MB)'), {
                          statusCode: 413,
                        });
                      }
                      chunks.push(chunk);
                    }
                    return Buffer.concat(chunks);
                  })();
            created.push(await saveFoto(buffer, part.filename || 'foto.jpg', actividadId));
          }
        } else {
          const parsed = jsonSchema.safeParse(req.body);
          if (!parsed.success) {
            return reply.status(400).send({ error: 'No se recibió ninguna foto.' });
          }
          for (const item of parsed.data.fotos) {
            const filename = item.filename || 'foto.jpg';
            if (!isAllowedImage(item.mime || 'image/jpeg', filename)) {
              return reply.status(400).send({ error: 'Tipo de archivo no permitido. Usa JPG, PNG o WebP.' });
            }
            const buffer = decodeDataUrl(item.data);
            if (!buffer.length) {
              return reply.status(400).send({ error: 'La foto llegó vacía. Elige el archivo de nuevo.' });
            }
            created.push(await saveFoto(buffer, filename, actividadId));
          }
        }
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode ?? 500;
        const raw = err instanceof Error ? err.message : 'Error al subir foto';
        req.log.error(err);
        const message = /cloudinary|api_key|api key|invalid|signature/i.test(raw)
          ? 'Cloudinary rechazó la foto. Revisa CLOUDINARY_URL en Render (cloudinary://API_KEY:API_SECRET@CLOUD_NAME).'
          : raw;
        return reply.status(status).send({ error: message });
      }

      if (created.length === 0) {
        return reply.status(400).send({
          error: 'No se recibió ninguna foto. Vuelve a elegir el archivo.',
        });
      }
      return reply.status(201).send({ fotos: created });
    }
  );

  app.delete<{ Params: { id: string } }>('/api/fotos/:id', async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return reply.status(400).send({ error: 'ID inválido' });
    const foto = await prisma.foto.findUnique({ where: { id } });
    if (!foto) return reply.status(404).send({ error: 'Foto no encontrada' });

    if (foto.url.startsWith('http')) {
      await destroyImage(foto.filename).catch(() => {});
    } else {
      await fs.unlink(path.join(UPLOAD_DIR, foto.filename)).catch(() => {});
    }
    await prisma.foto.delete({ where: { id } });
    return { ok: true };
  });
}
