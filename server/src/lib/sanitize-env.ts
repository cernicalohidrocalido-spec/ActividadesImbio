/** Debe importarse ANTES que `cloudinary`. El SDK firma mal si CLOUDINARY_URL y config() se mezclan. */

function decodePart(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

const raw = (process.env.CLOUDINARY_URL ?? '')
  .replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, '')
  .trim()
  .replace(/^['"]+|['"]+$/g, '')
  .replace(/^CLOUDINARY_URL\s*=\s*/i, '')
  .replace(/[<>]/g, '')
  .replace(/\s+/g, '');

if (raw.startsWith('cloudinary://')) {
  const m = raw.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/i);
  if (m) {
    process.env.CLOUDINARY_API_KEY = decodePart(m[1]);
    process.env.CLOUDINARY_API_SECRET = decodePart(m[2]);
    process.env.CLOUDINARY_CLOUD_NAME = decodePart(m[3]);
  } else {
    console.warn('⚠️  CLOUDINARY_URL no se pudo leer. Usa cloudinary://API_KEY:API_SECRET@CLOUD_NAME');
  }
} else if (raw) {
  console.warn(
    '⚠️  CLOUDINARY_URL no es válida (debe empezar con cloudinary://, no https://). Se ignora.'
  );
}

// El SDK no debe volver a parsear la URL (ahí salía Invalid Signature).
delete process.env.CLOUDINARY_URL;
