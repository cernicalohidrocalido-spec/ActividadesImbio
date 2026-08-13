import { FastifyInstance } from 'fastify';
import { renderToBuffer } from '@react-pdf/renderer';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma.js';
import { buildActividadWhere, parseTipos, type ListFilters } from '../lib/filters.js';
import { TIPO_COLOR_HEX } from '../lib/tipo-colors.js';
import { ReporteResumenDocument } from '../lib/pdf.js';

const filterQuerySchema = {
  type: 'object',
  properties: {
    mes: { type: 'string' },
    tipo: { type: 'string' },
    q: { type: 'string' },
    desde: { type: 'string' },
    hasta: { type: 'string' },
  },
  additionalProperties: false,
} as const;

function parseFilters(query: Record<string, unknown>): ListFilters {
  return {
    mes: typeof query.mes === 'string' ? query.mes : undefined,
    tipo: typeof query.tipo === 'string' ? query.tipo : undefined,
    q: typeof query.q === 'string' ? query.q : undefined,
    desde: typeof query.desde === 'string' ? query.desde : undefined,
    hasta: typeof query.hasta === 'string' ? query.hasta : undefined,
  };
}

function describeFilters(f: ListFilters, tipoLabels: Map<string, string>): string {
  const parts: string[] = [];
  if (f.mes) {
    const [y, m] = f.mes.split('-').map(Number);
    const monthName = new Date(y, m - 1, 1).toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric',
    });
    parts.push(`Mes: ${monthName}`);
  }
  if (f.tipo) {
    const arr = parseTipos(f.tipo);
    const labels = arr.map((k) => tipoLabels.get(k) ?? k).join(', ');
    parts.push(`Tipos: ${labels}`);
  }
  if (f.q) parts.push(`Búsqueda: "${f.q}"`);
  if (f.desde) parts.push(`Desde: ${f.desde}`);
  if (f.hasta) parts.push(`Hasta: ${f.hasta}`);
  return parts.length > 0 ? parts.join(' · ') : 'Todos los registros (sin filtros)';
}

