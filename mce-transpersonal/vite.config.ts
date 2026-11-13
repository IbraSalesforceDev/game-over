import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { comunidades, sedesDe } from './src/data/sedes';
import { mision } from './src/data/mision';

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Versión básica en HTML puro dentro de la pantalla de arranque: si el
 * navegador no llega a ejecutar la web, al menos se ve el propósito de MCE y
 * cómo contactar con cada sede. Se genera desde src/data (nada a mano).
 */
function versionBasica(): Plugin {
  const grupos = comunidades
    .map((c) => {
      const items = sedesDe(c.id)
        .map((s) => {
          const tels = s.telefonos.map((t) => `<a href="tel:+34${t.replace(/\s/g, '')}">${esc(t)}</a>`).join(' · ');
          const ig = s.instagram ? ` · <a href="${esc(s.instagram)}">Instagram</a>` : '';
          return `<li><strong>${esc(s.nombre)}</strong><br>${tels}${ig}</li>`;
        })
        .join('');
      return `<h3>${esc(c.nombre)}</h3><ul>${items}</ul>`;
    })
    .join('');
  const html =
    `<h2>${esc(mision.lema)}</h2><p>${esc(mision.entradilla)}</p>` +
    `<h2>Habla con tu sede</h2>${grupos}`;
  return {
    name: 'mce-version-basica',
    transformIndexHtml: (entrada) => entrada.replace('<!--version-basica-->', html),
  };
}

/**
 * Modo normal: la web para desplegar (dist/).
 * Modo "archivo" (`npm run build:archivo`): un único index.html con todo dentro
 * (código, estilos y tipografías) para enviarlo y abrirlo sin servidor.
 * Usa rutas con # (index.html#/sedes) porque un archivo suelto no tiene servidor.
 */
export default defineConfig(({ mode, isSsrBuild }) => {
  const archivo = mode === 'archivo';
  return {
    plugins: [react(), tailwindcss(), versionBasica(), ...(archivo ? [viteSingleFile()] : [])],
    base: archivo ? './' : '/',
    // El build de servidor (para generar el HTML de cada página) no necesita public/.
    publicDir: archivo || isSsrBuild ? false : 'public',
    build: {
      // La web se abre en móviles muy variados: código compatible también con
      // navegadores algo más antiguos (iOS 13+, Android con Chrome 80+).
      target: ['es2019', 'chrome80', 'safari13', 'firefox78'],
      outDir: archivo ? 'dist-archivo' : 'dist',
      ...(archivo ? { assetsInlineLimit: 100_000_000, cssCodeSplit: false } : {}),
    },
  };
});
