import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from './tailwind-plugin.js';
export default defineConfig({
  plugins:[react(),tailwind()],
  server:{host:'127.0.0.1',port:5173,strictPort:true},
  build: {sourcemap:true},
  test: { include: ['src/tests/**/*.test.js'] },
});