export async function reportRoutes(app: FastifyInstance) {
  // ============ PDF resumen (contabilización) ============
  app.get<{ Querystring: Record<string, string> }>(
    '/api/reportes/pdf',
    async (req, reply) => {
      const filters = parseFilters(req.query);
      const where = buildActividadWhere(filters);

      const [actividades, tipos] = await Promise.all([
        prisma.actividad.findMany({
          where,
          orderBy: { fecha: 'asc' },
          include: { fotos: true },
        }),
        prisma.tipoConfig.findMany(),
      ]);

      const tipoLabels = new Map(tipos.map((t) => [t.key, t.label]));
      const tipoColors = new Map(
        tipos.map((t) => [t.key, TIPO_COLOR_HEX[t.color] ?? '#6b7280'])
      );

      const buffer = await renderToBuffer(
        <ReporteResumenDocument
          actividades={actividades}
          tipoLabels={tipoLabels}
          tipoColors={tipoColors}
          filterDescription={describeFilters(filters, tipoLabels)}
        />
      );

      const stamp = filters.mes ?? new Date().toISOString().slice(0, 10);
      reply
        .header('Content-Type', 'application/pdf')
        .header(
          'Content-Disposition',
          `attachment; filename="reporte_imbio_${stamp}.pdf"`
        );
      return reply.send(buffer);
    }
  );

  // ============ Excel con todas las actividades filtradas ============
  app.get<{ Querystring: Record<string, string> }>(
    '/api/reportes/excel',
    async (req, reply) => {
      const filters = parseFilters(req.query);
      const where = buildActividadWhere(filters);

      const [actividades, tipos] = await Promise.all([
        prisma.actividad.findMany({
          where,
          orderBy: { fecha: 'asc' },
          include: { fotos: true },
        }),
        prisma.tipoConfig.findMany(),
      ]);

      const tipoLabels = new Map(tipos.map((t) => [t.key, t.label]));

      const wb = new ExcelJS.Workbook();
      wb.creator = 'IMBIO Pabellón de Arteaga';
      wb.created = new Date();

      // ===== Hoja 1: Actividades =====
      const sheet = wb.addWorksheet('Actividades', {
        properties: { tabColor: { argb: 'FF10B981' } },
      });
      sheet.columns = [
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'Tipos de intervención', key: 'tipos', width: 40 },
        { header: 'Fecha', key: 'fecha', width: 14 },
        { header: 'Realizada por', key: 'realizadaPor', width: 24 },
        { header: 'Dirección', key: 'direccion', width: 50 },
        { header: 'Descripción', key: 'descripcion', width: 40 },
        { header: 'Latitud', key: 'lat', width: 12 },
        { header: 'Longitud', key: 'lng', width: 12 },
        { header: 'N° Fotos', key: 'fotosCount', width: 10 },
        { header: 'Creado', key: 'createdAt', width: 20 },
        { header: 'Actualizado', key: 'updatedAt', width: 20 },
      ];

      // Estilo del header
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF047857' },
      };
      sheet.getRow(1).alignment = { vertical: 'middle' };
      sheet.getRow(1).height = 22;

      for (const a of actividades) {
        const tiposLabel = a.tiposIntervencion
          .map((k) => tipoLabels.get(k) ?? k)
          .join(', ');
        sheet.addRow({
          id: a.id,
          nombre: a.nombre,
          tipos: tiposLabel,
          fecha: new Date(a.fecha).toISOString().slice(0, 10),
          realizadaPor: a.realizadaPor,
          direccion: a.direccion,
          descripcion: a.descripcion,
          lat: a.lat,
          lng: a.lng,
          fotosCount: a.fotos.length,
          createdAt: new Date(a.createdAt).toISOString(),
          updatedAt: new Date(a.updatedAt).toISOString(),
        });
      }

      // Auto-wrap
      sheet.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell((cell) => {
          cell.alignment = { ...(cell.alignment ?? {}), wrapText: true, vertical: 'top' };
        });
      });

      // ===== Hoja 2: Resumen por tipo =====
      const counts = new Map<string, number>();
      for (const a of actividades) {
        for (const t of a.tiposIntervencion) {
          counts.set(t, (counts.get(t) ?? 0) + 1);
        }
      }
      const summary = wb.addWorksheet('Resumen por tipo', {
        properties: { tabColor: { argb: 'FF6366F1' } },
      });
      summary.columns = [
        { header: 'Tipo', key: 'tipo', width: 30 },
        { header: 'Cantidad', key: 'cantidad', width: 12 },
        { header: 'Porcentaje', key: 'porcentaje', width: 14 },
      ];
      summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      summary.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6366F1' },
      };
      const total = Array.from(counts.values()).reduce((s, c) => s + c, 0);
      Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([key, count]) => {
          summary.addRow({
            tipo: tipoLabels.get(key) ?? key,
            cantidad: count,
            porcentaje: total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '0%',
          });
        });
      summary.addRow({
        tipo: 'TOTAL',
        cantidad: total,
        porcentaje: '100%',
      }).font = { bold: true };

      // ===== Hoja 3: Filtros aplicados =====
      const meta = wb.addWorksheet('Filtros aplicados', {
        properties: { tabColor: { argb: 'FF6B7280' } },
      });
      meta.columns = [
        { header: 'Filtro', key: 'filtro', width: 20 },
        { header: 'Valor', key: 'valor', width: 60 },
      ];
      meta.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      meta.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF6B7280' },
      };
      const items: { filtro: string; valor: string }[] = [];
      if (filters.mes) {
        const [y, m] = filters.mes.split('-').map(Number);
        items.push({
          filtro: 'Mes',
          valor: new Date(y, m - 1, 1).toLocaleDateString('es-MX', {
            month: 'long',
            year: 'numeric',
          }),
        });
      }
      if (filters.tipo) {
        const arr = parseTipos(filters.tipo);
        items.push({
          filtro: 'Tipos',
          valor: arr.map((k) => tipoLabels.get(k) ?? k).join(', '),
        });
      }
      if (filters.q) items.push({ filtro: 'Búsqueda', valor: filters.q });
      if (filters.desde) items.push({ filtro: 'Desde', valor: filters.desde });
      if (filters.hasta) items.push({ filtro: 'Hasta', valor: filters.hasta });
      if (items.length === 0) items.push({ filtro: 'Sin filtros', valor: '(todos los registros)' });
      items.push({
        filtro: 'Total actividades',
        valor: String(actividades.length),
      });
      items.push({
        filtro: 'Generado el',
        valor: new Date().toLocaleString('es-MX'),
      });
      items.forEach((i) => meta.addRow(i));

      const buffer = await wb.xlsx.writeBuffer();
      const stamp = filters.mes ?? new Date().toISOString().slice(0, 10);
      reply
        .header(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        .header(
          'Content-Disposition',
          `attachment; filename="actividades_imbio_${stamp}.xlsx"`
        );
      return reply.send(Buffer.from(buffer));
    }
  );
}
