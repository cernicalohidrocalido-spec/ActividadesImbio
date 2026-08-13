import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

const FOLDER = 'imbio/areas-verdes';

export function isCloudinaryConfigured(): boolean {
  if (process.env.CLOUDINARY_URL?.startsWith('cloudinary://')) return true;
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function ensureConfig(): void {
  if (process.env.CLOUDINARY_URL?.startsWith('cloudinary://')) {
    cloudinary.config({ secure: true });
    return;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function optimizeUrl(secureUrl: string): string {
  return secureUrl.replace('/upload/', '/upload/f_auto,q_auto,c_limit,w_1600/');
}

export function uploadImageBuffer(
  buffer: Buffer,
  publicId: string
): Promise<UploadApiResponse> {
  ensureConfig();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: FOLDER,
        public_id: publicId,
        resource_type: 'image',
        overwrite: false,
      },
      (err, result) => {
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
  ensureConfig();
  const id = publicId.startsWith(`${FOLDER}/`) ? publicId : `${FOLDER}/${publicId}`;
  await cloudinary.uploader.destroy(id, { resource_type: 'image' });
}
