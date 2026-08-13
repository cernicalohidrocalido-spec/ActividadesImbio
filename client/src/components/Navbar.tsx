import { useAuth } from '../lib/auth';
import { useTipos } from '../lib/tipos';
import type { ListFilters } from '../lib/types';

type ViewMode = 'cards' | 'map';

interface Props {
  publicMode?: boolean;
  view?: ViewMode;
  onViewChange?: (v: ViewMode) => void;
  filters?: ListFilters;
  onFiltersChange?: (f: ListFilters) => void;
}

const TODOS = 'TODOS';

export default function AppNavbar({
  publicMode = false,
  view,
  onViewChange,
  filters,
  onFiltersChange,
}: Props) {
  const { username, logout } = useAuth();

  if (publicMode) {
    return (
      <PublicHeader
        view={view}
        onViewChange={onViewChange}
        filters={filters ?? {}}
        onFiltersChange={onFiltersChange ?? (() => undefined)}
      />
    );
  }

  return (
    <header className="nav-imbio flex items-center justify-between px-4 sm:px-5 h-12 gap-3">
      <div className="min-w-0 leading-tight">
        <p className="font-bold text-sm sm:text-[0.95rem] truncate">
          Plataforma IMBIO-Pabellón
        </p>
        <p className="text-[11px] text-white/75 truncate">Manejo de Áreas Verdes</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <a
          href="/consulta"
          className="border border-white/40 text-white text-xs sm:text-sm rounded-md px-2.5 py-1 hover:bg-white/10"
        >
          Ver consulta pública
        </a>
        {username ? (
          <span className="bg-[#1976D2] text-white text-[11px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full">
            {username}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => void logout()}
          className="border border-white/40 text-white text-xs sm:text-sm rounded-md px-2.5 py-1 hover:bg-white/10"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

function PublicHeader({
  view,
  onViewChange,
  filters,
  onFiltersChange,
}: {
  view?: ViewMode;
  onViewChange?: (v: ViewMode) => void;
  filters: ListFilters;
  onFiltersChange: (f: ListFilters) => void;
}) {
  const { tipos } = useTipos();
  const tiposActivos = tipos.filter((t) => t.activo);
  const year = new Date().getFullYear();
  const meses = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return {
      value: `${year}-${m}`,
      label: new Date(year, i, 1).toLocaleDateString('es-MX', { month: 'long' }),
    };
  });

  const set = (patch: Partial<ListFilters>) => onFiltersChange({ ...filters, ...patch });

  return (
    <header className="nav-imbio nav-public-fixed px-3 sm:px-5">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <img
            src="/logo-pabellon.png"
            alt="H. Ayuntamiento de Pabellón de Arteaga"
            className="h-10 w-10 sm:h-11 sm:w-11 object-contain bg-white rounded-lg p-0.5 shrink-0"
          />
          <div className="min-w-0 leading-tight">
            <p className="font-bold text-[13px] sm:text-[0.95rem] leading-snug">
              Bitácora Ambiental de Actividades del IMBIO
            </p>
            <p className="text-[11px] text-white/80 truncate">Actividades de áreas verdes</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onViewChange?.('cards')}
            className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold ${
              view === 'cards' ? 'bg-white text-[#002A5C]' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            🌿{' '}
            <span className="hidden sm:inline">Actividades de áreas verdes</span>
            <span className="sm:hidden">Áreas verdes</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange?.('map')}
            className={`px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold ${
              view === 'map' ? 'bg-white text-[#002A5C]' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            🗺️ <span className="hidden sm:inline">Mapa</span>
          </button>
        </nav>

        <a
          href="/login"
          className="shrink-0 border border-white/40 text-white text-xs sm:text-sm rounded-md px-2.5 py-1 hover:bg-white/10"
        >
          Acceso personal
        </a>
      </div>

      <div className="nav-public-filters flex flex-wrap items-center gap-2 mt-2.5">
        <input
          type="search"
          placeholder="Buscar por nombre..."
          aria-label="Buscar actividad por nombre"
          value={filters.q ?? ''}
          onChange={(e) => set({ q: e.target.value.trim() ? e.target.value : undefined })}
          className="h-8 min-w-[160px] flex-1 rounded-md px-2.5 text-xs sm:text-sm text-[#002A5C] bg-white placeholder:text-[#6b7280] outline-none focus:ring-2 focus:ring-white/70"
        />
        <select
          aria-label="Filtrar por mes"
          value={filters.mes ?? TODOS}
          onChange={(e) => set({ mes: e.target.value === TODOS ? undefined : e.target.value })}
          className="h-8 min-w-[140px] rounded-md px-2 text-xs sm:text-sm text-[#002A5C] bg-white outline-none focus:ring-2 focus:ring-white/70 capitalize"
        >
          <option value={TODOS}>Todos los meses</option>
          {meses.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filtrar por tipo"
          value={filters.tipo?.[0] ?? TODOS}
          onChange={(e) =>
            set({ tipo: e.target.value === TODOS ? undefined : [e.target.value] })
          }
          className="h-8 min-w-[160px] rounded-md px-2 text-xs sm:text-sm text-[#002A5C] bg-white outline-none focus:ring-2 focus:ring-white/70"
        >
          <option value={TODOS}>Todos los tipos</option>
          {tiposActivos.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
