import { TILE } from '../core/constants';
import { alMenos, VERSION_ACTUAL } from '../core/versiones';
import type { Caja } from '../entities/physics';
import { ANTORCHA, ARENA, CAMA, CANA, CARBON, COBALTO, COBRE, esEstacion, HIERRO, HORNO, INFERNITA, LADRILLO, MADERA, MESA, ORO, PIEDRA, PLATA, PLATAFORMA, COFRE, TITANIO, YUNQUE } from '../world/tiles';
import type { Mundo } from '../world/world';
import type { Inventario } from './inventory';
import {
  CARNE_ASADA,
  CARNE_CRUDA,
  CUBO,
  ESPADA_COBRE,
  ESPADA_PIEDRA,
  PICO_COBRE,
  PICO_MADERA,
  PICO_PIEDRA,
  ESPADA_HIERRO,
  ESPADA_MADERA,
  GEL,
  LINGOTE_COBRE,
  LINGOTE_HIERRO,
  LINGOTE_ORO,
  LINGOTE_PLATA,
  PICO_HIERRO,
  PICO_ORO,
  PICO_PLATA,
  CASCO_COBRE,
  PETO_COBRE,
  GREBAS_COBRE,
  CASCO_HIERRO,
  PETO_HIERRO,
  GREBAS_HIERRO,
  CASCO_PLATA,
  PETO_PLATA,
  GREBAS_PLATA,
  CASCO_ORO,
  PETO_ORO,
  GREBAS_ORO,
  BOTAS_COBRE,
  GUANTES_COBRE,
  BOTAS_HIERRO,
  GUANTES_HIERRO,
  BOTAS_PLATA,
  GUANTES_PLATA,
  BOTAS_ORO,
  GUANTES_ORO,
  ARCO,
  HUESO,
  ARCO_CAZA,
  ARCO_COBALTO,
  ARCO_INFERNAL,
  FLECHA,
  FLECHA_FUEGO,
  FLECHA_HUESO,
  FLECHA_HIERRO,
  PALA_HIERRO,
  AZADA,
  PAPEL,
  MAPAS,
  PEDERNAL,
  VIDRIO,
  PAN,
  TRIGO,
  PLUMA,
  BRUJULA,
  LINGOTE_COBALTO,
  LINGOTE_TITANIO,
  LINGOTE_INFERNITA,
  PICO_COBALTO,
  PICO_TITANIO,
  PICO_INFERNITA,
  ESPADA_COBALTO,
  ESPADA_TITANIO,
  ESPADA_INFERNITA,
} from './items';

/**
 * Recetas de crafteo.
 *
 * Cada receta declara qué consume, qué produce y junto a qué estación hay que
 * estar. `estacion: null` significa que se hace a mano, en cualquier sitio.
 *
 * El orden de la lista es el orden en que se enseñan, así que va de lo básico a
 * lo caro: la primera vez que abres el panel, lo primero que ves es lo que
 * puedes hacer con la madera que acabas de recoger.
 */

export interface Receta {
  /** Identificador estable, por si algún día hay que guardarlas. */
  readonly id: string;
  /**
   * Versión en la que apareció.
   *
   * Sin esto, un mundo de 1.7.0 podría fabricar un arco: la receta existe en
   * el código de hoy y el código de hoy es el que corre. Es la diferencia
   * entre elegir versión de verdad y elegirla de adorno.
   */
  readonly desde?: string;
  readonly ingredientes: readonly (readonly [objeto: number, cantidad: number])[];
  readonly resultado: number;
  readonly cantidad: number;
  /** Tile de la estación necesaria, o null si se hace a mano. */
  readonly estacion: number | null;
}

