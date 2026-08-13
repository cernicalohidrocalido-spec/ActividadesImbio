import type { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

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
    v2.config({ ...parsed, secure: true });
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

export function optimizeUrl(secureUrl: string): string {
  return secureUrl.replace('/upload/', '/upload/f_auto,q_auto,c_limit,w_1600/');
}

export async function uploadImageBuffer(
  buffer: Buffer,
  publicId: string
): Promise<UploadApiResponse> {
  const cloudinary = await getClient();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
        public_id: publicId,
        resource_type: 'image',
        overwrite: false,
      },
      (err: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (err || !result) {
          const msg =
            err?.message ||
            (err as { error?: { message?: string } } | undefined)?.error?.message ||
            'Cloudinary no devolvió resultado';
          reject(new Error(msg));
          return;
        }
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

export async function destroyImage(publicId: string): Promise<void> {
  if (!isCloudinaryConfigured()) return;
  const cloudinary = await getClient();
  const id = publicId.startsWith(`${FOLDER}/`) ? publicId : `${FOLDER}/${publicId}`;
  await cloudinary.uploader.destroy(id, { resource_type: 'image' });
}
