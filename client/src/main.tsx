import { createRoot } from 'react-dom/client';
import { Toast } from '@heroui/react';
import App from './App';
import { toastQueue } from './lib/toast';
import { TiposProvider } from './lib/tipos';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <>
    <Toast.Provider queue={toastQueue} />
    <TiposProvider>
      <App />
    </TiposProvider>
  </>
);