export const RECETAS: readonly Receta[] = [
  // --- A mano ---
  {
    id: 'antorchas',
    // No antes: fabricar llegó con la mesa, en 1.7.0. La antorcha existía
    // desde 1.5.0 como bloque, pero no había forma de hacerla.
    desde: '1.7.0',
    ingredientes: [[MADERA, 1]],
    resultado: ANTORCHA,
    cantidad: 3,
    estacion: null,
  },
  {
    id: 'mesa',
    desde: '1.7.0',
    ingredientes: [[MADERA, 10]],
    resultado: MESA,
    cantidad: 1,
    estacion: null,
  },

  // El gel que sueltan los slimes hace que las antorchas cundan mucho más:
  // es lo que convierte matar bichos en algo útil y no solo en sobrevivir.
  {
    id: 'antorchas-gel',
    desde: '2.0.0',
    ingredientes: [
      [MADERA, 1],
      [GEL, 1],
    ],
    resultado: ANTORCHA,
    cantidad: 8,
    estacion: null,
  },

  // --- Mesa de trabajo ---
  {
    id: 'plataformas',
    desde: '1.7.0',
    ingredientes: [[MADERA, 1]],
    resultado: PLATAFORMA,
    cantidad: 2,
    estacion: MESA,
  },
  {
    id: 'cofre',
    desde: '1.7.0',
    ingredientes: [[MADERA, 8]],
    resultado: COFRE,
    cantidad: 1,
    estacion: MESA,
  },
  {
    id: 'horno',
    desde: '1.7.0',
    ingredientes: [[PIEDRA, 20]],
    resultado: HORNO,
    cantidad: 1,
    estacion: MESA,
  },
  {
    id: 'espada-madera',
    desde: '2.0.0',
    ingredientes: [[MADERA, 7]],
    resultado: ESPADA_MADERA,
    cantidad: 1,
    estacion: MESA,
  },
  // La rama de piedra existe para que el primer salto de herramienta llegue en
  // los primeros minutos y no dependa de bajar a buscar cobre: se empieza con
  // pico de madera y la piedra está literalmente bajo los pies.
  {
    id: 'pico-madera',
    desde: '1.7.0',
    ingredientes: [[MADERA, 12]],
    resultado: PICO_MADERA,
    cantidad: 1,
    estacion: MESA,
  },
  {
    id: 'pico-piedra',
    desde: '3.0.0',
    ingredientes: [
      [PIEDRA, 20],
      [MADERA, 5],
    ],
    resultado: PICO_PIEDRA,
    cantidad: 1,
    estacion: MESA,
  },
  {
    id: 'espada-piedra',
    desde: '3.0.0',
    ingredientes: [
      [PIEDRA, 14],
      [MADERA, 4],
    ],
    resultado: ESPADA_PIEDRA,
    cantidad: 1,
    estacion: MESA,
  },
  // El arco entra pronto y barato: es la respuesta a los enemigos que hacen
  // daño por contacto, y tenerlo detrás del hierro dejaría las primeras noches
  // sin más opción que la espada.
  {
    id: 'arco',
    desde: '3.0.0',
    ingredientes: [[MADERA, 14]],
    resultado: ARCO,
    cantidad: 1,
    estacion: MESA,
  },
  // Cinco por tirada: una a una, fabricar munición sería el juego entero.
  {
    id: 'flechas',
    desde: '3.0.0',
    ingredientes: [
      [MADERA, 1],
      [PIEDRA, 1],
    ],
    resultado: FLECHA,
    cantidad: 5,
    estacion: MESA,
  },

  // --- La escalera de arcos (5.4.0) ---
  //
  // Cada uno pide el metal de su tramo, y el infernal además huesos: no se
  // fabrica sin haber bajado a matar cosas, que es exactamente cuando toca.
  {
    id: 'arco-caza',
    desde: '5.4.0',
    ingredientes: [
      [MADERA, 8],
      [LINGOTE_HIERRO, 6],
    ],
    resultado: ARCO_CAZA,
    cantidad: 1,
    estacion: YUNQUE,
  },
  {
    id: 'arco-cobalto',
    desde: '5.4.0',
    ingredientes: [
      [MADERA, 6],
      [LINGOTE_COBALTO, 10],
    ],
    resultado: ARCO_COBALTO,
    cantidad: 1,
    estacion: YUNQUE,
  },
  {
    id: 'arco-infernal',
    desde: '5.4.0',
    ingredientes: [
      [LINGOTE_INFERNITA, 12],
      [HUESO, 4],
    ],
    resultado: ARCO_INFERNAL,
    cantidad: 1,
    estacion: YUNQUE,
  },

  // --- Las tres puntas ---
  //
  // Las de hueso y las de fuego salen de sobras —huesos de los esqueletos,
  // carbón del subsuelo— y solo la de hierro pide metal. Es a propósito: una
  // munición que compite por el mismo lingote que la armadura no se llega a
  // usar nunca, así que solo el primer escalón lo hace, y barato.
  //
  // Ojo con el nombre: ya había desde 3.2.0 unas "flechas de pedernal" que son
  // otra cosa —la misma flecha de siempre pero saliendo de ocho en ocho—. Esa
  // es una mejora de cantidad; esta, de daño. Llamar igual a las dos era el
  // camino más corto a que nadie entendiera ninguna.
  {
    id: 'flechas-hierro',
    desde: '5.4.0',
    ingredientes: [
      [MADERA, 2],
      [LINGOTE_HIERRO, 1],
    ],
    resultado: FLECHA_HIERRO,
    cantidad: 10,
    estacion: YUNQUE,
  },
  {
    id: 'flechas-hueso',
    desde: '5.4.0',
    ingredientes: [
      [MADERA, 1],
      [HUESO, 1],
    ],
    resultado: FLECHA_HUESO,
    cantidad: 6,
    estacion: MESA,
  },
  {
    id: 'flechas-fuego',
    desde: '5.4.0',
    ingredientes: [
      [MADERA, 2],
      [CARBON, 1],
      [GEL, 2],
    ],
    resultado: FLECHA_FUEGO,
    cantidad: 6,
    estacion: HORNO,
  },
  // La cama: madera y gel de relleno. Con ella se pasa la noche de un tirón, así
  // que se paga con lo que sobra de la primera noche que se aguanta despierto.
  {
    id: 'cama',
    desde: '3.2.0',
    ingredientes: [
      [MADERA, 12],
      [GEL, 8],
    ],
    resultado: CAMA,
    cantidad: 1,
    estacion: MESA,
  },
  // Las de pedernal pegan más y salen de más en más: es lo que hace que la
  // grava del río valga la pena.
  {
    id: 'flechas-pedernal',
    desde: '3.2.0',
    ingredientes: [
      [MADERA, 1],
      [PEDERNAL, 1],
    ],
    resultado: FLECHA,
    cantidad: 8,
    estacion: MESA,
  },
  // Con pluma vuelan derechas: doce por tirada, que es lo que convierte una
  // tarde de perseguir gallinas en un carcaj lleno.
  {
    id: 'flechas-pluma',
    desde: '3.2.0',
    ingredientes: [
      [MADERA, 1],
      [PEDERNAL, 1],
      [PLUMA, 1],
    ],
    resultado: FLECHA,
    cantidad: 12,
    estacion: MESA,
  },
  {
    id: 'yunque',
    desde: '1.7.0',
    ingredientes: [[LINGOTE_HIERRO, 5]],
    resultado: YUNQUE,
    cantidad: 1,
    estacion: MESA,
  },

  // --- Horno: fundir mineral ---
  {
    id: 'pan',
    desde: '3.2.0',
    ingredientes: [[TRIGO, 3]],
    resultado: PAN,
    cantidad: 1,
    estacion: HORNO,
  },
  {
    id: 'carne-asada',
    desde: '2.3.0',
    ingredientes: [[CARNE_CRUDA, 1]],
    resultado: CARNE_ASADA,
    cantidad: 1,
    estacion: HORNO,
  },
  // El vidrio sale del horno como los lingotes: fundir arena es exactamente el
  // mismo gesto que fundir mineral.
  {
    id: 'vidrio',
    desde: '3.2.0',
    ingredientes: [[ARENA, 2]],
    resultado: VIDRIO,
    cantidad: 1,
    estacion: HORNO,
  },
  // El ladrillo de fortaleza se puede cocer: es el único material del juego
  // que no sale de ningún bioma, y dejarlo solo para picarlo de la fortaleza
  // convertiría la fortaleza en una cantera. Así se puede construir con él.
  {
    id: 'ladrillo',
    desde: '4.0.0',
    ingredientes: [[PIEDRA, 2]],
    resultado: LADRILLO,
    cantidad: 2,
    estacion: HORNO,
  },
  {
    id: 'lingote-cobre',
    desde: '1.7.0',
    ingredientes: [[COBRE, 3]],
    resultado: LINGOTE_COBRE,
    cantidad: 1,
    estacion: HORNO,
  },
  {
    id: 'lingote-hierro',
    desde: '1.7.0',
    ingredientes: [[HIERRO, 3]],
    resultado: LINGOTE_HIERRO,
    cantidad: 1,
    estacion: HORNO,
  },
  {
    id: 'lingote-plata',
    desde: '3.0.0',
    ingredientes: [[PLATA, 4]],
    resultado: LINGOTE_PLATA,
    cantidad: 1,
    estacion: HORNO,
  },
  {
    id: 'lingote-oro',
    desde: '3.0.0',
    ingredientes: [[ORO, 4]],
    resultado: LINGOTE_ORO,
    cantidad: 1,
    estacion: HORNO,
  },

  // --- Yunque: herramientas ---
  {
    id: 'pico-cobre',
    desde: '1.7.0',
    ingredientes: [
      [LINGOTE_COBRE, 10],
      [MADERA, 4],
    ],
    resultado: PICO_COBRE,
    cantidad: 1,
    estacion: YUNQUE,
  },
  {
    id: 'pico-hierro',
    desde: '1.7.0',
    ingredientes: [
      [LINGOTE_HIERRO, 12],
      [MADERA, 4],
    ],
    resultado: PICO_HIERRO,
    cantidad: 1,
    estacion: YUNQUE,
  },
  {
    id: 'espada-cobre',
    desde: '2.0.0',
    ingredientes: [
      [LINGOTE_COBRE, 8],
      [MADERA, 3],
    ],
    resultado: ESPADA_COBRE,
    cantidad: 1,
    estacion: YUNQUE,
  },
  {
    id: 'espada-hierro',
    desde: '2.0.0',
    ingredientes: [
      [LINGOTE_HIERRO, 10],
      [MADERA, 3],
    ],
    resultado: ESPADA_HIERRO,
    cantidad: 1,
    estacion: YUNQUE,
  },
  // El cubo es lo que convierte el agua en un material: sin él los lagos solo
  // se pueden mover cavando, y la lava no se puede tocar en absoluto.
  {
    id: 'cubo',
    desde: '2.1.0',
    ingredientes: [[LINGOTE_HIERRO, 3]],
    resultado: CUBO,
    cantidad: 1,
    estacion: YUNQUE,
  },
  // La pala sale del mismo yunque que el pico de hierro y cuesta parecido: no
  // es una mejora, es la otra mitad del par.
  {
    id: 'pala-hierro',
    desde: '3.0.0',
    ingredientes: [
      [LINGOTE_HIERRO, 9],
      [MADERA, 4],
    ],
    resultado: PALA_HIERRO,
    cantidad: 1,
    estacion: YUNQUE,
  },
  {
    id: 'azada',
    desde: '3.0.0',
    ingredientes: [
      [LINGOTE_COBRE, 4],
      [MADERA, 5],
    ],
    resultado: AZADA,
    cantidad: 1,
    estacion: YUNQUE,
  },
  // La brújula. Cuesta un poco de oro a propósito: con ella la fortaleza deja
  // de ser un premio de lotería y pasa a ser un sitio al que se va, así que
  // tiene que llegar cuando ya se ha bajado a la caverna, no antes.
  {
    id: 'brujula',
    desde: '4.0.0',
    ingredientes: [
      [LINGOTE_HIERRO, 5],
      [LINGOTE_ORO, 1],
    ],
    resultado: BRUJULA,
    cantidad: 1,
    estacion: YUNQUE,
  },
  {
    id: 'pico-plata',
    desde: '3.0.0',
    ingredientes: [
      [LINGOTE_PLATA, 12],
      [MADERA, 4],
    ],
    resultado: PICO_PLATA,
    cantidad: 1,
    estacion: YUNQUE,
  },
  {
    id: 'pico-oro',
    desde: '3.0.0',
    ingredientes: [
      [LINGOTE_ORO, 12],
      [MADERA, 4],
    ],
    resultado: PICO_ORO,
    cantidad: 1,
    estacion: YUNQUE,
  },
  // --- Los tres metales de 5.0.0 ---
  //
  // Se funden como los de siempre y se forjan como los de siempre: la cadena de
  // herramientas no cambia de reglas al final, solo se alarga.
  {
    id: 'antorchas-carbon',
    desde: '5.0.0',
    ingredientes: [
      [MADERA, 1],
      [CARBON, 1],
    ],
    resultado: ANTORCHA,
    cantidad: 6,
    estacion: null,
  },
  {
    id: 'lingote-cobalto',
    desde: '5.0.0',
    ingredientes: [
      [COBALTO, 4],
      [CARBON, 1],
    ],
    resultado: LINGOTE_COBALTO,
    cantidad: 1,
    estacion: HORNO,
  },
  {
    id: 'lingote-titanio',
    desde: '5.0.0',
    ingredientes: [
      [TITANIO, 4],
      [CARBON, 2],
    ],
    resultado: LINGOTE_TITANIO,
    cantidad: 1,
    estacion: HORNO,
  },
  {
    id: 'lingote-infernita',
    desde: '5.0.0',
    ingredientes: [
      [INFERNITA, 4],
      [CARBON, 3],
    ],
    resultado: LINGOTE_INFERNITA,
    cantidad: 1,
    estacion: HORNO,
  },
  ...forjas(),
  ...armaduras(),
  ...mapas(),
];

