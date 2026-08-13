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

function parseDayStart(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) {
    const d = new Date(ymd);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

function parseDayEnd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) {
    const d = new Date(ymd);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(23, 59, 59, 999);
    return d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
}

export function buildActividadWhere(f: ListFilters): Prisma.ActividadWhereInput {
  const where: Prisma.ActividadWhereInput = {};

  // desde/hasta (p. ej. filtro por semana) tiene prioridad sobre mes
  if (f.desde || f.hasta) {
    const fechaFilter: { gte?: Date; lte?: Date } = {};
    if (f.desde) {
      const gte = parseDayStart(f.desde);
      if (gte) fechaFilter.gte = gte;
    }
    if (f.hasta) {
      const lte = parseDayEnd(f.hasta);
      if (lte) fechaFilter.lte = lte;
    }
    if (fechaFilter.gte || fechaFilter.lte) where.fecha = fechaFilter;
  } else if (f.mes && /^\d{4}-\d{2}$/.test(f.mes)) {
    const [y, m] = f.mes.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    where.fecha = { gte: start, lt: end };
  }

  const tipos = parseTipos(f.tipo);
  if (tipos.length > 0) {
    where.tiposIntervencion = { hasSome: tipos };
  }
  if (f.q) where.nombre = { contains: f.q, mode: 'insensitive' };
  return where;
}
