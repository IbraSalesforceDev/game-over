/**
 * Formaciones de MCE. Los campos en `null` o vacíos no se muestran.
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
  /** Duración y requisitos del apartado entero (p. ej. el Experto). */
  detalles?: Detalle[];
  formaciones: Formacion[];
};

/** Plantilla para añadir elementos sin datos (p. ej. una charla nueva). */
export const vacio = { descripcion: null, detalles: [], contenidos: [] };

// Información de la web oficial (mcetranspersonal.com), sin añadir datos.
// Regla de la escuela: en Formaciones no se explica qué es cada apartado; la
// información (fechas, precios…) la dan los carteles de cada cartelito
// (src/data/carteles.ts). Solo el Nivel 1 conserva su definición.
export const bloques: Bloque[] = [
  {
    id: 'niveles-inteligencia-emocional',
    titulo: 'Niveles de Inteligencia Emocional',
    descripcion: null,
    formaciones: [
      {
        id: 'iet-nivel-1',
        nombre: 'Nivel 1',
        descripcion: 'Descubre las herramientas de la Inteligencia Emocional aplicándolas de forma vivencial, con dinámicas en grupo y un profundo trabajo introspectivo.',
        detalles: [{ etiqueta: 'Duración', valor: '3 días' }],
        contenidos: [],
      },
      {
        id: 'iet-nivel-2',
        nombre: 'Nivel 2',
        descripcion: null,
        detalles: [
          { etiqueta: 'Duración', valor: '4 días' },
          { etiqueta: 'Requisito', valor: 'Nivel 1' },
        ],
        contenidos: [],
      },
      {
        id: 'iet-nivel-3',
        nombre: 'Nivel 3',
        descripcion: null,
        detalles: [
          { etiqueta: 'Duración', valor: '3 fines de semana (1 al mes)' },
          { etiqueta: 'Requisito', valor: 'Niveles 1 y 2' },
        ],
        contenidos: [],
      },
    ],
  },
  {
    id: 'experto-inteligencia-emocional-transpersonal',
    titulo: 'Experto en Inteligencia Emocional Transpersonal',
    // Mismos datos que tenía como nivel: solo duración y requisito.
    descripcion: null,
    detalles: [
      { etiqueta: 'Duración', valor: '9 meses (1 fin de semana al mes)' },
      { etiqueta: 'Requisito', valor: 'Niveles 1, 2 y 3' },
    ],
    formaciones: [],
  },
  { id: 'especialista-transpersonal-sistemico', titulo: 'Especialista Transpersonal Sistémico', descripcion: null, formaciones: [] },
  { id: '7h', titulo: '7H', descripcion: null, formaciones: [] },
  // Ya nadie realiza consultas: el apartado es solo Terapia Transpersonal.
  { id: 'terapia-transpersonal', titulo: 'Terapia Transpersonal', descripcion: null, formaciones: [] },
  { id: 'monograficos-transpersonales', titulo: 'Monográficos Transpersonales', descripcion: null, formaciones: [] },
  {
    id: 'otras-charlas-y-eventos',
    titulo: 'Otras charlas y eventos',
    descripcion: null,
    // Cada charla o evento abre su propio cartelito (ver src/data/carteles.ts,
    // con el mismo id). Para añadir uno: { id: 'nuevo-id', nombre: 'Nombre', ...vacio }.
    formaciones: [
      { id: 'charla-otono', nombre: 'Otoño', ...vacio },
      { id: 'charla-navidad', nombre: 'Navidad', ...vacio },
      { id: 'talleres-y-charlas', nombre: 'Talleres y charlas', ...vacio },
    ],
  },
  { id: 'congreso-transpersonal-2027', titulo: 'VII Congreso Transpersonal 2027', descripcion: null, formaciones: [] },
];

/** El Experto va muy ligado a los niveles: la cifra de Inicio los cuenta juntos. */
export const totalNiveles =
  (bloques.find((b) => b.id === 'niveles-inteligencia-emocional')?.formaciones.length ?? 0) +
  (bloques.some((b) => b.id === 'experto-inteligencia-emocional-transpersonal') ? 1 : 0);
