import { createRoot } from 'react-dom/client';
import { Spinner, Toast } from '@heroui/react';
import App from './App';
import PublicApp from './PublicApp';
import LoginPage from './components/LoginPage';
import { toastQueue } from './lib/toast';
import { AuthProvider, useAuth } from './lib/auth';
import { TiposProvider } from './lib/tipos';
import { isLoginPath, isPublicPanelPath } from './lib/public-path';
import './index.css';

function PublicPanel() {
  return (
    <TiposProvider publicOnly>
      <PublicApp />
    </TiposProvider>
  );
}

function Gate() {
  const { username, ready } = useAuth();
  if (isPublicPanelPath()) {
    return <PublicPanel />;
  }
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#002A5C]">
        <Spinner size="lg" />
      </div>
    );
  }
  if (username) {
    return (
      <TiposProvider>
        <App />
      </TiposProvider>
    );
  }
  if (isLoginPath()) return <LoginPage />;
  return <PublicPanel />;
}

createRoot(document.getElementById('root')!).render(
  <>
    <Toast.Provider queue={toastQueue} />
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </>
);
