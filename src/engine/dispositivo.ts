/**
 * ¿Se juega con el dedo o con teclado y ratón?
 *
 * La interfaz cambia entera según la respuesta —joystick y botones en pantalla,
 * o atajos de teclado y clic derecho—, así que se decide en un solo sitio y el
 * resto del juego solo mira la clase `tactil` del `<html>`.
 *
 * ## Por qué no se mira el navegador
 *
 * Preguntar «¿es un iPhone?» por el `userAgent` falla justo donde más duele: un
 * iPad dice ser un Mac desde iPadOS 13, y un portátil con pantalla táctil no
 * tiene nada de móvil aunque se pueda tocar. Lo que importa no es qué aparato
 * es, sino **con qué se apunta sobre todo**, y eso el navegador lo dice
 * directamente con dos consultas de medios:
 *
 * - `(pointer: coarse)` — el puntero principal es poco preciso: un dedo.
 * - `(hover: none)` — no hay forma de estar encima de algo sin tocarlo.
 *
 * Hacen falta las dos. Un portátil táctil tiene ratón como puntero principal y
 * sigue siendo escritorio; un móvil o una tableta cumplen las dos.
 *
 * ## Y por qué hay ajuste manual
 *
 * Porque la detección puede equivocarse —una tableta con teclado y ratón, un
 * navegador raro— y entonces no puede ser una condena. En los ajustes se puede
 * forzar uno u otro. Además, los dos modos aceptan las dos cosas: en modo
 * táctil el teclado sigue funcionando, y en escritorio tocar la pantalla sigue
 * siendo un clic. Lo que cambia es lo que se enseña.
 */

export type ModoControl = 'tactil' | 'escritorio';

/** Lo que elige quien juega en los ajustes. */
export type PreferenciaControl = 'auto' | 'tactil' | 'escritorio';

export const PREFERENCIAS_CONTROL: readonly { valor: PreferenciaControl; nombre: string }[] = [
  { valor: 'auto', nombre: 'automático' },
  { valor: 'tactil', nombre: 'táctiles' },
  { valor: 'escritorio', nombre: 'teclado y ratón' },
];

/** Lo que se le pregunta al navegador, separado para poder probar la regla. */
export interface Sonda {
  /** `(pointer: coarse)`: el puntero principal es un dedo. */
  punteroGrueso: boolean;
  /** `(hover: none)`: no se puede estar encima de algo sin tocarlo. */
  sinEncima: boolean;
}

/** La regla, sin navegador de por medio. */
export function decidirModo(s: Sonda, preferencia: PreferenciaControl): ModoControl {
  if (preferencia !== 'auto') return preferencia;
  return s.punteroGrueso && s.sinEncima ? 'tactil' : 'escritorio';
}

const CONSULTAS = ['(pointer: coarse)', '(hover: none)'] as const;

/** Pregunta al navegador. Sin `matchMedia` —no debería pasar— es escritorio. */
export function sondear(): Sonda {
  if (typeof matchMedia !== 'function') return { punteroGrueso: false, sinEncima: false };
  return {
    punteroGrueso: matchMedia(CONSULTAS[0]).matches,
    sinEncima: matchMedia(CONSULTAS[1]).matches,
  };
}

/**
 * Pone la clase en el `<html>` y la mantiene al día.
 *
 * Se vuelve a mirar si cambian las consultas, que pasa de verdad: conectar un
 * ratón a una tableta, o abrir las herramientas de desarrollo en modo móvil.
 * Devuelve el modo de ahora y una función para cambiar la preferencia en
 * caliente, que es lo que usa el panel de ajustes.
 */
export function vigilarModo(
  preferenciaInicial: PreferenciaControl,
  alCambiar: (modo: ModoControl) => void = () => {},
): { readonly modo: ModoControl; preferir(p: PreferenciaControl): void } {
  let preferencia = preferenciaInicial;
  let modo = decidirModo(sondear(), preferencia);

  const aplicar = (): void => {
    const nuevo = decidirModo(sondear(), preferencia);
    document.documentElement.classList.toggle('tactil', nuevo === 'tactil');
    if (nuevo === modo) return;
    modo = nuevo;
    alCambiar(modo);
  };

  document.documentElement.classList.toggle('tactil', modo === 'tactil');
  if (typeof matchMedia === 'function') {
    for (const c of CONSULTAS) matchMedia(c).addEventListener('change', aplicar);
  }

  return {
    get modo() {
      return modo;
    },
    preferir(p) {
      preferencia = p;
      aplicar();
    },
  };
}
