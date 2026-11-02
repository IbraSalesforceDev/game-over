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

/** Plantilla para añadir elementos sin datos (p. ej. una charla nueva). */
export const vacio = { descripcion: null, detalles: [], contenidos: [] };

// Información de la web oficial (mcetranspersonal.com), reescrita sin añadir
// datos: páginas «Inteligencia Emocional Transpersonal», «Terapia
// Transpersonal», «Servicios» y la del congreso.
export const bloques: Bloque[] = [
  {
    id: 'inteligencia-emocional-transpersonal',
    titulo: 'Inteligencia Emocional Transpersonal',
    descripcion:
      'Aprende a gestionar tus emociones y a poner en práctica lo que ya sabes. Una formación vivencial, por niveles, que te aporta la capacidad de identificar tus emociones y las de los demás, la oportunidad de sanar cargas emocionales del pasado, autoconocimiento y autoestima.',
    formaciones: [
      {
        id: 'iet-nivel-1',
        nombre: 'Nivel 1',
        descripcion: 'Descubre las herramientas de la Inteligencia Emocional aplicándolas de forma vivencial, con dinámicas en grupo y un profundo trabajo introspectivo.',
        detalles: [
          { etiqueta: 'Duración', valor: '3 días' },
          { etiqueta: 'Herramientas', valor: '10' },
        ],
        contenidos: [],
      },
      {
        id: 'iet-nivel-2',
        nombre: 'Nivel 2',
        descripcion: 'Un proceso de transformación en el que reconoces tu sombra y tu potencial: qué creencias y experiencias del pasado te están limitando.',
        detalles: [
          { etiqueta: 'Duración', valor: '4 días' },
          { etiqueta: 'Requisito', valor: 'Nivel 1' },
        ],
        contenidos: [],
      },
      {
        id: 'iet-nivel-3',
        nombre: 'Nivel 3',
        descripcion: 'Sé líder de tu vida: desarrolla tus habilidades sociales en un profundo trabajo en equipo y lleva las herramientas a cada área de tu vida.',
        detalles: [
          { etiqueta: 'Duración', valor: '3 fines de semana (1 al mes)' },
          { etiqueta: 'Requisito', valor: 'Niveles 1 y 2' },
        ],
        contenidos: [],
      },
      {
        id: 'iet-experto',
        nombre: 'Experto',
        descripcion:
          'Experto en Inteligencia Emocional Transpersonal: nueve meses de reflexión, aprendizaje, autoindagación y crecimiento, sostenidos en tres valores: compasión, comprensión y amor.',
        detalles: [
          { etiqueta: 'Duración', valor: '9 meses (1 fin de semana al mes)' },
          { etiqueta: 'Incluye', valor: 'Tutoría mensual individual y prácticas vivenciales' },
          { etiqueta: 'Requisito', valor: 'Niveles 1, 2 y 3' },
        ],
        contenidos: [],
      },
    ],
  },
  {
    id: 'terapia-transpersonal-y-consulta',
    titulo: 'Terapia Transpersonal y Consulta',
    descripcion:
      'Un proceso personalizado para quien busca un crecimiento individual o más específico. Te aporta propósito de vida y trascendencia, comprensión de tu experiencia de vida, autocompasión y compasión hacia los demás, y crecimiento transpersonal.',
    formaciones: [
      {
        id: 'consulta-transpersonal',
        nombre: 'Consulta transpersonal',
        descripcion: 'Con Betty Merino, directora de MCE.',
        detalles: [],
        contenidos: [
          'Recibes información sobre tu experiencia de vida, desde antes de tu nacimiento hasta hoy.',
          'Conoces con quién has pactado encontrarte a lo largo de tu vida para aprender.',
          'Comprendes para qué ocurrieron las experiencias que te resultaron más difíciles.',
          'Al final de la consulta puedes hacer tres preguntas.',
        ],
      },
      {
        id: 'terapia-transpersonal',
        nombre: 'Terapia transpersonal',
        descripcion:
          'Con el equipo MCE, formado en Inteligencia Emocional Transpersonal y en áreas como el coaching deportivo, ejecutivo u organizacional, la terapia individual y de pareja o la arteterapia.',
        detalles: [],
        contenidos: [
          'Un proceso de indagación individual con un terapeuta transpersonal.',
          'Sanar conflictos no resueltos desde una mirada transpersonal.',
          'Trabajar la compasión, la comprensión y el amor contigo y con quienes te rodean.',
          'Tomar consciencia de desde dónde te mueves en tu vida.',
        ],
      },
    ],
  },
  {
    id: 'monograficos-transpersonales',
    titulo: 'Monográficos transpersonales',
    // Fuente: Servicios. TODO: listado de monográficos.
    descripcion: 'Una de las dos líneas para seguir avanzando después de los cursos de Inteligencia Emocional, junto al Experto.',
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
    // Fuente: página del congreso («Evento anual de la Escuela…»).
    // TODO: fechas, lugar (sin dirección postal) y programa.
    descripcion: 'El encuentro anual de la Escuela para el Desarrollo Transpersonal MCE.',
    formaciones: [],
  },
];
