import { FastifyInstance } from 'fastify';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
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

async function readPartToBuffer(
  part: { file: AsyncIterable<Buffer> },
  maxBytes: number
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of part.file) {
    total += chunk.length;
    if (total > maxBytes) {
      throw Object.assign(new Error('Archivo demasiado grande (máx 10MB)'), { statusCode: 413 });
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
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

      const useCloud = isCloudinaryConfigured();
      if (!useCloud && process.env.NODE_ENV === 'production') {
        return reply.status(503).send({
          error:
            'Falta CLOUDINARY_URL. En Render → Environment pega la API Environment variable de Cloudinary (Dashboard → API Keys), con formato cloudinary://API_KEY:API_SECRET@CLOUD_NAME. No uses un enlace https:// de una imagen.',
        });
      }

      const created: { id: number; url: string; filename: string }[] = [];
      const parts = req.parts();

      for await (const part of parts) {
        if (part.type !== 'file') continue;
        if (!isAllowedImage(part.mimetype, part.filename)) {
          return reply.status(400).send({
            error: `Tipo de archivo no permitido (${part.mimetype || part.filename || 'desconocido'}). Usa JPG, PNG o WebP.`,
          });
        }

        const ext = path.extname(part.filename) || '.jpg';
        const safeExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
        const id = randomUUID();

        try {
          const buffer = await readPartToBuffer(part, MAX_FILE_SIZE);
          let url: string;
          let filename: string;

          if (useCloud) {
            const uploaded = await uploadImageBuffer(buffer, id);
            filename = uploaded.public_id;
            url = optimizeUrl(uploaded.secure_url);
          } else {
            filename = `${id}${safeExt}`;
            const filepath = path.join(UPLOAD_DIR, filename);
            await fs.writeFile(filepath, buffer);
            url = toLocalUrl(filename);
          }

          const foto = await prisma.foto.create({
            data: { url, filename, actividadId },
          });
          created.push({ id: foto.id, url: foto.url, filename: foto.filename });
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode ?? 500;
          const raw = err instanceof Error ? err.message : 'Error al subir foto';
          const message =
            /cloudinary|api_key|api key|invalid/i.test(raw)
              ? 'Cloudinary rechazó la foto. En Render, CLOUDINARY_URL debe ser cloudinary://API_KEY:API_SECRET@CLOUD_NAME (Dashboard → API Keys).'
              : raw;
          return reply.status(status).send({ error: message });
        }
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
