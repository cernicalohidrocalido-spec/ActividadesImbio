import { Button, Header } from '@heroui/react';
import { useAuth } from '../lib/auth';

export default function AppNavbar() {
  const { username, logout } = useAuth();
  return (
    <Header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-default-200 bg-content1">
      <div className="flex items-center gap-3">
        <img
          src="/logo-pabellon.png"
          alt="Pabellón de Arteaga"
          className="h-12 w-12 object-contain shrink-0"
        />
        <div className="flex flex-col leading-tight">
          <p className="font-bold text-base">IMBIO</p>
          <p className="text-xs text-default-500">
            Pabellón de Arteaga, Aguascalientes
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {username ? (
          <span className="text-xs text-default-500 hidden sm:inline">{username}</span>
        ) : null}
        <Button size="sm" variant="secondary" onPress={() => void logout()}>
          Salir
        </Button>
      </div>
    </Header>
  );
}
