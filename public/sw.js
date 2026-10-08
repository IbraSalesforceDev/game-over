/**
 * El service worker: lo que deja jugar sin conexión.
 *
 * Instalado en la pantalla de inicio, el juego tiene que abrirse aunque el móvil
 * no tenga cobertura: los mundos locales están en el propio móvil y no necesitan
 * a nadie. Para eso basta con guardar una copia de lo que se ha descargado.
 *
 * Dos reglas, y ninguna más:
 *
 * - **La página, primero de la red.** Si hay conexión se baja la última, y así
 *   una versión nueva llega al momento, como si no hubiera service worker. Solo
 *   sin conexión se usa la copia.
 * - **Lo demás, primero de la copia.** El código y los iconos llevan una huella
 *   en el nombre (`index-UIS1IJam.js`): si cambian, cambia el nombre, así que
 *   una copia nunca se queda vieja.
 *
 * Lo de otros dominios —Supabase, la nube, la sala del multijugador— no se toca:
 * eso no tiene sentido guardarlo, y cachearlo por error rompería la partida
 * compartida de formas muy difíciles de ver.
 *
 * Va fuera del código del juego, en `public/`, porque el navegador lo carga por
 * su cuenta y con su nombre exacto: no puede llevar huella.
 */

const CACHE = 'game-over-v1';

/**
 * Cuántos ficheros se guardan como mucho.
 *
 * Cada versión del juego trae su código con un nombre nuevo, y las viejas no se
 * borran solas: sin tope, la copia crecería con cada actualización. Con sesenta
 * caben varias versiones enteras de sobra.
 */
const TOPE = 60;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const nombre of await caches.keys()) {
        if (nombre !== CACHE) await caches.delete(nombre);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (e) => {
  const peticion = e.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;

  if (peticion.mode === 'navigate') {
    e.respondWith(primeroLaRed(peticion));
  } else {
    e.respondWith(primeroLaCopia(peticion));
  }
});

async function primeroLaRed(peticion) {
  const cache = await caches.open(CACHE);
  try {
    const respuesta = await fetch(peticion);
    if (respuesta.ok) await guardar(cache, peticion, respuesta.clone());
    return respuesta;
  } catch {
    const copia = (await cache.match(peticion)) ?? (await cache.match('./'));
    if (copia) return copia;
    throw new Error('Sin conexión y sin copia');
  }
}

async function primeroLaCopia(peticion) {
  const cache = await caches.open(CACHE);
  const copia = await cache.match(peticion);
  if (copia) return copia;
  const respuesta = await fetch(peticion);
  if (respuesta.ok && respuesta.type === 'basic') await guardar(cache, peticion, respuesta.clone());
  return respuesta;
}

async function guardar(cache, peticion, respuesta) {
  await cache.put(peticion, respuesta);
  const claves = await cache.keys();
  // Las claves salen en el orden en que se guardaron: se van las más viejas.
  for (const vieja of claves.slice(0, Math.max(0, claves.length - TOPE))) {
    await cache.delete(vieja);
  }
}