/** Picos y espadas de los tres metales nuevos, que siguen el mismo patrón. */
function forjas(): Receta[] {
  const juegos: [number, number, number, number, number][] = [
    [LINGOTE_COBALTO, PICO_COBALTO, ESPADA_COBALTO, 14, 11],
    [LINGOTE_TITANIO, PICO_TITANIO, ESPADA_TITANIO, 16, 13],
    [LINGOTE_INFERNITA, PICO_INFERNITA, ESPADA_INFERNITA, 18, 15],
  ];
  const nombres = ['cobalto', 'titanio', 'infernita'];
  return juegos.flatMap(([lingote, pico, espada, costePico, costeEspada], i) => [
    {
      id: `pico-${nombres[i]}`,
      desde: '5.0.0',
      ingredientes: [
        [lingote, costePico],
        [MADERA, 4],
      ],
      resultado: pico,
      cantidad: 1,
      estacion: YUNQUE,
    },
    {
      id: `espada-${nombres[i]}`,
      desde: '5.0.0',
      ingredientes: [
        [lingote, costeEspada],
        [MADERA, 3],
      ],
      resultado: espada,
      cantidad: 1,
      estacion: YUNQUE,
    },
  ]);
}

/**
 * Papel y la escalera de mapas.
 *
 * El primer mapa cuesta dos papeles y enseña un pañuelo de terreno. A partir de
 * ahí cada ampliación pide el mapa que ya tienes más otros dos papeles, así que
 * el mapa del mundo entero sale por diez papeles en total — treinta cañas — y
 * hay que ir haciéndolo por pasos. Es lo que convierte ver el mundo en algo que
 * se gana, en vez de una casilla que se marca al fabricar un objeto.
 */
