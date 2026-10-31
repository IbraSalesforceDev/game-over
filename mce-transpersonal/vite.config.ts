import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Modo normal: la web para desplegar (dist/).
 * Modo "archivo" (`npm run build:archivo`): un único index.html con todo dentro
 * (código, estilos y tipografías) para enviarlo y abrirlo sin servidor.
 * Usa rutas con # (index.html#/sedes) porque un archivo suelto no tiene servidor.
 */
export default defineConfig(({ mode }) => {
  const archivo = mode === 'archivo';
  return {
    plugins: [react(), tailwindcss(), ...(archivo ? [viteSingleFile()] : [])],
    base: archivo ? './' : '/',
    publicDir: archivo ? false : 'public',
    build: {
      target: 'es2022',
      outDir: archivo ? 'dist-archivo' : 'dist',
      ...(archivo ? { assetsInlineLimit: 100_000_000, cssCodeSplit: false } : {}),
    },
  };
});
