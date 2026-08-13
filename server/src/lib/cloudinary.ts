import type { UploadApiResponse } from 'cloudinary';

const FOLDER = 'imbio/areas-verdes';

function cleanCloudinaryUrl(): string | undefined {
  const raw = (process.env.CLOUDINARY_URL ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/^CLOUDINARY_URL\s*=\s*/i, '')
    .replace(/[<>]/g, '')
    .trim();
  if (raw.startsWith('cloudinary://')) {
    process.env.CLOUDINARY_URL = raw;
    return raw;
  }
  if (raw) {
    delete process.env.CLOUDINARY_URL;
  }
  return undefined;
}

export function isCloudinaryConfigured(): boolean {
  if (cleanCloudinaryUrl()) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function parseCloudinaryUrl(url: string): {
  cloud_name: string;
  api_key: string;
  api_secret: string;
} | null {
  const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/]+)/);
  if (!m) return null;
  return { api_key: m[1], api_secret: m[2], cloud_name: m[3] };
}

async function getClient() {
  const url = cleanCloudinaryUrl();
  const { v2 } = await import('cloudinary');
  const parsed = url ? parseCloudinaryUrl(url) : null;
  if (parsed) {
    process.env.CLOUDINARY_CLOUD_NAME = parsed.cloud_name;
    process.env.CLOUDINARY_API_KEY = parsed.api_key;
    process.env.CLOUDINARY_API_SECRET = parsed.api_secret;
    process.env.CLOUDINARY_URL = `cloudinary://${parsed.api_key}:${parsed.api_secret}@${parsed.cloud_name}`;
    v2.config({
      cloud_name: parsed.cloud_name,
      api_key: parsed.api_key,
      api_secret: parsed.api_secret,
      secure: true,
    });
  } else {
    v2.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }
  return v2;
}

function sniffMime(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return 'image/jpeg';
}

function cloudinaryErrMessage(err: unknown): string {
  if (!err) return 'Cloudinary no devolvió resultado';
  if (err instanceof Error && err.message) return err.message;
  const e = err as { message?: string; error?: { message?: string } };
  return e.error?.message || e.message || 'Cloudinary no devolvió resultado';
}

export function optimizeUrl(secureUrl: string): string {
  return secureUrl.replace('/upload/', '/upload/f_auto,q_auto,c_limit,w_1600/');
}

export async function uploadImageBuffer(
  buffer: Buffer,
  publicId: string
): Promise<UploadApiResponse> {
  if (!buffer?.length) {
    throw new Error('La foto llegó vacía. Vuelve a elegir el archivo.');
  }
  const cloudinary = await getClient();
  const mime = sniffMime(buffer);
  const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
  try {
    return await cloudinary.uploader.upload(dataUri, {
      folder: FOLDER,
      public_id: publicId,
      resource_type: 'image',
      overwrite: true,
    });
  } catch (err) {
    throw new Error(cloudinaryErrMessage(err));
  }
}

export async function destroyImage(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured()) return;
  const cloudinary = await getClient();
  const id = publicId.startsWith(`${FOLDER}/`) ? publicId : `${FOLDER}/${publicId}`;
  await cloudinary.uploader.destroy(id, { resource_type: 'image' });
}

export async function pingCloudinary(): Promise<'ok' | 'error'> {
  if (!isCloudinaryConfigured()) return 'error';
  try {
    const cloudinary = await getClient();
    const res = await cloudinary.api.ping();
    return res?.status === 'ok' ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}
