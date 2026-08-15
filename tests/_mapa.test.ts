import { describe, it } from 'vitest';
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { generarMundo } from '../src/world/gen/worldgen';
import { TILES } from '../src/world/tiles';

/**
 * Utilidad de inspección, no una comprobación: vuelca el mundo entero a un PNG
 * para poder mirar de un vistazo el relieve, las cuevas y las vetas. Se ejecuta
 * a mano con `npx vitest run tests/_mapa.test.ts`.
 */

function png(ancho: number, alto: number, rgb: Uint8Array): Buffer {
  const crcTabla = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTabla[n] = c;
  }
  const crc = (buf: Buffer): number => {
    let c = -1;
    for (const b of buf) c = crcTabla[(c ^ b) & 0xff]! ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const trozo = (tipo: string, datos: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(datos.length);
    const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(cuerpo));
    return Buffer.concat([len, cuerpo, c]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; // profundidad
  ihdr[9] = 2; // color RGB
  const filas = Buffer.alloc((ancho * 3 + 1) * alto);
  for (let y = 0; y < alto; y++) {
    filas[y * (ancho * 3 + 1)] = 0; // filtro none
    rgb.subarray(y * ancho * 3, (y + 1) * ancho * 3).forEach((v, i) => {
      filas[y * (ancho * 3 + 1) + 1 + i] = v;
    });
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(filas)),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

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
        if (id === 0) {
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
