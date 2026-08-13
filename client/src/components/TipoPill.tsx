import type { CSSProperties } from 'react';
import { TIPO_COLOR_HEX } from '../lib/types';
import type { TipoColor } from '../lib/types';

interface Props {
  color: TipoColor | string;
  label: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
  active?: boolean;
  title?: string;
}

// Pill / chip con el color real del tipo. Reemplaza al HERO UI Chip
// para poder usar todos los colores (info, primary, secondary, neutral)
// que el componente nativo no soporta.
export default function TipoPill({
  color,
  label,
  size = 'sm',
  onClick,
  active,
  title,
}: Props) {
  const hex = TIPO_COLOR_HEX[color as TipoColor] ?? color;
  const isButton = !!onClick;
  const isActive = active ?? false;

  // Cuando es clickable: colores sólidos cuando activo, borde cuando no.
  // Cuando es display: estilo "soft" (fondo claro + texto fuerte).
  const style: CSSProperties = isButton
    ? isActive
      ? { backgroundColor: hex, color: 'white', borderColor: hex }
      : { backgroundColor: 'transparent', color: hex, borderColor: hex }
    : { backgroundColor: `${hex}22`, color: hex }; // 22 = ~13% opacity

  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  const baseClasses =
    'inline-flex items-center gap-1 rounded-full font-medium border ' +
    sizeClasses +
    (isButton ? ' cursor-pointer transition hover:opacity-90' : '');

  if (isButton) {
    return (
      <button type="button" onClick={onClick} title={title} className={baseClasses} style={style}>
        {label}
      </button>
    );
  }
  return <span className={baseClasses} style={style}>{label}</span>;
}
