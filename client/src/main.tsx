import { createRoot } from 'react-dom/client';
import { Spinner, Toast } from '@heroui/react';
import App from './App';
import PublicApp from './PublicApp';
import LoginPage from './components/LoginPage';
import { toastQueue } from './lib/toast';
import { AuthProvider, useAuth } from './lib/auth';
import { TiposProvider } from './lib/tipos';
import { isPublicPanelPath } from './lib/public-path';
import './index.css';

function Gate() {
  const { username, ready } = useAuth();
  if (isPublicPanelPath()) {
    return (
      <TiposProvider publicOnly>
        <PublicApp />
      </TiposProvider>
    );
  }
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#002A5C]">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!username) return <LoginPage />;
  return (
    <TiposProvider>
      <App />
    </TiposProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <>
    <Toast.Provider queue={toastQueue} />
    <AuthProvider>
      <Gate />
    </AuthProvider>
  </>
);
