import { AIRE, HIERBA, MADERA, PIEDRA, PLATAFORMA, TIERRA } from './tiles';
import { Mundo } from './world';

/**
 * Nivel de pruebas hecho a mano.
 *
 * No es un mundo generado (eso es la fase 3): es un banco de pruebas donde cada
 * tramo existe para verificar una regla concreta de la física. Si al tocar las
 * constantes algo se rompe, se nota recorriéndolo de izquierda a derecha.
 */

export const ANCHO_NIVEL = 300;
export const ALTO_NIVEL = 110;
/** Fila del suelo base. */
export const SUELO = 64;

export interface Zona {
  tx: number;
  etiqueta: string;
}

export interface NivelPruebas {
  mundo: Mundo;
  spawnTx: number;
  spawnTy: number;
  zonas: Zona[];
}

export function crearNivelPruebas(): NivelPruebas {
  const m = new Mundo(ANCHO_NIVEL, ALTO_NIVEL);
  const zonas: Zona[] = [];

  // Suelo continuo: hierba arriba, tierra debajo y roca en profundidad.
  m.rellenar(0, SUELO, ANCHO_NIVEL - 1, SUELO, HIERBA);
  m.rellenar(0, SUELO + 1, ANCHO_NIVEL - 1, SUELO + 6, TIERRA);
  m.rellenar(0, SUELO + 7, ANCHO_NIVEL - 1, ALTO_NIVEL - 1, PIEDRA);
  // Muros laterales para no salirse del nivel.
  m.rellenar(0, 0, 1, ALTO_NIVEL - 1, PIEDRA);
  m.rellenar(ANCHO_NIVEL - 2, 0, ANCHO_NIVEL - 1, ALTO_NIVEL - 1, PIEDRA);

  // 1 · Recta larga: medir aceleración, velocidad punta y frenada.
  zonas.push({ tx: 8, etiqueta: '1 · carrera y frenada' });

  // 2 · Escalones de 1, 2 y 3 tiles. Solo el de 1 debe subirse solo; los otros
  //     obligan a saltar. Al final, una rampa de peldaños para bajar.
  zonas.push({ tx: 46, etiqueta: '2 · escalones 1/2/3' });
  m.rellenar(48, SUELO - 1, 50, SUELO - 1, TIERRA);
  m.rellenar(54, SUELO - 2, 56, SUELO - 1, TIERRA);
  m.rellenar(60, SUELO - 3, 62, SUELO - 1, TIERRA);
  m.rellenar(63, SUELO - 2, 63, SUELO - 1, TIERRA);
  m.setTile(64, SUELO - 1, TIERRA);

  // 3 · Techo bajo: golpearse la cabeza corta el salto en seco.
  zonas.push({ tx: 72, etiqueta: '3 · techo bajo' });
  m.rellenar(72, SUELO - 4, 88, SUELO - 4, MADERA);

  // 4 · Pozo de 24 tiles: se alcanza la velocidad terminal antes de tocar
  //     fondo. Se sale por una escalinata de peldaños de 1 tile.
  zonas.push({ tx: 94, etiqueta: '4 · pozo y velocidad terminal' });
  m.rellenar(94, SUELO, 120, SUELO + 24, AIRE);
  for (let i = 0; i < 24; i++) {
    const tx = 96 + i;
    m.rellenar(tx, SUELO + 24 - i, tx, SUELO + 24, PIEDRA);
  }

  // 5 · Huecos de 1 y 2 tiles de ancho: encajarse sin quedarse atascado.
  zonas.push({ tx: 126, etiqueta: '5 · huecos 1/2' });
  m.rellenar(130, SUELO, 130, SUELO + 4, AIRE);
  m.rellenar(138, SUELO, 139, SUELO + 4, AIRE);

  // 6 · Plataformas de una dirección: se suben desde abajo y se atraviesan
  //     hacia abajo con abajo + salto.
  zonas.push({ tx: 152, etiqueta: '6 · plataformas' });
  m.rellenar(152, SUELO - 4, 160, SUELO - 4, PLATAFORMA);
  m.rellenar(164, SUELO - 8, 172, SUELO - 8, PLATAFORMA);
  m.rellenar(156, SUELO - 12, 168, SUELO - 12, PLATAFORMA);

  // 7 · Pasillo de exactamente 3 tiles de alto: comprueba el hitbox de 42 px.
  zonas.push({ tx: 182, etiqueta: '7 · pasillo de 3' });
  m.rellenar(182, SUELO - 10, 202, SUELO - 4, PIEDRA);
  m.rellenar(182, SUELO - 3, 202, SUELO - 1, AIRE);

  // 8 · Muro alto: no se debe poder trepar a base de empujar.
  zonas.push({ tx: 208, etiqueta: '8 · muro' });
  m.rellenar(208, SUELO - 10, 209, SUELO - 1, PIEDRA);

  // 9 · Escalinata de peldaños de 1 tile: subida continua sin saltar ni una vez.
  zonas.push({ tx: 220, etiqueta: '9 · escalinata' });
  for (let i = 0; i < 14; i++) {
    m.rellenar(220 + i * 2, SUELO - 1 - i, 221 + i * 2, SUELO + 5, TIERRA);
  }

  // 10 · Dos repisas separadas: medir el alcance real del salto.
  zonas.push({ tx: 258, etiqueta: '10 · salto largo' });
  m.rellenar(258, SUELO - 15, 268, SUELO - 15, MADERA);
  m.rellenar(274, SUELO - 15, 284, SUELO - 15, MADERA);

  return { mundo: m, spawnTx: 8, spawnTy: SUELO - 4, zonas };
}