function mapas(): Receta[] {
  const salida: Receta[] = [
    {
      id: 'papel',
    desde: '3.0.0',
      ingredientes: [[CANA, 3]],
      resultado: PAPEL,
      cantidad: 2,
      estacion: MESA,
    },
    {
      id: 'mapa-1',
      desde: '3.0.0',
      ingredientes: [[PAPEL, 2]],
      resultado: MAPAS[0]!,
      cantidad: 1,
      estacion: MESA,
    },
  ];
  for (let i = 1; i < MAPAS.length; i++) {
    salida.push({
      id: `mapa-${i + 1}`,
      desde: '3.0.0',
      ingredientes: [
        [MAPAS[i - 1]!, 1],
        [PAPEL, 2],
      ],
      resultado: MAPAS[i]!,
      cantidad: 1,
      estacion: MESA,
    });
  }
  return salida;
}

/**
 * Las doce piezas de armadura, generadas en vez de escritas a mano.
 *
 * Doce entradas idénticas salvo por dos números son doce sitios donde
 * equivocarse al retocar el coste. El reparto —peto lo más caro, casco lo más
 * barato— es el mismo en los cuatro metales, así que sale de un bucle.
 */
function armaduras(): Receta[] {
  const juegos: [string, number, number[]][] = [
    ['cobre', LINGOTE_COBRE, [CASCO_COBRE, PETO_COBRE, GREBAS_COBRE, BOTAS_COBRE, GUANTES_COBRE]],
    ['hierro', LINGOTE_HIERRO, [CASCO_HIERRO, PETO_HIERRO, GREBAS_HIERRO, BOTAS_HIERRO, GUANTES_HIERRO]],
    ['plata', LINGOTE_PLATA, [CASCO_PLATA, PETO_PLATA, GREBAS_PLATA, BOTAS_PLATA, GUANTES_PLATA]],
    ['oro', LINGOTE_ORO, [CASCO_ORO, PETO_ORO, GREBAS_ORO, BOTAS_ORO, GUANTES_ORO]],
  ];
  // Un juego entero cuesta 45 lingotes: bastante más que el pico del mismo
  // metal, para que vestirse sea una decisión y no el siguiente paso obvio.
  const coste: [string, number][] = [
    ['casco', 12],
    ['peto', 20],
    ['grebas', 13],
    ['botas', 8],
    ['guantes', 7],
  ];
  const salida: Receta[] = [];
  for (const [metal, lingoteId, ids] of juegos) {
    coste.forEach(([pieza, cuantos], i) => {
      salida.push({
        id: `${pieza}-${metal}`,
        // Las cinco piezas llegaron a la vez, con la armadura entera.
        desde: pieza === 'botas' || pieza === 'guantes' ? '3.2.0' : '3.0.0',
        ingredientes: [[lingoteId, cuantos]],
        resultado: ids[i]!,
        cantidad: 1,
        estacion: YUNQUE,
      });
    });
  }
  return salida;
}

