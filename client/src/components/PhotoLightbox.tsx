import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  urls: string[];
  startIndex?: number;
  alt?: string;
  onClose: () => void;
}

export default function PhotoLightbox({ urls, startIndex = 0, alt, onClose }: Props) {
  const [i, setI] = useState(startIndex);
  const total = urls.length;
  const src = urls[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && total > 1) setI((n) => (n + 1) % total);
      if (e.key === 'ArrowLeft' && total > 1) setI((n) => (n - 1 + total) % total);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, total]);

  if (!src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Foto a tamaño completo"
    >
      <button
        type="button"
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/15 text-white text-xl leading-none hover:bg-white/30"
        onClick={onClose}
        aria-label="Cerrar"
      >
        ×
      </button>
      {total > 1 && (
        <>
          <button
            type="button"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white text-2xl leading-none hover:bg-white/30"
            onClick={(e) => {
              e.stopPropagation();
              setI((n) => (n - 1 + total) % total);
            }}
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 text-white text-2xl leading-none hover:bg-white/30"
            onClick={(e) => {
              e.stopPropagation();
              setI((n) => (n + 1) % total);
            }}
            aria-label="Siguiente"
          >
            ›
          </button>
        </>
      )}
      <img
        src={src}
        alt={alt ?? 'Fotografía'}
        className="max-w-full max-h-[90vh] object-contain rounded-md shadow-lg"
        onClick={(e) => e.stopPropagation()}
      />
      {total > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
          {i + 1} / {total}
        </p>
      )}
    </div>,
    document.body
  );
}
