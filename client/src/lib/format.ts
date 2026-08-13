function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Fecha de calendario a medianoche UTC (típico de `new Date('YYYY-MM-DD')`). */
function isUtcMidnight(d: Date): boolean {
  return (
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

function formatLocaleDate(iso: string, options: Intl.DateTimeFormatOptions): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', options);
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-MX', {
    ...options,
    timeZone: isUtcMidnight(d) ? 'UTC' : undefined,
  });
}

export function formatDate(iso: string): string {
  return formatLocaleDate(iso, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatShortDate(iso: string): string {
  return formatLocaleDate(iso, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Hoy en calendario local, para `<input type="date">`. */
export function todayInputDate(): string {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export function toInputDate(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayInputDate();
  if (isUtcMidnight(d)) {
    return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Convierte YYYY-MM-DD a ISO usando mediodía local para no correr el día. */
export function localDateToIso(ymdStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymdStr);
  if (!match) {
    const d = new Date(ymdStr);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** Interpreta una fecha ISO/actividad como día de calendario local. */
export function parseActivityDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T12:00:00`);
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date();
  if (isUtcMidnight(d)) {
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0);
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
}

/** Lunes de la semana (semana laboral México). */
export function weekStartMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const day = d.getDay(); // 0 domingo … 6 sábado
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function formatWeekLabel(weekStart: Date): string {
  const day = weekStart.getDate();
  const month = weekStart.toLocaleDateString('es-MX', { month: 'long' });
  const year = weekStart.getFullYear();
  return `Semana del ${day} de ${month} de ${year}`;
}

export function weekKey(weekStart: Date): string {
  return ymd(weekStart.getFullYear(), weekStart.getMonth() + 1, weekStart.getDate());
}

export interface WeekGroup<T> {
  key: string;
  label: string;
  weekStart: Date;
  items: T[];
}

export function groupByWeek<T>(items: T[], getFecha: (item: T) => string): WeekGroup<T>[] {
  const map = new Map<string, WeekGroup<T>>();
  for (const item of items) {
    const start = weekStartMonday(parseActivityDate(getFecha(item)));
    const key = weekKey(start);
    let group = map.get(key);
    if (!group) {
      group = { key, label: formatWeekLabel(start), weekStart: start, items: [] };
      map.set(key, group);
    }
    group.items.push(item);
  }
  return Array.from(map.values()).sort(
    (a, b) => b.weekStart.getTime() - a.weekStart.getTime()
  );
}