/** Radio, en tiles, dentro del cual una estación cuenta como "cerca". */
export const RADIO_ESTACION = 6;

/**
 * Estaciones al alcance del jugador. Se devuelve un conjunto porque una mesa
 * pegada a un horno habilita las recetas de ambos, que es como funciona en
 * Terraria y como espera cualquiera que monte su taller en una sala.
 */
export function estacionesCerca(mundo: Mundo, caja: Caja): Set<number> {
  const cerca = new Set<number>();
  const cx = Math.floor((caja.x + caja.ancho / 2) / TILE);
  const cy = Math.floor((caja.y + caja.alto / 2) / TILE);
  for (let ty = cy - RADIO_ESTACION; ty <= cy + RADIO_ESTACION; ty++) {
    for (let tx = cx - RADIO_ESTACION; tx <= cx + RADIO_ESTACION; tx++) {
      const id = mundo.getTile(tx, ty);
      if (esEstacion(id)) cerca.add(id);
    }
  }
  return cerca;
}

export function tieneIngredientes(inv: Inventario, receta: Receta): boolean {
  return receta.ingredientes.every(([objeto, n]) => inv.contar(objeto) >= n);
}

export function estacionDisponible(receta: Receta, estaciones: ReadonlySet<number>): boolean {
  return receta.estacion === null || estaciones.has(receta.estacion);
}

