import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// AirSight frontend build config.
// - Dev: proxy '/api' to the FastAPI backend on localhost:8000.
// - Prod: emit static assets into 'dist', which FastAPI serves at '/'.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Split heavy libraries into their own cacheable chunks so no single
        // JS chunk dominates the bundle.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          leaflet: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
});
