import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'map';
            }
            if (
              id.includes('@heroui') ||
              id.includes('react-aria-components') ||
              id.includes('framer-motion')
            ) {
              return 'ui';
            }
            if (id.includes('react') && id.includes('node_modules/react/')) {
              return 'react-vendor';
            }
          }
          return undefined;
        },
      },
    },
  },
});
