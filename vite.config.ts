import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el bundle funciona igual en la raíz del dominio que en
  // una URL de preview con subcarpeta.
  base: './',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
