/** Debe importarse ANTES que `cloudinary`: el SDK lee CLOUDINARY_URL al cargar. */
const url = (process.env.CLOUDINARY_URL ?? '').trim().replace(/^['"]|['"]$/g, '');
if (url && !url.startsWith('cloudinary://')) {
  console.warn(
    '⚠️  CLOUDINARY_URL no es válida (debe empezar con cloudinary://, no https://). Se ignora.'
  );
  delete process.env.CLOUDINARY_URL;
} else if (url) {
  process.env.CLOUDINARY_URL = url;
}
