import { prisma } from './prisma.js';

export const TIPOS_DEFAULT = [
  { key: 'RECOLECCION_MUEBLES', label: 'Recolección de muebles', color: 'accent', order: 10 },
  { key: 'LIMPIEZA', label: 'Limpieza', color: 'success', order: 20 },
  { key: 'ORDEN_PODA', label: 'Orden de Poda', color: 'warning', order: 30 },
  { key: 'ORDEN_DERRIBO', label: 'Orden de Derribo', color: 'danger', order: 40 },
  { key: 'ORDEN_DESHIERBE', label: 'Orden de Deshierbe', color: 'neutral', order: 50 },
  { key: 'RESCATE_ANIMAL', label: 'Rescate y resguardo de animales', color: 'accent', order: 60 },
] as const;

/** Inserta los tipos de fábrica si la tabla está vacía (p. ej. primer arranque en Render Free). */
export async function ensureDefaultTipos(): Promise<number> {
  const count = await prisma.tipoConfig.count();
  if (count > 0) return count;
  for (const t of TIPOS_DEFAULT) {
    await prisma.tipoConfig.upsert({
      where: { key: t.key },
      update: {},
      create: { ...t },
    });
  }
  return TIPOS_DEFAULT.length;
}
