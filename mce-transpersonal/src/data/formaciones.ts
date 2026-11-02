/**
 * Formaciones de MCE.
 *
 * TODO (importante): copiar los detalles (descripción, duración, contenidos,
 * modalidad, precios, fechas) SOLO de la web original:
 *   - https://mcetranspersonal.com/inteligencia-emocional-transpersonal/
 *   - la página de monográficos, charlas y eventos de la web original
 * Al crear la web no se pudo acceder a esas páginas, así que todos los campos
 * están en `null`. Los campos en `null` no se muestran.
 */

export type Detalle = { etiqueta: string; valor: string };

export type Formacion = {
  id: string;
  nombre: string;
  /** Texto corto de presentación (literal de la web original). */
  descripcion: string | null;
  /** Pares "Duración: …", "Modalidad: …", "Precio: …", "Fechas: …". */
  detalles: Detalle[];
  /** Lista de contenidos o temario. */
  contenidos: string[];
};

export type Bloque = {
  id: string;
  titulo: string;
  descripcion: string | null;
  formaciones: Formacion[];
};

const vacio = { descripcion: null, detalles: [], contenidos: [] };

export const bloques: Bloque[] = [
  {
    id: 'inteligencia-emocional-transpersonal',
    titulo: 'Inteligencia Emocional Transpersonal',
    // TODO: descripción literal de la web original.
    descripcion: null,
    formaciones: [
      { id: 'iet-nivel-1', nombre: 'Nivel 1', ...vacio }, // TODO: detalles Nivel 1
      { id: 'iet-nivel-2', nombre: 'Nivel 2', ...vacio }, // TODO: detalles Nivel 2
      { id: 'iet-nivel-3', nombre: 'Nivel 3', ...vacio }, // TODO: detalles Nivel 3
      { id: 'iet-experto', nombre: 'Experto', ...vacio }, // TODO: detalles Experto
    ],
  },
  {
    id: 'terapia-transpersonal-y-consulta',
    titulo: 'Terapia Transpersonal y Consulta',
    // TODO: descripción literal de la web original.
    descripcion: null,
    formaciones: [],
  },
  {
    id: 'monograficos-transpersonales',
    titulo: 'Monográficos transpersonales',
    // TODO: listado de monográficos.
    descripcion: null,
    formaciones: [],
  },
  {
    id: 'otras-charlas-y-eventos',
    titulo: 'Otras charlas y eventos',
    // TODO: listado de charlas y eventos. Cada uno puede tener su cartel
    // (imagen en un cartelito emergente): ver src/data/carteles.ts.
    descripcion: null,
    formaciones: [],
  },
  {
    id: 'congreso-transpersonal-2027',
    titulo: 'VII Congreso Transpersonal 2027',
    // TODO: fechas, lugar (sin dirección postal) y programa.
    descripcion: null,
    formaciones: [],
  },
];
