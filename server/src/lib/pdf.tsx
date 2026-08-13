import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Actividad, Foto } from '@prisma/client';
import { TIPO_COLOR_HEX } from './tipo-colors.js';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  header: {
    borderBottom: '2 solid #047857',
    paddingBottom: 10,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: 700, color: '#047857' },
  subtitle: { fontSize: 11, color: '#374151', marginTop: 4 },
  meta: { fontSize: 9, color: '#6b7280', marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 6,
    color: '#047857',
  },
  filters: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  filterRow: { flexDirection: 'row', marginBottom: 2 },
  filterLabel: { width: 80, color: '#6b7280', fontSize: 9 },
  filterValue: { flex: 1, fontSize: 9, color: '#1f2937' },
  summaryTable: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  summaryCell: { padding: 8, fontSize: 10 },
  summaryCellHeader: {
    padding: 8,
    fontSize: 10,
    fontWeight: 700,
    backgroundColor: '#f3f4f6',
  },
  cellLabel: { width: '60%' },
  cellCount: { width: '20%', textAlign: 'right' },
  cellPercent: { width: '20%', textAlign: 'right' },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  totalsBox: {
    marginTop: 14,
    padding: 10,
    backgroundColor: '#ecfdf5',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderStyle: 'solid',
  },
  totalsTitle: { fontSize: 11, fontWeight: 700, color: '#047857', marginBottom: 4 },
  totalsLine: { fontSize: 10, color: '#065f46', marginBottom: 2 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTop: '1 solid #e5e7eb',
    paddingTop: 6,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 18,
    marginBottom: 8,
    color: '#047857',
  },
  detailItem: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
    backgroundColor: '#fafafa',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  detailNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#047857',
    color: 'white',
    fontSize: 10,
    fontWeight: 700,
    textAlign: 'center',
    paddingTop: 5,
    marginRight: 8,
  },
  detailName: {
    flex: 1,
    fontSize: 11,
    fontWeight: 700,
    color: '#1f2937',
  },
  detailDate: {
    fontSize: 9,
    color: '#6b7280',
  },
  detailField: {
    flexDirection: 'row',
    marginTop: 3,
  },
  detailLabel: {
    width: 80,
    fontSize: 8,
    color: '#6b7280',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  detailValue: {
    flex: 1,
    fontSize: 9,
    color: '#1f2937',
  },
  detailTipos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  detailTipoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 2,
  },
  detailTipoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  detailTipoText: {
    fontSize: 8,
    fontWeight: 600,
  },
  detailEmpty: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
    padding: 12,
  },
  // Agrupado por tipo
  tipoGroup: {
    marginTop: 10,
    marginBottom: 4,
    break: 'avoid',
  },
  tipoGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#047857',
    borderLeftStyle: 'solid',
  },
  tipoGroupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  tipoGroupName: {
    flex: 1,
    fontSize: 11,
    fontWeight: 700,
    color: '#065f46',
  },
  tipoGroupCount: {
    fontSize: 10,
    color: '#047857',
    fontWeight: 700,
  },
  tipoGroupBody: {
    marginTop: 4,
    marginLeft: 12,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#d1d5db',
    borderLeftStyle: 'dashed',
  },
});

type ActividadConFotos = Actividad & { fotos: Foto[] };

