/**
 * Genera el HTML completo de cada página después del build:
 * dist/index.html, dist/sobre-mce.html, …, dist/404.html, y dist/sitemap.xml.
 *
 * Así Google y las vistas previas (WhatsApp, redes) ven el contenido, el
 * título y la descripción de cada página sin esperar al JavaScript. En el
 * navegador la pantalla de carga tapa ese HTML hasta que la web arranca, y
 * React lo sustituye por la página interactiva.
 *
 * Lo ejecuta `npm run build` (no hace falta navegador: React genera el HTML).
 */
import { readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(raiz, 'dist');
const ssr = path.join(raiz, 'dist-ssr');

const { render, paginasSeo, tituloCompleto, escuela } = await import(pathToFileURL(path.join(ssr, 'entry-server.js')).href);

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const plantilla = await readFile(path.join(dist, 'index.html'), 'utf8');

function cambiar(html, patron, nuevo, que) {
  if (!patron.test(html)) throw new Error(`prerender: no se encuentra ${que} en index.html`);
  return html.replace(patron, nuevo);
}

for (const pagina of paginasSeo) {
  const titulo = esc(tituloCompleto(pagina.titulo));
  const descripcion = esc(pagina.descripcion);
  const url = escuela.web + (pagina.ruta === '/' ? '/' : pagina.ruta);
  const indexar = pagina.indexar !== false;

  let html = plantilla;
  html = cambiar(html, /<title>[^<]*<\/title>/, `<title>${titulo}</title>`, 'el título');
  html = cambiar(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/>/, `<meta name="description" content="${descripcion}" />`, 'la descripción');
  html = cambiar(html, /<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${titulo}" />`, 'og:title');
  html = cambiar(html, /<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${descripcion}" />`, 'og:description');

  const extra = indexar
    ? `    <link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />\n    <meta property="og:site_name" content="${esc(escuela.nombre)}" />\n`
    : `    <meta name="robots" content="noindex" />\n`;
  html = cambiar(html, /<\/head>/, `${extra}  </head>`, '</head>');

  html = cambiar(html, /<!--pagina-->/, render(pagina.ruta), 'la marca <!--pagina-->');

  await writeFile(path.join(dist, pagina.archivo), html);
  console.log(`prerender: ${pagina.archivo.padEnd(18)} ${pagina.ruta}`);
}

// Sitemap para Google: todas las páginas que se pueden indexar.
const urls = paginasSeo
  .filter((p) => p.indexar !== false)
  .map((p) => `  <url><loc>${escuela.web}${p.ruta === '/' ? '/' : p.ruta}</loc></url>`)
  .join('\n');
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
console.log('prerender: sitemap.xml');

await rm(ssr, { recursive: true, force: true });
