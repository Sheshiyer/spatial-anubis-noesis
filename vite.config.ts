import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/physics': path.resolve(__dirname, './src/physics'),
      '@/rendering': path.resolve(__dirname, './src/rendering'),
      '@/state': path.resolve(__dirname, './src/state'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
  },
});
