#!/usr/bin/env node
/**
 * Optimiza las fotos que se dejan en `public/images/`.
 *
 * Para cada .jpg/.jpeg/.png/.webp (excepto el logo, que se sirve tal cual)
 * genera versiones AVIF y WebP en varios anchos dentro de `public/images/_opt/`
 * y escribe `src/data/fotos.generated.json`, que el componente <Foto> usa para
 * montar el `srcset`.
 *
 * Nunca amplía una foto: si el original es más pequeño que un ancho, ese ancho
 * no se genera. Si una foto es demasiado pequeña para el sitio donde va, lo
 * avisa por consola para pedir el original (no se escala artificialmente).
 *
 * Se ejecuta solo antes de `npm run dev` y `npm run build`. Si no cambia
 * ninguna foto, no recalcula nada.
 */
import { readdir, stat, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dirImagenes = path.join(raiz, 'public', 'images');
const dirSalida = path.join(dirImagenes, '_opt');
const manifiesto = path.join(raiz, 'src', 'data', 'fotos.generated.json');

const ANCHOS = [480, 800, 1200, 1800];
const EXTENSIONES = new Set(['.jpg', '.jpeg', '.png', '.webp']);

/** Ancho mínimo recomendado según la carpeta (retratos vs. fotos grandes). */
const MINIMOS = { betty: 1000, equipo: 700, facilitadores: 400 };

async function recorrer(dir) {
  if (!existsSync(dir)) return [];
  const entradas = await readdir(dir, { withFileTypes: true });
  const archivos = [];
  for (const e of entradas) {
    const ruta = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === '_opt') continue;
      archivos.push(...(await recorrer(ruta)));
    } else if (EXTENSIONES.has(path.extname(e.name).toLowerCase())) {
      if (/^logo\./i.test(e.name)) continue; // el logo no se toca
      archivos.push(ruta);
    }
  }
  return archivos;
}

async function main() {
  const archivos = await recorrer(dirImagenes);

  let anterior = {};
  try {
    anterior = JSON.parse(await readFile(manifiesto, 'utf8'));
  } catch {
    /* primera vez */
  }

  if (archivos.length === 0) {
    await writeFile(manifiesto, '{}\n');
    console.log('[fotos] No hay fotos en public/images todavía.');
    return;
  }

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('[fotos] No se pudo cargar "sharp"; las fotos se servirán sin optimizar.');
    await writeFile(manifiesto, '{}\n');
    return;
  }

  const resultado = {};
  const avisos = [];

  for (const archivo of archivos) {
    const relativo = path.relative(path.join(raiz, 'public'), archivo).split(path.sep).join('/');
    const clave = '/' + relativo;
    const { mtimeMs } = await stat(archivo);
    const previo = anterior[clave];

    const carpeta = relativo.split('/')[1] ?? '';
    const minimo = MINIMOS[carpeta];

    if (previo && previo.mtime === Math.round(mtimeMs) && existsSync(path.join(raiz, 'public', previo.avif[0]?.[0] ?? '_'))) {
      resultado[clave] = previo;
      if (minimo && previo.ancho < minimo) avisos.push([relativo, previo.ancho, minimo]);
      continue;
    }

    const meta = await sharp(archivo).metadata();
    const ancho = meta.width ?? 0;
    const alto = meta.height ?? 0;
    const base = relativo.replace(/^images\//, '').replace(/\.[^.]+$/, '');
    const anchos = ANCHOS.filter((a) => a <= ancho);
    if (anchos.length === 0 || anchos[anchos.length - 1] !== ancho) anchos.push(ancho);

    const entrada = { ancho, alto, mtime: Math.round(mtimeMs), avif: [], webp: [] };
    for (const a of anchos) {
      for (const formato of ['avif', 'webp']) {
        const destinoRel = `images/_opt/${base}-${a}.${formato}`;
        const destino = path.join(raiz, 'public', destinoRel);
        await mkdir(path.dirname(destino), { recursive: true });
        await sharp(archivo)
          .rotate()
          .resize({ width: a, withoutEnlargement: true })
          [formato]({ quality: formato === 'avif' ? 55 : 78 })
          .toFile(destino);
        entrada[formato].push(['/' + destinoRel, a]);
      }
    }
    resultado[clave] = entrada;
    if (minimo && ancho < minimo) avisos.push([relativo, ancho, minimo]);
    console.log(`[fotos] ${relativo} (${ancho}×${alto}) → ${anchos.join(', ')} px`);
  }

  await writeFile(manifiesto, JSON.stringify(resultado, null, 2) + '\n');

  for (const [rel, ancho, minimo] of avisos) {
    console.warn(
      `\n⚠  [fotos] ${rel} mide solo ${ancho}px de ancho (recomendado: ${minimo}px o más).\n` +
        '   Se mostrará en un marco más pequeño, sin ampliarla. Mejor pedir el archivo original.',
    );
  }
}

main().catch((error) => {
  console.error('[fotos] Error:', error);
  process.exitCode = 1;
});
