import type { UploadApiResponse } from 'cloudinary';

const FOLDER = 'imbio/areas-verdes';

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

async function getClient() {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary no está configurado');
  }
  const { v2 } = await import('cloudinary');
  v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return v2;
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
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
        public_id: publicId,
        resource_type: 'image',
      },
      (err, result) => {
        if (err || !result) {
          reject(new Error(cloudinaryErrMessage(err)));
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