export function sePuedeCraftear(
  inv: Inventario,
  receta: Receta,
  estaciones: ReadonlySet<number>,
  versionMundo: string = VERSION_ACTUAL,
): boolean {
  return (
    estacionDisponible(receta, estaciones) &&
    existeEn(receta, versionMundo) &&
    tieneIngredientes(inv, receta)
  );
}

/**
 * Recetas cuya estación está disponible. Se enseñan también las que no se
 * pueden pagar todavía, en gris: saber que existe un pico de hierro es lo que
 * te empuja a bajar a por hierro.
 */
export function recetasVisibles(
  estaciones: ReadonlySet<number>,
  versionMundo: string = VERSION_ACTUAL,
): Receta[] {
  return RECETAS.filter(
    (r) => estacionDisponible(r, estaciones) && existeEn(r, versionMundo),
  );
}

/** ¿Esta receta ya existía en esta versión del juego? */
export function existeEn(receta: Receta, versionMundo: string): boolean {
  return receta.desde === undefined || alMenos(versionMundo, receta.desde);
}

/**
 * Ejecuta una receta. Devuelve false y no toca nada si falta algo, si no hay
 * estación o si el resultado no cabe: fabricar y perder el resultado sería
 * peor que no fabricar.
 */
export function craftear(
  inv: Inventario,
  receta: Receta,
  estaciones: ReadonlySet<number>,
  versionMundo: string = VERSION_ACTUAL,
): boolean {
  if (!sePuedeCraftear(inv, receta, estaciones, versionMundo)) return false;
  if (!inv.cabe(receta.resultado, receta.cantidad)) return false;

  for (const [objeto, n] of receta.ingredientes) {
    let restante = n;
    for (let i = 0; i < inv.ranuras.length && restante > 0; i++) {
      if (inv.ranuras[i]!.objeto !== objeto) continue;
      restante -= inv.sacarDe(i, restante);
    }
  }
  inv.anadir(receta.resultado, receta.cantidad);
  return true;
}
