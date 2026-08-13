import type {
  Actividad,
  ActividadInput,
  Foto,
  ListFilters,
  TipoConfig,
  TipoColor,
} from './types';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const fetchOpts: RequestInit = { credentials: 'include' };

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const looksHtml = /^\s*</.test(text);
    if (looksHtml || res.status === 502 || res.status === 504) {
      throw new Error('El servidor no respondió a tiempo. Espera un minuto y vuelve a intentar.');
    }
    let msg = text || `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* texto plano */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function login(
  username: string,
  password: string
): Promise<{ username: string }> {
  const res = await fetch(`${BASE}/api/login`, {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return jsonOrThrow<{ ok: boolean; username: string }>(res);
}

export async function logout(): Promise<void> {
  const res = await fetch(`${BASE}/api/logout`, { ...fetchOpts, method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function getMe(): Promise<{ username: string }> {
  const res = await fetch(`${BASE}/api/me`, fetchOpts);
  return jsonOrThrow<{ username: string }>(res);
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
  const res = await fetch(`${BASE}/api/actividades${buildQuery(filters)}`, fetchOpts);
  const data = await jsonOrThrow<{ items: Actividad[]; total: number }>(res);
  return data.items;
}

export async function listActividadesPublico(filters: ListFilters = {}): Promise<Actividad[]> {
  const res = await fetch(`${BASE}/api/publico/actividades${buildQuery(filters)}`);
  const data = await jsonOrThrow<{ items: Actividad[]; total: number }>(res);
  return data.items;
}

export async function getActividad(id: number): Promise<Actividad> {
  const res = await fetch(`${BASE}/api/actividades/${id}`, fetchOpts);
  return jsonOrThrow<Actividad>(res);
}

export async function createActividad(input: ActividadInput): Promise<Actividad> {
  const res = await fetch(`${BASE}/api/actividades`, {
    ...fetchOpts,
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
    ...fetchOpts,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<Actividad>(res);
}

export async function deleteActividad(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/actividades/${id}`, { ...fetchOpts, method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('No se pudo leer la foto'));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

export async function uploadFotos(actividadId: number, files: File[]): Promise<Foto[]> {
  const { compressImage } = await import('./compress-image');
  const fotos = [];
  for (const f of files) {
    const ready = await compressImage(f).catch(() => f);
    fotos.push({
      filename: ready.name || 'foto.jpg',
      mime: ready.type || 'image/jpeg',
      data: await fileToBase64(ready),
    });
  }
  const res = await fetch(`${BASE}/api/actividades/${actividadId}/fotos`, {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fotos }),
  });
  const data = await jsonOrThrow<{ fotos: Foto[] }>(res);
  if (!data.fotos?.length) {
    throw new Error('El servidor no guardó la foto. Intenta de nuevo.');
  }
  return data.fotos;
}

export async function getHealth(): Promise<{
  ok: boolean;
  ts?: string;
  fotos?: 'cloudinary' | 'local' | 'none';
}> {
  const res = await fetch(`${BASE}/api/health`);
  return jsonOrThrow(res);
}

export async function deleteFoto(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/fotos/${id}`, { ...fetchOpts, method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// ===== Tipos de intervención =====

export async function listTipos(activo?: boolean): Promise<TipoConfig[]> {
  const qs = activo === undefined ? '' : `?activo=${activo}`;
  const res = await fetch(`${BASE}/api/tipos${qs}`, fetchOpts);
  const data = await jsonOrThrow<{ items: TipoConfig[]; total: number }>(res);
  return data.items;
}

export async function listTiposPublicos(): Promise<TipoConfig[]> {
  const res = await fetch(`${BASE}/api/publico/tipos`);
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
    ...fetchOpts,
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
    ...fetchOpts,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<TipoConfig>(res);
}

export async function deleteTipo(id: number): Promise<void> {
  const res = await fetch(`${BASE}/api/tipos/${id}`, { ...fetchOpts, method: 'DELETE' });
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

export async function mejorarDescripcion(input: {
  descripcion: string;
  tipos?: string[];
  colonia?: string;
  nombre?: string;
}): Promise<string> {
  const res = await fetch(`${BASE}/api/ai/matlacho`, {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await jsonOrThrow<{ texto: string }>(res);
  return data.texto;
}
