/**
 * Registra el service worker que deja jugar sin conexión (ver `public/sw.js`).
 *
 * Solo en la versión publicada. En desarrollo un service worker se interpone
 * entre el navegador y Vite y sirve copias de ficheros que acaban de cambiar,
 * que es justo lo contrario de lo que se quiere mientras se programa.
 *
 * Se registra después de cargar la página para no competir con el arranque, y
 * un fallo no se enseña a nadie: sin service worker el juego funciona igual,
 * solo que necesita conexión para abrirse.
 */
export function hacerInstalable(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* sin copia sin conexión, pero jugable */
    });
  });
}
