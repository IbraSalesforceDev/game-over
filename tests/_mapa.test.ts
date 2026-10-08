import { describe, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { generarMundo } from '../src/world/gen/worldgen';
import { TILES } from '../src/world/tiles';
import { png } from '../herramientas/png';

/**
 * Utilidad de inspección, no una comprobación: vuelca el mundo entero a un PNG
 * para poder mirar de un vistazo el relieve, las cuevas y las vetas. Se ejecuta
 * a mano con `npx vitest run tests/_mapa.test.ts`.
 */

describe('mapa del mundo', () => {
  it('vuelca un PNG del mundo generado', () => {
    const salida = process.env.MAPA_SALIDA;
    if (!salida) return;

    const { mundo, spawnTx, spawnTy } = generarMundo({
      ancho: 1400,
      alto: 450,
      semilla: process.env.MAPA_SEMILLA ?? 'GAMEOVER',
    });

    const colores = TILES.map((t) => {
      const n = parseInt(t.color.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
    });

    const rgb = new Uint8Array(mundo.ancho * mundo.alto * 3);
    for (let ty = 0; ty < mundo.alto; ty++) {
      for (let tx = 0; tx < mundo.ancho; tx++) {
        const i = (ty * mundo.ancho + tx) * 3;
        const id = mundo.getTile(tx, ty);
        const liquido = mundo.getLiquido(tx, ty);
        if (liquido > 0) {
          // El líquido manda sobre el tile: lo que interesa mirar en el mapa es
          // dónde han quedado los lagos y las coladas.
          const c = mundo.esLava(tx, ty) ? [216, 74, 27] : [47, 111, 181];
          rgb[i] = c[0]!;
          rgb[i + 1] = c[1]!;
          rgb[i + 2] = c[2]!;
        } else if (id === 0) {
          // Aire: azul cielo si no hay pared, gris muy oscuro si la hay (cueva).
          const pared = mundo.getPared(tx, ty);
          const c = pared === 0 ? [110, 165, 215] : [24, 22, 20];
          rgb[i] = c[0]!;
          rgb[i + 1] = c[1]!;
          rgb[i + 2] = c[2]!;
        } else {
          const c = colores[id] ?? ([255, 0, 255] as const);
          rgb[i] = c[0];
          rgb[i + 1] = c[1];
          rgb[i + 2] = c[2];
        }
      }
    }

    // Cruz roja en el punto de aparición.
    for (let d = -6; d <= 6; d++) {
      for (const [x, y] of [
        [spawnTx + d, spawnTy],
        [spawnTx, spawnTy + d],
      ]) {
        if (x! < 0 || y! < 0 || x! >= mundo.ancho || y! >= mundo.alto) continue;
        const i = (y! * mundo.ancho + x!) * 3;
        rgb[i] = 255;
        rgb[i + 1] = 40;
        rgb[i + 2] = 40;
      }
    }

    writeFileSync(salida, png(mundo.ancho, mundo.alto, rgb));
  });
});
