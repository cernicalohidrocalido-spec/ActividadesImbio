import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="text-center mb-6">
          <img
            src="/logo-pabellon.png"
            alt="H. Ayuntamiento de Pabellón de Arteaga"
            className="h-24 w-24 object-contain mx-auto mb-3 bg-white rounded-2xl p-2 shadow-sm"
          />
          <h1 className="text-[1.25rem] font-bold text-[#002A5C] leading-snug">
            Manejo de Áreas Verdes — IMBIO Pabellón de Arteaga
          </h1>
          <p className="text-sm text-[#4b5563] mt-2">
            Instituto Municipal de Biodiversidad y Protección Ambiental de
            Pabellón de Arteaga
          </p>
        </div>

        <div className="login-hint mb-5">
          ✓ Conectado. Introduce usuario y contraseña e inicia sesión.
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold text-[#1a202c] mb-1.5">
              Usuario
            </span>
            <input
              className="input-imbio"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-[#1a202c] mb-1.5">
              Contraseña
            </span>
            <input
              className="input-imbio"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error ? (
            <p className="text-sm text-[#991b1b] bg-[#fee2e2] border border-[#fca5a5] rounded-lg px-3 py-2">
              {error}
            </p>
          ) : null}

          <button type="submit" className="btn-login" disabled={busy}>
            <span className="lock" aria-hidden>
              🔐
            </span>
            {busy ? 'Entrando…' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="text-center text-sm text-[#4b5563] mt-5">
          Acceso solo para personal IMBIO.{' '}
          <a href="/consulta" className="font-semibold text-[#003B7A] hover:underline">
            Volver a la consulta pública
          </a>
        </p>
      </div>
    </div>
  );
}
