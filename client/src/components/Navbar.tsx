import { useAuth } from '../lib/auth';

type ViewMode = 'cards' | 'map';

interface Props {
  publicMode?: boolean;
  view?: ViewMode;
  onViewChange?: (v: ViewMode) => void;
}

export default function AppNavbar({ publicMode = false, view, onViewChange }: Props) {
  const { username, logout } = useAuth();

  if (publicMode) {
    return (
      <header className="nav-imbio nav-public-fixed flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <img
            src="/logo-pabellon.png"
            alt="H. Ayuntamiento de Pabellón de Arteaga"
            className="h-10 w-10 sm:h-11 sm:w-11 object-contain bg-white rounded-lg p-0.5 shrink-0"
          />
          <div className="min-w-0 leading-tight">
            <p className="font-bold text-sm sm:text-[0.95rem] truncate">
              Plataforma IMBIO-Pabellón
            </p>
            <p className="text-[11px] text-white/75 truncate">Consulta pública · Áreas verdes</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onViewChange?.('cards')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold ${
              view === 'cards' ? 'bg-white text-[#002A5C]' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            🌿 <span className="hidden xs:inline sm:inline">Actividades</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange?.('map')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold ${
              view === 'map' ? 'bg-white text-[#002A5C]' : 'text-white/90 hover:bg-white/10'
            }`}
          >
            🗺️ <span className="hidden xs:inline sm:inline">Mapa</span>
          </button>
        </nav>

        <a
          href="/login"
          className="shrink-0 border border-white/40 text-white text-xs sm:text-sm rounded-md px-2.5 py-1 hover:bg-white/10"
        >
          Acceso personal
        </a>
      </header>
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
