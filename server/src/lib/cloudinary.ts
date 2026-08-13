import type { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

const FOLDER = 'imbio/areas-verdes';

function cleanCloudinaryUrl(): string | undefined {
  const raw = (process.env.CLOUDINARY_URL ?? '').trim().replace(/^['"]|['"]$/g, '');
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

async function getClient() {
  cleanCloudinaryUrl();
  const { v2 } = await import('cloudinary');
  if (process.env.CLOUDINARY_URL?.startsWith('cloudinary://')) {
    v2.config({ secure: true });
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
          reject(err ?? new Error('Cloudinary no devolvió resultado'));
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
