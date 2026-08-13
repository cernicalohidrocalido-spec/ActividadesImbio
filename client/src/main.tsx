import { createRoot } from 'react-dom/client';
import { Spinner, Toast } from '@heroui/react';
import App from './App';
import LoginPage from './components/LoginPage';
import { toastQueue } from './lib/toast';
import { AuthProvider, useAuth } from './lib/auth';
import { TiposProvider } from './lib/tipos';
import './index.css';

function Gate() {
  const { username, ready } = useAuth();
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner color="success" size="lg" />
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
