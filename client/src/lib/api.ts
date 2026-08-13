import type {
  Actividad,
  ActividadInput,
  Foto,
  ListFilters,
  TipoConfig,
  TipoColor,
} from './types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function buildQuery(filters: ListFilters): string {
  const params = new URLSearchParams();
  if (filters.mes) params.set('mes', filters.mes);
  if (filters.tipo && filters.tipo.length > 0) params.set('tipo', filters.tipo.join(','));
  if (filters.q) params.set('q', filters.q);
  if (filters.desde) params.set('desde', filters.desde);
  if (filters.hasta) params.set('hasta', filters.hasta);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function listActividades(filters: ListFilters = {}): Promise<Actividad[]> {
  const res = await fetch(`${BASE}/api/actividades${buildQuery(filters)}`);
  const data = await jsonOrThrow<{ items: Actividad[]; total: number }>(res);
  return data.items;
}

export async function getActividad(id: number): Promise<Actividad> {
  const res = await fetch(`${BASE}/api/actividades/${id}`);
  return jsonOrThrow<Actividad>(res);
}

export async function createActividad(input: ActividadInput): Promise<Actividad> {
  const res = await fetch(`${BASE}/api/actividades`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<Actividad>(res);
}

export async function updateActividad(
  id: number,
  input: Partial<ActividadInput>
): Promise<Actividad> {
  const res = await fetch(`${BASE}/api/actividades/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<Actividad>(res);
}

export async function deleteActividad(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/actividades/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function uploadFotos(actividadId: number, files: File[]): Promise<Foto[]> {
  const form = new FormData();
  files.forEach((f) => form.append('fotos', f));
  const res = await fetch(`${BASE}/api/actividades/${actividadId}/fotos`, {
    method: 'POST',
    body: form,
  });
  const data = await jsonOrThrow<{ fotos: Foto[] }>(res);
  return data.fotos;
}

export async function deleteFoto(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/fotos/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ===== Tipos de intervención =====

export async function listTipos(activo?: boolean): Promise<TipoConfig[]> {
  const qs = activo === undefined ? '' : `?activo=${activo}`;
  const res = await fetch(`${BASE}/api/tipos${qs}`);
  const data = await jsonOrThrow<{ items: TipoConfig[]; total: number }>(res);
  return data.items;
}

export interface TipoInput {
  label: string;
  color: TipoColor;
  order?: number;
}

export async function createTipo(input: TipoInput): Promise<TipoConfig> {
  const res = await fetch(`${BASE}/api/tipos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<TipoConfig>(res);
}

export async function updateTipo(
  id: number,
  input: Partial<TipoInput & { activo: boolean }>
): Promise<TipoConfig> {
  const res = await fetch(`${BASE}/api/tipos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<TipoConfig>(res);
}

export async function deleteTipo(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/tipos/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export function buildReportQuery(filters: ListFilters): string {
  const params = new URLSearchParams();
  if (filters.mes) params.set('mes', filters.mes);
  if (filters.tipo && filters.tipo.length > 0) params.set('tipo', filters.tipo.join(','));
  if (filters.q) params.set('q', filters.q);
  if (filters.desde) params.set('desde', filters.desde);
  if (filters.hasta) params.set('hasta', filters.hasta);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function downloadReportePDF(filters: ListFilters): void {
  window.open(`${BASE}/api/reportes/pdf${buildReportQuery(filters)}`, '_blank');
}

export function downloadReporteExcel(filters: ListFilters): void {
  window.open(`${BASE}/api/reportes/excel${buildReportQuery(filters)}`, '_blank');
}
