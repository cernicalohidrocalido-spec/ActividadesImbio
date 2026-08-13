import { useAuth } from '../lib/auth';

export default function AppNavbar() {
  const { username, logout } = useAuth();
  return (
    <header className="nav-imbio flex items-center justify-between px-4 sm:px-5 py-2.5 gap-3 flex-wrap">
      <div className="flex items-center gap-3.5 min-w-0">
        <img
          src="/logo-pabellon.png"
          alt="H. Ayuntamiento de Pabellón de Arteaga"
          className="logo-escudo"
        />
        <div className="flex flex-col leading-tight min-w-0">
          <p className="font-bold text-[1.05rem] truncate">
            Plataforma IMBIO-Pabellón
          </p>
          <p className="text-xs text-white/75 truncate">
            Manejo de Áreas Verdes
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {username ? (
          <span className="bg-[#1976D2] text-white text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full">
            {username}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => void logout()}
          className="border border-white/40 text-white text-sm rounded-md px-3 py-1 hover:bg-white/10"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
