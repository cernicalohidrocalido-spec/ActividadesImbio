export type TipoColor =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'neutral';

export const TIPO_COLORS: TipoColor[] = [
  'success',
  'warning',
  'danger',
  'info',
  'primary',
  'secondary',
  'accent',
  'neutral',
];

// Hex por color semántico — fuente única para todos los componentes
export const TIPO_COLOR_HEX: Record<TipoColor, string> = {
  success: '#10b981',   // verde
  warning: '#f59e0b',   // ámbar
  danger: '#ef4444',    // rojo
  info: '#0ea5e9',      // azul cielo
  primary: '#6366f1',   // indigo
  secondary: '#ec4899', // rosa
  accent: '#a855f7',    // violeta
  neutral: '#64748b',   // slate (gris más visible que #6b7280)
};

export interface TipoConfig {
  id: number;
  key: string;
  label: string;
  color: TipoColor;
  order: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Foto {
  id: number;
  url: string;
  filename: string;
  orden?: number;
}

export function sortFotos(fotos: Foto[]): Foto[] {
  return [...fotos].sort((a, b) => {
    const oa = a.orden ?? a.id;
    const ob = b.orden ?? b.id;
    return oa - ob || a.id - b.id;
  });
}

export interface Actividad {
  id: number;
  nombre: string;
  tiposIntervencion: string[];
  fecha: string;
  realizadaPor: string;
  direccion: string;
  descripcion: string;
  lat: number;
  lng: number;
  createdAt: string;
  updatedAt: string;
  fotos: Foto[];
}

export interface ActividadInput {
  nombre: string;
  tiposIntervencion: string[];
  fecha: string;
  realizadaPor: string;
  direccion: string;
  descripcion?: string;
  lat: number;
  lng: number;
}

export interface ListFilters {
  mes?: string;
  tipo?: string[];
  q?: string;
  desde?: string;
  hasta?: string;
}
