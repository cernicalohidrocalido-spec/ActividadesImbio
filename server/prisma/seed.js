import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const TIPOS_DEFAULT = [
    { key: 'RECOLECCION_MUEBLES', label: 'Recolección de muebles', color: 'accent', order: 10 },
    { key: 'LIMPIEZA', label: 'Limpieza', color: 'success', order: 20 },
    { key: 'ORDEN_PODA', label: 'Orden de Poda', color: 'warning', order: 30 },
    { key: 'ORDEN_DERRIBO', label: 'Orden de Derribo', color: 'danger', order: 40 },
    { key: 'ORDEN_DESHIERBE', label: 'Orden de Deshierbe', color: 'default', order: 50 },
    { key: 'RESCATE_ANIMAL', label: 'Rescate y resguardo de animales', color: 'accent', order: 60 },
];
async function main() {
    console.log('🌱 Sembrando datos...');
    // 1. Tipos por defecto
    for (const t of TIPOS_DEFAULT) {
        await prisma.tipoConfig.upsert({
            where: { key: t.key },
            update: { label: t.label, color: t.color, order: t.order, activo: true },
            create: t,
        });
    }
    console.log(`  ✓ ${TIPOS_DEFAULT.length} tipos de intervención`);
    // 2. Actividades de ejemplo (solo si no hay ninguna)
    const total = await prisma.actividad.count();
    if (total === 0) {
        const demo = [
            {
                nombre: 'Limpieza Parque Central',
                tiposIntervencion: ['LIMPIEZA'],
                fecha: new Date(),
                realizadaPor: 'Juan Pérez',
                direccion: 'Av. Hidalgo s/n, Col. Centro, Pabellón de Arteaga',
                descripcion: 'Limpieza general y recolección de basura en el parque central.',
                lat: 22.1493,
                lng: -102.2761,
            },
            {
                nombre: 'Poda de árbol — Calle 5 de Mayo',
                tiposIntervencion: ['ORDEN_PODA', 'LIMPIEZA'],
                fecha: new Date(),
                realizadaPor: 'María López',
                direccion: 'Calle 5 de Mayo #123, Col. Centro',
                descripcion: 'Poda de mantenimiento para evitar ramas peligrosas.',
                lat: 22.1512,
                lng: -102.2785,
            },
        ];
        for (const a of demo) {
            await prisma.actividad.create({ data: a });
            console.log(`  ✓ ${a.nombre}`);
        }
    }
    else {
        console.log(`  · ${total} actividad(es) ya existente(s) — no se agregaron demos`);
    }
    console.log('✅ Seed completado');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
