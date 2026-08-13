// Helper compartido para construir el `where` de Prisma de las actividades
// a partir de los filtros de query (mes, tipo, q, desde, hasta).
import type { Prisma } from '@prisma/client';

export interface ListFilters {
  mes?: string;
  tipo?: string | string[];
  q?: string;
  desde?: string;
  hasta?: string;
}

export function parseTipos(tipo?: string | string[]): string[] {
  if (!tipo) return [];
  const arr = Array.isArray(tipo) ? tipo : tipo.split(',');
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

export function buildActividadWhere(f: ListFilters): Prisma.ActividadWhereInput {
  const where: Prisma.ActividadWhereInput = {};

  if (f.mes && /^\d{4}-\d{2}$/.test(f.mes)) {
    const [y, m] = f.mes.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    where.fecha = { gte: start, lt: end };
  }
  if (f.desde || f.hasta) {
    const fechaFilter: { gte?: Date; lte?: Date } =
      typeof where.fecha === 'object' && where.fecha !== null && !Array.isArray(where.fecha)
        ? (where.fecha as { gte?: Date; lte?: Date })
        : {};
    if (f.desde) fechaFilter.gte = new Date(f.desde);
    if (f.hasta) {
      const h = new Date(f.hasta);
      h.setHours(23, 59, 59, 999);
      fechaFilter.lte = h;
    }
    where.fecha = fechaFilter;
  }
  const tipos = parseTipos(f.tipo);
  if (tipos.length > 0) {
    where.tiposIntervencion = { hasSome: tipos };
  }
  if (f.q) where.nombre = { contains: f.q, mode: 'insensitive' };
  return where;
}
