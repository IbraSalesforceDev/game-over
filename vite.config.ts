import { defineConfig, type Plugin } from 'vite';
import { ICONOS, pngIcono } from './herramientas/iconos';

/**
 * Los iconos de la aplicación instalada, generados al vuelo.
 *
 * Al compilar se escriben junto al resto de ficheros; en desarrollo se sirven
 * desde memoria, para que el manifiesto no apunte a nada que no existe. Ver
 * `herramientas/iconos.ts`.
 */
function iconos(): Plugin {
  return {
    name: 'game-over:iconos',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const nombre = req.url?.split('?')[0]?.replace(/^\//, '') ?? '';
        const lado = ICONOS[nombre];
        if (lado === undefined) return next();
        res.setHeader('Content-Type', 'image/png');
        res.end(pngIcono(lado));
      });
    },
    generateBundle() {
      for (const [nombre, lado] of Object.entries(ICONOS)) {
        this.emitFile({ type: 'asset', fileName: nombre, source: pngIcono(lado) });
      }
    },
  };
}

export default defineConfig({
  // Rutas relativas: el bundle funciona igual en la raíz del dominio que en
  // una URL de preview con subcarpeta.
  base: './',
  plugins: [iconos()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
