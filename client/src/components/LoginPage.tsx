import { useState, type FormEvent } from 'react';
import { Button, Card, CardContent, Input, Label, TextField } from '@heroui/react';
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-emerald-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-8 space-y-6">
          <div className="flex flex-col items-center text-center gap-3">
            <img
              src="/logo-pabellon.png"
              alt="Pabellón de Arteaga"
              className="h-16 w-16 object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-emerald-800">IMBIO</h1>
              <p className="text-sm text-default-500">
                Registro de actividades · personal autorizado
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <TextField>
              <Label>Usuario</Label>
              <Input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername((e.target as HTMLInputElement).value)}
                required
              />
            </TextField>
            <TextField>
              <Label>Contraseña</Label>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                required
              />
            </TextField>

            {error ? (
              <p className="text-sm text-danger-600 bg-danger-50 rounded-md px-3 py-2">{error}</p>
            ) : null}

            <Button type="submit" variant="primary" className="w-full" isPending={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
