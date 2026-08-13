import { useAuth } from '../lib/auth';

export default function AppNavbar() {
  const { username, logout } = useAuth();
  return (
    <header className="nav-imbio flex items-center justify-between px-4 sm:px-5 h-12 gap-3">
      <div className="min-w-0 leading-tight">
        <p className="font-bold text-sm sm:text-[0.95rem] truncate">
          Plataforma IMBIO-Pabellón
        </p>
        <p className="text-[11px] text-white/75 truncate">Manejo de Áreas Verdes</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
