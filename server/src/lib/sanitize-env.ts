/** Debe importarse ANTES que `cloudinary`: el SDK lee CLOUDINARY_URL al cargar. */
const raw = (process.env.CLOUDINARY_URL ?? '')
  .trim()
  .replace(/^['"]|['"]$/g, '')
  .replace(/^CLOUDINARY_URL\s*=\s*/i, '')
  .replace(/[<>]/g, '')
  .trim();
if (raw && !raw.startsWith('cloudinary://')) {
  console.warn(
    '⚠️  CLOUDINARY_URL no es válida (debe empezar con cloudinary://, no https://). Se ignora.'
  );
  delete process.env.CLOUDINARY_URL;
} else if (raw) {
  process.env.CLOUDINARY_URL = raw;
}
