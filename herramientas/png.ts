import { deflateSync } from 'node:zlib';

/**
 * Un PNG mínimo: RGB de 8 bits, sin transparencia, sin filtros.
 *
 * Lo usan dos cosas que corren en Node y no en el navegador —el volcado del
 * mapa de los tests y los iconos que se generan al compilar— y ninguna de las
 * dos necesita más. Sin transparencia a propósito: el icono del iPhone no la
 * admite (la rellena de negro), y el mapa no la tiene.
 */
export function png(ancho: number, alto: number, rgb: Uint8Array): Buffer {
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