export interface ReporteResumenData {
  actividades: ActividadConFotos[];
  tipoLabels: Map<string, string>;
  tipoColors: Map<string, string>;
  filterDescription: string;
}

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatMonth(mes: string): string {
  if (!/^\d{4}-\d{2}$/.test(mes)) return mes;
  const [y, m] = mes.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function ReporteResumenDocument({
  actividades,
  tipoLabels,
  tipoColors,
  filterDescription,
}: ReporteResumenData) {
  // Conteo por tipo
  const counts = new Map<string, number>();
  for (const a of actividades) {
    for (const t of a.tiposIntervencion) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  // Ordenar por count descendente, luego por label
  const rows = Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      count,
      label: tipoLabels.get(key) ?? key,
      color: tipoColors.get(key) ?? '#6b7280',
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const total = rows.reduce((s, r) => s + r.count, 0);
  const tiposUnicos = rows.length;
  const actividadesUnicas = actividades.length;

  return (
    <Document
      title="Re resumen de actividades IMBIO"
      author="IMBIO Pabellón de Arteaga"
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>IMBIO — Pabellón de Arteaga, Ags.</Text>
          <Text style={styles.subtitle}>Reporte resumen de actividades</Text>
          <Text style={styles.meta}>
            Generado el{' '}
            {new Date().toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>

        {/* Filtros aplicados */}
        <View style={styles.filters}>
          <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>
            Filtros aplicados
          </Text>
          <Text style={styles.meta}>{filterDescription || 'Ninguno (todos los registros)'}</Text>
        </View>

        {/* Totales */}
        <View style={styles.totalsBox}>
          <Text style={styles.totalsTitle}>Resumen general</Text>
          <Text style={styles.totalsLine}>
            <Text style={{ fontWeight: 700 }}>{actividadesUnicas}</Text> actividad(es) registrada(s)
          </Text>
          <Text style={styles.totalsLine}>
            <Text style={{ fontWeight: 700 }}>{total}</Text> intervención(es) en total (sumando múltiples tipos por actividad)
          </Text>
          <Text style={styles.totalsLine}>
            <Text style={{ fontWeight: 700 }}>{tiposUnicos}</Text> tipo(s) de intervención diferente(s) utilizado(s)
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Contabilización por tipo de intervención</Text>

        {rows.length === 0 ? (
          <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 8 }}>
            No hay actividades registradas con los filtros aplicados.
          </Text>
        ) : (
          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryCellHeader, styles.cellLabel]}>Tipo</Text>
              <Text style={[styles.summaryCellHeader, styles.cellCount]}>Cantidad</Text>
              <Text style={[styles.summaryCellHeader, styles.cellPercent]}>%</Text>
            </View>
            {rows.map((r) => (
              <View key={r.key} style={styles.summaryRow}>
                <View style={[styles.summaryCell, styles.cellLabel, styles.labelRow]}>
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: r.color },
                    ]}
                  />
                  <Text>{r.label}</Text>
                </View>
                <Text style={[styles.summaryCell, styles.cellCount]}>{r.count}</Text>
                <Text style={[styles.summaryCell, styles.cellPercent]}>
                  {total > 0 ? `${((r.count / total) * 100).toFixed(1)}%` : '0%'}
                </Text>
              </View>
            ))}
            <View style={[styles.summaryRow, { backgroundColor: '#f0fdf4' }]}>
              <Text style={[styles.summaryCell, styles.cellLabel, { fontWeight: 700 }]}>
                TOTAL
              </Text>
              <Text style={[styles.summaryCell, styles.cellCount, { fontWeight: 700 }]}>
                {total}
              </Text>
              <Text style={[styles.summaryCell, styles.cellPercent, { fontWeight: 700 }]}>
                100%
              </Text>
            </View>
          </View>
        )}

        {/* ===== Desglose detallado de actividades, agrupado por tipo ===== */}
        <Text style={styles.detailSectionTitle}>
          Desglose de actividades por tipo ({actividadesUnicas})
        </Text>
        {actividadesUnicas === 0 ? (
          <Text style={styles.detailEmpty}>
            No hay actividades para mostrar con los filtros aplicados.
          </Text>
        ) : (
          rows.map((row) => {
            // Filtrar las actividades que tienen este tipo
            const actsDelTipo = actividades.filter((a) =>
              a.tiposIntervencion.includes(row.key)
            );
            return (
              <View key={row.key} style={styles.tipoGroup}>
                {/* Header del grupo: dot + nombre + count */}
                <View style={styles.tipoGroupHeader}>
                  <View
                    style={[
                      styles.tipoGroupDot,
                      { backgroundColor: row.color },
                    ]}
                  />
                  <Text style={styles.tipoGroupName}>{row.label}</Text>
                  <Text style={styles.tipoGroupCount}>
                    {actsDelTipo.length} actividad{actsDelTipo.length === 1 ? '' : 'es'}
                  </Text>
                </View>

                {/* Body: lista de actividades de este tipo */}
                {actsDelTipo.length > 0 && (
                  <View style={styles.tipoGroupBody}>
                    {actsDelTipo.map((a) => (
                      <View key={a.id} style={styles.detailItem} wrap={false}>
                        {/* Header: nombre + fecha */}
                        <View style={styles.detailHeader}>
                          <Text style={styles.detailName}>{a.nombre}</Text>
                          <Text style={styles.detailDate}>
                            {new Date(a.fecha).toLocaleDateString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>

                        {/* Otros tipos de esta actividad (excluyendo el actual) */}
                        {a.tiposIntervencion.filter((k) => k !== row.key).length > 0 && (
                          <View style={styles.detailTipos}>
                            {a.tiposIntervencion
                              .filter((k) => k !== row.key)
                              .map((k) => {
                                const label = tipoLabels.get(k) ?? k;
                                const color = tipoColors.get(k) ?? '#6b7280';
                                return (
                                  <View
                                    key={k}
                                    style={[
                                      styles.detailTipoPill,
                                      { backgroundColor: `${color}22` },
                                    ]}
                                  >
                                    <View
                                      style={[
                                        styles.detailTipoDot,
                                        { backgroundColor: color },
                                      ]}
                                    />
                                    <Text style={[styles.detailTipoText, { color }]}>
                                      {label}
                                    </Text>
                                  </View>
                                );
                              })}
                          </View>
                        )}

                        {/* Dirección */}
                        <View style={styles.detailField}>
                          <Text style={styles.detailLabel}>Dirección</Text>
                          <Text style={styles.detailValue}>{a.direccion}</Text>
                        </View>

                        {/* Realizada por */}
                        <View style={styles.detailField}>
                          <Text style={styles.detailLabel}>Realizada por</Text>
                          <Text style={styles.detailValue}>{a.realizadaPor}</Text>
                        </View>

                        {/* Descripción (si existe) */}
                        {a.descripcion && (
                          <View style={styles.detailField}>
                            <Text style={styles.detailLabel}>Descripción</Text>
                            <Text style={styles.detailValue}>{a.descripcion}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.footer}>
          IMBIO Pabellón de Arteaga · Reporte generado automáticamente
        </Text>
      </Page>
    </Document>
  );
}

// Re-exportar para compatibilidad
export { TIPO_COLOR_HEX };
