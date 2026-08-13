// Mapa de colores semánticos a hex (single source of truth del server).
// El cliente tiene el mismo mapa en client/src/lib/types.ts (TIPO_COLOR_HEX).
// Si agregas un color, actualiza AMBOS archivos.
export const TIPO_COLOR_HEX: Record<string, string> = {
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#0ea5e9',
  primary: '#6366f1',
  secondary: '#ec4899',
  accent: '#a855f7',
  neutral: '#64748b',
  // legacy — datos viejos antes del refactor
  default: '#64748b',
};
