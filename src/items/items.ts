import { DURACION, EFECTOS, type ClaseEfecto } from '../entities/efectos';
import {
  textoFilo,
  textoPoder,
  textoRepresalia,
  type ClaseFilo,
  type ClasePoder,
  type ClaseRepresalia,
} from './inscripciones';
import {
  ALTAR,
  ANTORCHA,
  ARENA,
  ARENISCA,
  CACTUS,
  CALDERO,
  PLACAS,
  CRISTAL_VIDA,
  COBRE,
  COFRE,
  HIELO,
  HIERBA,
  NIEVE,
  HIERRO,
  HOJAS,
  HORNO,
  MADERA,
  MESA,
  ORO,
  PIEDRA,
  PLATA,
  PLATAFORMA,
  BARRO,
  BROTE,
  CAMA,
  CANA,
  CARBON,
  COBALTO,
  INFERNITA,
  LADRILLO,
  LIANA,
  LADRILLO_INFERNAL,
  PINCHOS,
  BLOQUES_METAL,
  BATERIA,
  BOMBILLA,
  BOMBILLA_ENCENDIDA,
  CABLE,
  INTERRUPTOR,
  INTERRUPTOR_ENCENDIDO,
  ROCA_INFERNAL,
  TITANIO,
  GRAVA,
  HIERBA_JUNGLA,
  OBSIDIANA,
  HOJAS_JUNGLA,
  HOJAS_PINO,
  TRONCO_ABEDUL,
  TRONCO_JUNGLA,
  TIERRA,
  TIERRA_LABRADA,
  TRIGO_0,
  TRIGO_1,
  TRIGO_2,
  TRIGO_3,
  ZANAHORIA_0,
  ZANAHORIA_1,
  ZANAHORIA_2,
  ZANAHORIA_3,
  TILES,
  TRONCO,
  VIDRIO as VIDRIO_TILE,
  YUNQUE,
} from '../world/tiles';
import { alMenos } from '../core/versiones';

/**
 * Catálogo de objetos.
 *
 * Los objetos que son bloques comparten identificador con su tile, así colocar
 * es `mundo.setTile(tx, ty, objeto)` sin tabla de traducción. Los que no son
 * bloques empiezan en `BASE_NO_TILE`, bien lejos del rango de tiles: los ids
 * acaban dentro de partidas guardadas, y si dependieran de cuántos tiles
 * existan, añadir un mueble convertiría los picos de todo el mundo en otra cosa.
 * Ya pasó al llegar la fase 7, y por eso el formato de guardado sube de versión
 * y remapea.
 *
 * En 6.4.1 la frontera se movió de 64 a 128 por la razón contraria: con los
 * bloques de metal, los tiles llegaron a 60 y quedaban tres huecos hasta chocar
 * con el primer lingote. Tres no daban ni para la instalación eléctrica más
 * pelada —cable, bombilla apagada, bombilla encendida y batería son cuatro—, así
 * que o se movía la frontera o el catálogo de bloques se cerraba para siempre.
 * Los objetos guardados se traducen al abrir la partida.
 *
 * Lo que suelta un tile al romperse sí es una tabla aparte, porque no es uno a
 * uno: la hierba suelta tierra, el tronco madera y las hojas nada.
 */

export const NADA = 0;

// La comparación de versiones vive en `core/versiones`; aquí solo se usa.

/** Primer id que no corresponde a un tile. */
export const BASE_NO_TILE = 128;

export const LINGOTE_COBRE = 128;
export const LINGOTE_HIERRO = 129;
export const LINGOTE_PLATA = 130;
export const LINGOTE_ORO = 131;
export const PICO_MADERA = 132;
export const PICO_COBRE = 133;
export const PICO_HIERRO = 134;
export const PICO_PLATA = 135;
export const PICO_ORO = 136;
export const GEL = 137;
export const HUESO = 138;
export const ESPADA_MADERA = 139;
export const ESPADA_COBRE = 140;
export const ESPADA_HIERRO = 141;
export const CUBO = 142;
export const CUBO_AGUA = 143;
export const CUBO_LAVA = 144;
export const PICO_PIEDRA = 145;
export const ESPADA_PIEDRA = 146;
export const CARNE_CRUDA = 147;
export const CARNE_ASADA = 148;
export const BAYAS = 149;
export const CRISTAL = 150;
// Armadura: casco, peto y grebas de cada metal. Van seguidos y en el mismo
// orden en los cuatro juegos, para que la tabla de recetas sea un bucle.
export const CASCO_COBRE = 151;
export const PETO_COBRE = 152;
export const GREBAS_COBRE = 153;
export const CASCO_HIERRO = 154;
export const PETO_HIERRO = 155;
export const GREBAS_HIERRO = 156;
export const CASCO_PLATA = 157;
export const PETO_PLATA = 158;
export const GREBAS_PLATA = 159;
export const CASCO_ORO = 160;
export const PETO_ORO = 161;
export const GREBAS_ORO = 162;
export const ARCO = 163;
export const FLECHA = 164;
export const PALA_HIERRO = 165;
export const AZADA = 166;
export const PAPEL = 167;
// Los cinco mapas. Van seguidos y de menos a más: el nivel es la posición en
// `MAPAS`, no un campo, porque una ranura de inventario solo guarda un id.
export const MAPA_1 = 168;
export const MAPA_2 = 169;
export const MAPA_3 = 170;
export const MAPA_4 = 171;
export const MAPA_5 = 172;
export const PEDERNAL = 173;
export const VIDRIO = 174;
// Botas y guantes: los dos huecos que faltaban. Van en cuatro metales, como el
// resto de la armadura.
export const BOTAS_COBRE = 175;
export const GUANTES_COBRE = 176;
export const BOTAS_HIERRO = 177;
export const GUANTES_HIERRO = 178;
export const BOTAS_PLATA = 179;
export const GUANTES_PLATA = 180;
export const BOTAS_ORO = 181;
export const GUANTES_ORO = 182;
export const SEMILLAS = 183;
export const SEMILLAS_ZANAHORIA = 184;
export const TRIGO = 185;
export const PAN = 186;
export const PLUMA = 187;
// Bloque 5: la fortaleza, el altar y el jefe.
export const RELIQUIA = 188;
export const BRUJULA = 189;
export const ESPADA_GUARDIAN = 190;
export const ESENCIA = 191;
// 5.0.0: los tres metales nuevos, con su lingote, su pico y su espada. El
// carbón no tiene lingote —no se funde, se quema— y va como material suelto.
export const LINGOTE_COBALTO = 192;
export const LINGOTE_TITANIO = 193;
export const LINGOTE_INFERNITA = 194;
export const PICO_COBALTO = 195;
export const PICO_TITANIO = 196;
export const PICO_INFERNITA = 197;
export const ESPADA_COBALTO = 198;
export const ESPADA_TITANIO = 199;
export const ESPADA_INFERNITA = 200;

// --- Arquería (5.4.0) -------------------------------------------------------
// El arco llevaba desde 3.0.0 siendo uno solo con una sola flecha: una vez
// fabricado no había nada más que hacer con él, y a partir de la espada de
// hierro dejaba de merecer la pena. Ahora hay una escalera de arcos y, sobre
// todo, tres puntas que cambian a qué se apunta y no solo cuánto quita.
export const ARCO_CAZA = 201;
export const ARCO_COBALTO = 202;
export const ARCO_INFERNAL = 203;
export const FLECHA_HIERRO = 204;
export const FLECHA_HUESO = 205;
export const FLECHA_FUEGO = 206;

// --- Metalurgia (6.4.0) -----------------------------------------------------
// Los tres metales nuevos llevaban desde 5.0.0 dando pico, espada y arco, y
// nada más: se llegaba al inframundo, se sacaba infernita y lo único que se
// podía hacer con ella era un pico que ya no hacía falta para nada, porque no
// quedaba nada más duro que picar. Aquí se cierra: armadura de los tres, un
// sitio donde guardar el metal sobrante y algo que hacer con el carbón.
export const CASCO_COBALTO = 207;
export const PETO_COBALTO = 208;
export const GREBAS_COBALTO = 209;
export const BOTAS_COBALTO = 210;
export const GUANTES_COBALTO = 211;
export const CASCO_TITANIO = 212;
export const PETO_TITANIO = 213;
export const GREBAS_TITANIO = 214;
export const BOTAS_TITANIO = 215;
export const GUANTES_TITANIO = 216;
export const CASCO_INFERNITA = 217;
export const PETO_INFERNITA = 218;
export const GREBAS_INFERNITA = 219;
export const BOTAS_INFERNITA = 220;
export const GUANTES_INFERNITA = 221;
/**
 * Pólvora: carbón molido con arena.
 *
 * Es el material que le da sentido al carbón más allá de la antorcha. Hasta
 * ahora se picaban vetas enteras de carbón para hacer seis antorchas y el resto
 * se quedaba en el cofre para siempre.
 */
export const POLVORA = 222;
export const BOMBA = 223;
export const DINAMITA = 224;

/**
 * El frasco y las pociones.
 *
 * El frasco va aparte y se gasta al preparar: es lo que hace que las pociones
 * cuesten vidrio y no solo hierbas, y que valga la pena tener un horno cerca del
 * caldero. Sin él, cualquier bayería del camino se convertiría en poción.
 */
export const FRASCO = 225;
export const POCION_VIDA = 226;
export const POCION_REGENERACION = 227;
export const POCION_FUERZA = 228;
export const POCION_PIEDRA = 229;
export const POCION_LIGEREZA = 230;
export const POCION_REMEDIO = 231;

/**
 * Los seis ídolos y los seis trofeos (7.0.0).
 *
 * Un ídolo es el ritual hecho objeto: se prepara con material del bioma al que
 * pertenece y se usa allí, y al usarlo despierta al jefe de ese sitio. Se
 * eligió un objeto en vez de un altar por bioma porque un altar hay que
 * generarlo, encontrarlo y protegerlo de que una cueva se lo lleve por delante,
 * y lo que se quería no era una búsqueda sino una preparación: juntar lo que
 * hay que juntar y decidir cuándo estás listo.
 *
 * El trofeo es lo que deja cada uno. Todavía no hace nada —el equipo de bioma
 * llega en la siguiente versión— y eso está dicho en su descripción, que es
 * mejor que fingir que sirve para algo.
 */
export const IDOLO_PRADERA = 232;
export const IDOLO_DESIERTO = 233;
export const IDOLO_NIEVE = 234;
export const IDOLO_JUNGLA = 235;
export const IDOLO_CUEVA = 236;
export const IDOLO_INFIERNO = 237;
export const TROFEO_PRADERA = 238;
export const TROFEO_DESIERTO = 239;
export const TROFEO_NIEVE = 240;
export const TROFEO_JUNGLA = 241;
export const TROFEO_CUEVA = 242;
export const TROFEO_INFIERNO = 243;

/**
 * El equipo de bioma (7.1.0).
 *
 * Seis espadas y seis petos, uno de cada jefe. No son "lo mismo con más
 * números": cada uno lleva una inscripción, y la inscripción es lo que hace que
 * elegir equipo sea una decisión de bioma. El arma lleva un filo, que actúa
 * solo en cada golpe; el peto lleva un poder, que se dispara con la Q.
 */
export const ESPADA_LIMO = 244;
export const ESPADA_ARENA = 245;
export const ESPADA_ESCARCHA = 246;
export const ESPADA_SELVA = 247;
export const ESPADA_CAVERNA = 248;
export const ESPADA_BRASA = 249;
export const PETO_LIMO = 250;
export const PETO_ARENA = 251;
export const PETO_ESCARCHA = 252;
export const PETO_SELVA = 253;
export const PETO_CAVERNA = 254;
export const PETO_BRASA = 255;

/**
 * Las reliquias de bioma y lo que hay detrás (7.2.0).
 *
 * Una reliquia no se pica ni la suelta nadie: se forja con el arma de ese
 * bioma, y por eso tener las seis significa haber estado en los seis sitios y
 * haber matado a los seis. Es la única cosa del juego que no se puede
 * conseguir de ninguna otra forma, y ese es exactamente su trabajo: ser la
 * llave que no se encuentra por casualidad.
 */
export const RELIQUIA_PRADERA = 256;
export const RELIQUIA_DESIERTO = 257;
export const RELIQUIA_NIEVE = 258;
export const RELIQUIA_JUNGLA = 259;
export const RELIQUIA_CUEVA = 260;
export const RELIQUIA_INFIERNO = 261;
/** Lo que deja el jefe de verdad. */
export const ESPADA_VERDADERA = 262;
export const CORONA_ROTA = 263;
/** 7.3.0: dos pociones más, para los dos ratos del juego que eran esperar. */
export const POCION_AGALLAS = 264;
export const POCION_BRIO = 265;

/**
 * Los seis guantes de élite (7.10.0).
 *
 * Cada élite deja los suyos, y lo que llevan grabado es lo que hacía esa élite:
 * la araña deja ponzoña, el diablillo deja brasa, el esqueleto deja esquirlas.
 * Es la respuesta a "una élite tiene que dejar algo que sea suyo": hasta ahora
 * dejaba el doble de gel, que es más de lo mismo y no se recuerda.
 *
 * Van todos en las manos, y ese es el precio: solo se puede llevar una
 * represalia de élite a la vez, así que elegir cuál es una decisión y no una
 * colección. Con el peto de un jefe puesto se pueden llevar dos, una de cada
 * sitio, y ahí está la gracia de combinarlos.
 *
 * Defienden muy poco a propósito. Si además fueran los mejores guantes del
 * juego, la escalera de metales se saltaría entera de un salto.
 */
export const GUANTES_PONZONA = 266;
export const GUANTES_ESCARCHA = 267;
export const GUANTES_BRASA = 268;
export const GUANTES_ESQUIRLA = 269;
export const GUANTES_SAVIA = 270;
export const GUANTES_COSTRA = 271;

/**
 * Los mapas por nivel y hasta dónde ve cada uno, en tiles alrededor.
 *
 * Empieza siendo un pañuelo —lo justo para no perder de vista la casa— y acaba
 * enseñando el mundo entero. La progresión es geométrica porque lineal se haría
 * eterna: con cinco escalones se pasa de ver el jardín a verlo todo, y cada
 * salto se nota de verdad al abrirlo.
 */
export const MAPAS: readonly number[] = [MAPA_1, MAPA_2, MAPA_3, MAPA_4, MAPA_5];
export const ALCANCE_MAPA: readonly number[] = [45, 110, 260, 620, Infinity];

/**
 * Identificadores que tenían las herramientas antes de moverse fuera del rango
 * de tiles. Se conserva para poder abrir partidas del formato 3.
 */
export const IDS_ANTIGUOS: Readonly<Record<number, number>> = {
  13: PICO_MADERA,
  14: PICO_COBRE,
  15: PICO_HIERRO,
};

export type TipoObjeto =
  | 'bloque'
  | 'herramienta'
  | 'arma'
  | 'material'
  | 'cubo'
  | 'comida'
  | 'cristal'
  | 'armadura'
  | 'arco'
  | 'municion'
  | 'mapa'
  | 'semilla'
  | 'brujula'
  | 'explosivo'
  | 'pocion'
  | 'invocador'
  | 'trofeo';

/**
 * Dónde se lleva puesta una pieza de armadura.
 *
 * Son tres huecos y no uno solo porque la progresión interesante es la de ir
 * completando el juego: llevar el casco de cobre y el peto de hierro tiene que
 * ser un estado posible, no un error.
 */
export type Hueco = 'cabeza' | 'torso' | 'piernas' | 'pies' | 'manos';

export const HUECOS: readonly Hueco[] = ['cabeza', 'torso', 'piernas', 'pies', 'manos'];

export interface DefObjeto {
  readonly nombre: string;
  readonly tipo: TipoObjeto;
  readonly color: string;
  readonly maxPila: number;
  /** Tile que coloca, si es un bloque. */
  readonly tile?: number;
  /** Potencia de picado, si es un pico. */
  readonly potencia?: number;
  /** Nivel de la herramienta: qué tiles puede romper. */
  readonly nivel?: number;
  /**
   * Es una pala: va rapidísima en lo blando y fatal en lo demás.
   *
   * La alternativa era darle simplemente más potencia que el pico, y entonces
   * sería un pico mejor y nadie volvería a llevar pico. Que sea buena en una
   * cosa y mala en otra es lo que hace que valga la pena llevar las dos.
   */
  readonly pala?: boolean;
  /** Labra la tierra en vez de romperla. */
  readonly azada?: boolean;
  /** Daño por golpe, si es un arma. */
  readonly dano?: number;
  /** Ticks entre golpes, si es un arma. */
  readonly cadencia?: number;
  /** Alcance del golpe en píxeles, si es un arma. */
  readonly alcance?: number;
  /** Hambre que quita, si es comida. */
  readonly saciedad?: number;
  /** Vida que cura al comerla. */
  readonly curacion?: number;
  /** Dónde se equipa, si es armadura. */
  readonly hueco?: Hueco;
  /** Daño que descuenta llevándola puesta. */
  readonly defensa?: number;
  /** Munición que gasta, si es un arma a distancia. */
  readonly municion?: number;
  /** Velocidad de salida del proyectil, en píxeles por tick. */
  readonly velocidad?: number;
  /**
   * Lo que aporta una munición por encima del arco que la lanza.
   *
   * Va en la munición y no en el arco porque es lo que hace que elegir flecha
   * sea una decisión: el arco decide cuánto pega de base y cada cuánto, y la
   * punta decide contra qué es buena. Un arco malo con flechas de fuego resuelve
   * un grupo mejor que un arco bueno con flechas lisas.
   */
  readonly danoExtra?: number;
  readonly perfora?: number;
  readonly estalla?: number;
  /** Nivel del mapa, si es un mapa: 1 el más pequeño. */
  readonly nivelMapa?: number;
  /** Primera etapa del cultivo que planta, si es una semilla. */
  readonly siembra?: number;
  /** Efecto que pone al beberla, si es una poción. */
  readonly efecto?: ClaseEfecto;
  /** Ticks que dura ese efecto. */
  readonly duracion?: number;
  /** Quita todo lo malo al beberla. Es lo que hace el remedio. */
  readonly limpia?: boolean;
  /** Inscripción del arma: lo que hace sola en cada golpe. */
  readonly filo?: ClaseFilo;
  /** Inscripción de la armadura: lo que hace al pulsar la tecla. */
  readonly poder?: ClasePoder;
  /** Inscripción de la armadura: lo que contesta sola cuando te pegan. */
  readonly represalia?: ClaseRepresalia;
}

const PILA = 999;

function deTile(id: number, tipo: TipoObjeto = 'bloque'): [number, DefObjeto] {
  const t = TILES[id]!;
  return [
    id,
    {
      nombre: t.nombre,
      tipo,
      color: t.color,
      maxPila: PILA,
      tile: tipo === 'bloque' ? id : undefined,
    },
  ];
}

function lingote(id: number, nombre: string, color: string): [number, DefObjeto] {
  return [id, { nombre, tipo: 'material', color, maxPila: PILA }];
}

function pico(
  id: number,
  nombre: string,
  color: string,
  potencia: number,
  nivel: number,
): [number, DefObjeto] {
  return [id, { nombre, tipo: 'herramienta', color, maxPila: 1, potencia, nivel }];
}

function espada(
  id: number,
  nombre: string,
  color: string,
  dano: number,
  cadencia: number,
  alcance: number,
): [number, DefObjeto] {
  return [id, { nombre, tipo: 'arma', color, maxPila: 1, dano, cadencia, alcance }];
}

/**
 * Comida. La cruda sacia poco y no cura: pasar por el horno es lo que hace que
 * el horno siga sirviendo para algo después de fundir el último lingote.
 */
function comida(
  id: number,
  nombre: string,
  color: string,
  saciedad: number,
  curacion: number,
): [number, DefObjeto] {
  return [id, { nombre, tipo: 'comida', color, maxPila: 99, saciedad, curacion }];
}

/**
 * Una poción.
 *
 * Se bebe con el clic derecho como la comida, pero no llena el estómago: son
 * dos recursos distintos a propósito. Si las pociones saciaran, la partida se
 * jugaría bebiendo y el hambre —que existe para obligar a cocinar y a cultivar—
 * dejaría de pintar nada.
 */
function pocion(
  id: number,
  nombre: string,
  color: string,
  extra: Partial<DefObjeto> = {},
): [number, DefObjeto] {
  return [id, { nombre, tipo: 'pocion', color, maxPila: 12, ...extra }];
}

/**
 * Una reliquia de bioma: no se apila mucho porque solo hace falta una de cada.
 */
function reliquiaBioma(id: number, nombre: string, color: string): [number, DefObjeto] {
  return [id, { nombre, tipo: 'trofeo', color, maxPila: 8 }];
}

/**
 * Un ídolo de invocación. A qué jefe llama lo dice `world/jefes`, no el
 * catálogo: aquí solo vive el objeto, y así el catálogo de objetos no tiene que
 * saber que existen los enemigos.
 */
function idolo(id: number, nombre: string, color: string): [number, DefObjeto] {
  return [id, { nombre, tipo: 'invocador', color, maxPila: 4 }];
}

/** Un trofeo de jefe. Uno por jefe y no se apila con nada. */
function trofeo(id: number, nombre: string, color: string): [number, DefObjeto] {
  return [id, { nombre, tipo: 'trofeo', color, maxPila: 20 }];
}

/**
 * Una espada de jefe.
 *
 * Los seis números son idénticos y lo único que cambia es el filo. Iguales a
 * propósito: si una pegara más que otra, cinco de los seis jefes sobrarían y el
 * juego volvería a tener un orden obligatorio.
 *
 * Y pegan **menos** que la de infernita y menos que la del guardián. Lo que se
 * paga por ellas no es el número sino la inscripción, y si además fueran las
 * que más pegan, la escalera de metales entera —que cuesta bajar al inframundo
 * y fundir— se quedaría sin sentido de golpe. Lo que ganan es alcance: son las
 * que llegan más lejos del juego, y eso sí se nota al cogerlas.
 */
function espadaJefe(
  id: number,
  nombre: string,
  color: string,
  filo: ClaseFilo,
): [number, DefObjeto] {
  return [
    id,
    { nombre, tipo: 'arma', color, maxPila: 1, dano: 36, cadencia: 22, alcance: 54, filo },
  ];
}

/**
 * Un peto de jefe: defiende entre el de titanio y el de infernita, y trae un
 * poder atado a la tecla. Lo que se paga es el poder; si además fuera el que
 * más defiende, la armadura de infernita no serviría para nada.
 */
function petoJefe(
  id: number,
  nombre: string,
  color: string,
  poder: ClasePoder,
  represalia: ClaseRepresalia,
): [number, DefObjeto] {
  return [
    id,
    {
      nombre,
      tipo: 'armadura',
      color,
      maxPila: 1,
      hueco: 'torso',
      defensa: 12,
      poder,
      represalia,
    },
  ];
}

/**
 * Unos guantes de élite: defensa simbólica y una represalia grabada.
 *
 * No traen poder de tecla. El poder es la firma del peto de un jefe, que cuesta
 * matarlo y forjarlo; lo de una élite es lo que hacía ella, y eso pasa solo.
 * Tampoco traen filo: los filos son de las seis espadas de jefe, y repartirlos
 * entre lo que suelta cualquier élite de la noche dejaría a esas seis espadas
 * sin ninguna razón para existir.
 */
function guanteElite(
  id: number,
  nombre: string,
  color: string,
  represalia: ClaseRepresalia,
): [number, DefObjeto] {
  return [
    id,
    { nombre, tipo: 'armadura', color, maxPila: 1, hueco: 'manos', defensa: 2, represalia },
  ];
}

/**
 * Una pieza de armadura.
 *
 * El peto defiende casi el doble que el casco y las grebas quedan en medio: es
 * el reparto clásico y hace que, con material justo, la primera pieza que
 * merece la pena forjar sea la del pecho.
 */
function armadura(
  id: number,
  nombre: string,
  color: string,
  hueco: Hueco,
  defensa: number,
): [number, DefObjeto] {
  return [id, { nombre, tipo: 'armadura', color, maxPila: 1, hueco, defensa }];
}

/** Los tres nombres y sus defensas relativas, iguales en los cuatro metales. */
const PIEZAS: readonly [string, Hueco, number][] = [
  ['casco', 'cabeza', 1],
  ['peto', 'torso', 1.8],
  ['grebas', 'piernas', 1.3],
  // Botas y guantes defienden poco: son las piezas de remate, las que se
  // forjan cuando ya sobra metal, no las que deciden si sobrevives.
  ['botas', 'pies', 0.7],
  ['guantes', 'manos', 0.6],
];

/** Un juego completo de armadura de un metal. */
function juegoArmadura(
  ids: readonly number[],
  metal: string,
  color: string,
  base: number,
): [number, DefObjeto][] {
  return PIEZAS.map(([nombre, hueco, peso], i) =>
    armadura(ids[i]!, `${nombre} de ${metal}`, color, hueco, Math.round(base * peso)),
  );
}

const ENTRADAS: [number, DefObjeto][] = [
  [NADA, { nombre: 'nada', tipo: 'material', color: '#000000', maxPila: 0 }],
  deTile(TIERRA),
  deTile(HIERBA),
  deTile(PIEDRA),
  deTile(MADERA),
  deTile(PLATAFORMA),
  // Los minerales en bruto no se colocan: hay que fundirlos.
  deTile(COBRE, 'material'),
  deTile(HIERRO, 'material'),
  deTile(PLATA, 'material'),
  deTile(ORO, 'material'),
  deTile(TRONCO),
  deTile(HOJAS),
  deTile(ANTORCHA),
  deTile(MESA),
  deTile(HORNO),
  deTile(YUNQUE),
  deTile(COFRE),
  lingote(LINGOTE_COBRE, 'lingote de cobre', '#c98352'),
  lingote(LINGOTE_HIERRO, 'lingote de hierro', '#b6aca0'),
  lingote(LINGOTE_PLATA, 'lingote de plata', '#d6dee8'),
  lingote(LINGOTE_ORO, 'lingote de oro', '#eec84a'),
  pico(PICO_MADERA, 'pico de madera', '#8a5f33', 55, 1),
  pico(PICO_PIEDRA, 'pico de piedra', '#8d8d97', 85, 2),
  pico(PICO_COBRE, 'pico de cobre', '#b06a3b', 100, 3),
  pico(PICO_HIERRO, 'pico de hierro', '#a3968a', 160, 4),
  pico(PICO_PLATA, 'pico de plata', '#c2ccd6', 220, 5),
  pico(PICO_ORO, 'pico de oro', '#dcb13a', 300, 6),
  lingote(GEL, 'gel', '#79c8e0'),
  lingote(HUESO, 'hueso', '#e2ddcb'),
  // Más daño cuesta más lentitud: una espada de hierro pega fuerte pero se
  // recupera despacio, y eso obliga a medir cuándo entrar.
  espada(ESPADA_MADERA, 'espada de madera', '#8a5f33', 12, 26, 34),
  espada(ESPADA_PIEDRA, 'espada de piedra', '#8d8d97', 15, 27, 36),
  espada(ESPADA_COBRE, 'espada de cobre', '#b06a3b', 18, 28, 38),
  espada(ESPADA_HIERRO, 'espada de hierro', '#a3968a', 26, 32, 42),
  deTile(ARENA),
  deTile(ARENISCA),
  deTile(CACTUS),
  deTile(NIEVE),
  deTile(HIELO),
  deTile(CANA),
  deTile(BARRO),
  deTile(HIERBA_JUNGLA),
  deTile(TRONCO_JUNGLA),
  deTile(HOJAS_JUNGLA),
  deTile(TRONCO_ABEDUL),
  deTile(HOJAS_PINO),
  deTile(GRAVA),
  deTile(OBSIDIANA),
  deTile(ROCA_INFERNAL),
  deTile(LIANA),
  // El ladrillo infernal y los pinchos existían como tile desde 6.2.0 y 6.3.0
  // pero no como objeto, así que picarlos soltaba un identificador que no estaba
  // en el catálogo: el drop nacía roto y se perdía. Ahora se recogen, que además
  // es el premio de verdad de reventar una fortaleza del inframundo —su
  // material es el más duro que se puede colocar— y las trampas se pueden
  // recolocar donde uno quiera.
  deTile(LADRILLO_INFERNAL),
  deTile(PINCHOS),
  // Los minerales nuevos, en bruto: se funden como los de siempre. El carbón
  // no: se usa tal cual, y por eso es el único que no tiene lingote.
  deTile(CARBON, 'material'),
  deTile(COBALTO, 'material'),
  deTile(TITANIO, 'material'),
  deTile(INFERNITA, 'material'),
  lingote(LINGOTE_COBALTO, 'lingote de cobalto', '#3f7fc4'),
  lingote(LINGOTE_TITANIO, 'lingote de titanio', '#c8d0d8'),
  lingote(LINGOTE_INFERNITA, 'lingote de infernita', '#e0552a'),
  pico(PICO_COBALTO, 'pico de cobalto', '#3f7fc4', 380, 7),
  pico(PICO_TITANIO, 'pico de titanio', '#c8d0d8', 470, 8),
  pico(PICO_INFERNITA, 'pico de infernita', '#e0552a', 620, 9),
  // Las tres espadas se meten entre la de hierro y la del guardián, que sigue
  // siendo la mejor: lo que se gana peleando no lo puede igualar la minería.
  espada(ESPADA_COBALTO, 'espada de cobalto', '#3f7fc4', 30, 30, 44),
  espada(ESPADA_TITANIO, 'espada de titanio', '#c8d0d8', 34, 30, 46),
  espada(ESPADA_INFERNITA, 'espada de infernita', '#e0552a', 38, 31, 48),
  // El vidrio no es un tile del generador: solo existe si alguien funde arena,
  // así que se declara aquí con su propio nombre en vez de salir de `deTile`.
  [
    VIDRIO,
    { nombre: 'vidrio', tipo: 'bloque', color: '#bcd8e4', maxPila: PILA, tile: VIDRIO_TILE },
  ],
  // Los cubos no se apilan: llevar diez cubos de agua sería llevar un lago en
  // el bolsillo, y el viaje de ida y vuelta hasta el líquido es justo lo que
  // hace que mover agua cueste algo.
  [CUBO, { nombre: 'cubo vacío', tipo: 'cubo', color: '#9aa4ad', maxPila: 1 }],
  [CUBO_AGUA, { nombre: 'cubo de agua', tipo: 'cubo', color: '#2f6fb5', maxPila: 1 }],
  [CUBO_LAVA, { nombre: 'cubo de lava', tipo: 'cubo', color: '#d84a1b', maxPila: 1 }],
  comida(CARNE_CRUDA, 'carne cruda', '#c2504f', 18, 0),
  comida(CARNE_ASADA, 'carne asada', '#9b5a2c', 42, 14),
  comida(BAYAS, 'bayas', '#c23a5e', 12, 3),
  // El cristal de vida no se coloca de vuelta: se consume. Si se pudiera poner
  // y volver a picar sería una fuente infinita de vida máxima.
  [
    CRISTAL,
    { nombre: 'cristal de vida', tipo: 'cristal', color: '#e0538f', maxPila: 99 },
  ],
  // La armadura sube despacio a propósito: el juego entero de oro descuenta
  // catorce de cada golpe, que ante un zombi de dieciocho es mucho pero no lo
  // vuelve inofensivo. Una armadura que anula el daño convierte el combate en
  // un trámite y la exploración en un paseo.
  ...juegoArmadura(
    [CASCO_COBRE, PETO_COBRE, GREBAS_COBRE, BOTAS_COBRE, GUANTES_COBRE],
    'cobre',
    '#b06a3b',
    1,
  ),
  ...juegoArmadura(
    [CASCO_HIERRO, PETO_HIERRO, GREBAS_HIERRO, BOTAS_HIERRO, GUANTES_HIERRO],
    'hierro',
    '#a3968a',
    2,
  ),
  ...juegoArmadura(
    [CASCO_PLATA, PETO_PLATA, GREBAS_PLATA, BOTAS_PLATA, GUANTES_PLATA],
    'plata',
    '#c2ccd6',
    3,
  ),
  ...juegoArmadura(
    [CASCO_ORO, PETO_ORO, GREBAS_ORO, BOTAS_ORO, GUANTES_ORO],
    'oro',
    '#dcb13a',
    4,
  ),
  // Y los tres metales del subsuelo profundo. Siguen la misma escalera de uno
  // en uno: el juego entero de infernita descuenta treinta y ocho de cada
  // golpe, que ante el mandoble del guardián —treinta y cuatro— parecería
  // inmunidad si no fuera por el suelo del 25 % que nada puede bajar. Con él, el
  // jefe sigue quitando nueve por golpe a alguien vestido de infernita: se nota
  // muchísimo la armadura y aun así hay que pelear.
  ...juegoArmadura(
    [CASCO_COBALTO, PETO_COBALTO, GREBAS_COBALTO, BOTAS_COBALTO, GUANTES_COBALTO],
    'cobalto',
    '#3f7fc4',
    5,
  ),
  ...juegoArmadura(
    [CASCO_TITANIO, PETO_TITANIO, GREBAS_TITANIO, BOTAS_TITANIO, GUANTES_TITANIO],
    'titanio',
    '#c8d0d8',
    6,
  ),
  ...juegoArmadura(
    [CASCO_INFERNITA, PETO_INFERNITA, GREBAS_INFERNITA, BOTAS_INFERNITA, GUANTES_INFERNITA],
    'infernita',
    '#e0552a',
    7,
  ),
  // Los bloques de metal se colocan y se pican como cualquier otro bloque, así
  // que salen de la tabla de tiles sin nada especial.
  ...BLOQUES_METAL.map((id) => deTile(id)),
  // La instalación eléctrica. Los dos tiles encendidos no son objetos: picar una
  // bombilla encendida devuelve una bombilla, y ya se encenderá sola donde le
  // llegue corriente. Tenerlos en el zurrón como cosas aparte sería llevar dos
  // bombillas distintas que en realidad son la misma.
  deTile(CABLE),
  deTile(BOMBILLA),
  deTile(BATERIA),
  deTile(INTERRUPTOR),
  [
    POLVORA,
    { nombre: 'pólvora', tipo: 'material', color: '#4a4a52', maxPila: PILA },
  ],
  // Las dos se apilan menos que un material normal: llevar noventa y nueve
  // dinamitas encima convierte cualquier montaña en un rato de clics.
  [
    BOMBA,
    { nombre: 'bomba', tipo: 'explosivo', color: '#3a3a42', maxPila: 30, velocidad: 8 },
  ],
  [
    DINAMITA,
    { nombre: 'dinamita', tipo: 'explosivo', color: '#b5342a', maxPila: 20, velocidad: 7 },
  ],
  deTile(CALDERO),
  [
    FRASCO,
    { nombre: 'frasco', tipo: 'material', color: '#b8d8e0', maxPila: 99 },
  ],
  // Las pociones se apilan poco. Es lo que las mantiene siendo una decisión:
  // con noventa y nueve encima, beber fuerza dejaría de ser "me la gasto ahora"
  // para ser el estado normal del personaje, y entonces valdría más subirle el
  // daño a la espada y quitar la poción.
  pocion(POCION_VIDA, 'poción de vida', '#e0538f', { curacion: 45 }),
  pocion(POCION_REGENERACION, 'poción de regeneración', '#e08fb8', {
    efecto: 'regeneracion',
    duracion: DURACION.pocionCorta,
  }),
  pocion(POCION_FUERZA, 'poción de fuerza', '#e8b33c', {
    efecto: 'fuerza',
    duracion: DURACION.pocion,
  }),
  pocion(POCION_PIEDRA, 'poción de piel de piedra', '#9b9b93', {
    efecto: 'pielDePiedra',
    duracion: DURACION.pocion,
  }),
  pocion(POCION_LIGEREZA, 'poción de ligereza', '#a7e8c0', {
    efecto: 'ligereza',
    duracion: DURACION.pocion,
  }),
  pocion(POCION_REMEDIO, 'poción de remedio', '#7fbf4a', { limpia: true }),
  // Los seis ídolos. Se gastan al usarlos, así que se apilan poco: llevar diez
  // encima no serviría de nada más que para invocar diez veces seguidas.
  idolo(IDOLO_PRADERA, 'ídolo de la pradera', '#6fbf4a'),
  idolo(IDOLO_DESIERTO, 'ídolo del desierto', '#d8b96a'),
  idolo(IDOLO_NIEVE, 'ídolo helado', '#a8e0f5'),
  idolo(IDOLO_JUNGLA, 'ídolo de la selva', '#4a9b5a'),
  idolo(IDOLO_CUEVA, 'ídolo de la caverna', '#8a8a95'),
  idolo(IDOLO_INFIERNO, 'ídolo infernal', '#e0542a'),
  // Y los seis trofeos.
  trofeo(TROFEO_PRADERA, 'corona de limo', '#7fd15a'),
  trofeo(TROFEO_DESIERTO, 'caparazón de la reina', '#e0c070'),
  trofeo(TROFEO_NIEVE, 'colmillo de escarcha', '#cfeaf8'),
  trofeo(TROFEO_JUNGLA, 'ojo de la madre', '#6ab84a'),
  trofeo(TROFEO_CUEVA, 'mandíbula del devorador', '#b8b2a0'),
  trofeo(TROFEO_INFIERNO, 'corazón de brasa', '#ff6a28'),
  // --- Las seis espadas de bioma -------------------------------------------
  //
  // Pegan todas parecido, y por encima de la del guardián pero por debajo de la
  // de infernita: lo que las separa no es el daño sino el filo, y si además
  // fueran las que más pegan, la escalera de metales de 5.0.0 dejaría de tener
  // sentido de golpe.
  espadaJefe(ESPADA_LIMO, 'espada de limo', '#5ad07a', 'savia'),
  espadaJefe(ESPADA_ARENA, 'alfanje de arena', '#e0b45a', 'doble'),
  espadaJefe(ESPADA_ESCARCHA, 'espada de escarcha', '#a8e0f5', 'escarcha'),
  espadaJefe(ESPADA_SELVA, 'guadaña de la selva', '#4f9b3a', 'ponzona'),
  espadaJefe(ESPADA_CAVERNA, 'mandoble de la caverna', '#b8b2a0', 'veta'),
  espadaJefe(ESPADA_BRASA, 'espada de brasa', '#ff7a3a', 'brasa'),
  // --- Y los seis petos -----------------------------------------------------
  //
  // Defienden como el de titanio, ni más ni menos: lo que se paga por ellos es
  // el poder, no la defensa. Un peto de jefe que además fuera el que más
  // defiende haría que la armadura de infernita —que cuesta bajar al inframundo
  // y fundir quince lingotes— no sirviera para nada.
  petoJefe(PETO_LIMO, 'peto de limo', '#5ad07a', 'brote', 'savia'),
  petoJefe(PETO_ARENA, 'peto de arena', '#e0b45a', 'muroDeArena', 'costra'),
  petoJefe(PETO_ESCARCHA, 'peto de escarcha', '#a8e0f5', 'ondaGelida', 'escarcha'),
  petoJefe(PETO_SELVA, 'peto de la selva', '#4f9b3a', 'esporas', 'ponzona'),
  petoJefe(PETO_CAVERNA, 'peto de la caverna', '#b8b2a0', 'zancada', 'pinchos'),
  petoJefe(PETO_BRASA, 'peto de brasa', '#ff7a3a', 'bolaDeFuego', 'brasa'),
  // --- Las seis reliquias y el botín del final (7.2.0) ---------------------
  // --- Los seis guantes de élite (7.10.0) ---------------------------------
  guanteElite(GUANTES_PONZONA, 'guantes de ponzoña', '#7fc24a', 'ponzona'),
  guanteElite(GUANTES_ESCARCHA, 'guantes de escarcha', '#b8e6f8', 'escarcha'),
  guanteElite(GUANTES_BRASA, 'guantes de brasa', '#ff8a3a', 'brasa'),
  guanteElite(GUANTES_ESQUIRLA, 'guantes de esquirlas', '#d8d2c4', 'pinchos'),
  guanteElite(GUANTES_SAVIA, 'guantes de savia', '#6ad08a', 'savia'),
  guanteElite(GUANTES_COSTRA, 'guantes de costra', '#c8a870', 'costra'),
  reliquiaBioma(RELIQUIA_PRADERA, 'reliquia de la pradera', '#7fd15a'),
  reliquiaBioma(RELIQUIA_DESIERTO, 'reliquia del desierto', '#e0c070'),
  reliquiaBioma(RELIQUIA_NIEVE, 'reliquia helada', '#cfeaf8'),
  reliquiaBioma(RELIQUIA_JUNGLA, 'reliquia de la selva', '#6ab84a'),
  reliquiaBioma(RELIQUIA_CUEVA, 'reliquia de la caverna', '#b8b2a0'),
  reliquiaBioma(RELIQUIA_INFIERNO, 'reliquia infernal', '#ff6a28'),
  [
    // La mejor arma del juego, y la única que no se fabrica: se recoge del
    // suelo cuando cae lo que hay al final. Un arma que se forja tiene precio;
    // esta tiene requisito, que es otra cosa.
    ESPADA_VERDADERA,
    {
      nombre: 'espada del guardián verdadero',
      tipo: 'arma',
      color: '#f0e6ff',
      maxPila: 1,
      dano: 58,
      cadencia: 20,
      alcance: 58,
    },
  ],
  trofeo(CORONA_ROTA, 'corona rota', '#c7a2f5'),
  pocion(POCION_AGALLAS, 'poción de agallas', '#6fc4e0', {
    efecto: 'agallas',
    duracion: DURACION.pocion,
  }),
  pocion(POCION_BRIO, 'poción de brío', '#e8b04a', {
    efecto: 'brio',
    duracion: DURACION.pocion,
  }),
  // Las seis placas de trofeo. Son bloques, así que se cuelgan y se recuperan
  // como cualquier otro: nadie quiere perder el trofeo por haberlo puesto mal.
  ...PLACAS.map((p) => deTile(p)),
  // La pala cava tierra, arena y nieve al triple que el pico de hierro, y con
  // la piedra apenas puede: es una herramienta de mover terreno, no de minar.
  [
    PALA_HIERRO,
    {
      nombre: 'pala de hierro',
      tipo: 'herramienta',
      color: '#9aa6b2',
      maxPila: 1,
      potencia: 420,
      nivel: 1,
      pala: true,
    },
  ],
  // La azada no rompe nada: convierte hierba y tierra en tierra labrada.
  [
    AZADA,
    {
      nombre: 'azada',
      tipo: 'herramienta',
      color: '#7d6a4a',
      maxPila: 1,
      potencia: 0,
      nivel: 0,
      azada: true,
    },
  ],
  // El arco pega menos por flechazo que la espada de piedra por mandoble, pero
  // dispara desde lejos. Lo que lo equilibra no es el daño sino la munición:
  // sin flechas es un palo, y las flechas hay que fabricarlas.
  [
    ARCO,
    {
      nombre: 'arco',
      tipo: 'arco',
      color: '#8a5f33',
      maxPila: 1,
      dano: 14,
      cadencia: 24,
      municion: FLECHA,
      velocidad: 9.5,
    },
  ],
  [FLECHA, { nombre: 'flecha', tipo: 'municion', color: '#b8a882', maxPila: PILA }],

  // --- La escalera de arcos (5.4.0) ---
  //
  // Cada uno pega más y dispara antes que el anterior, y sobre todo lanza más
  // rápido: la velocidad de salida es lo que decide si hay que apuntar por
  // encima del bicho o directamente a él, y es la mejora que más se nota
  // disparando aunque no salga en ningún número de la ficha.
  [
    ARCO_CAZA,
    {
      nombre: 'arco de caza',
      tipo: 'arco',
      color: '#9a7a4a',
      maxPila: 1,
      dano: 20,
      cadencia: 20,
      municion: FLECHA,
      velocidad: 12,
    },
  ],
  [
    ARCO_COBALTO,
    {
      nombre: 'arco de cobalto',
      tipo: 'arco',
      color: '#3f6fd8',
      maxPila: 1,
      dano: 27,
      cadencia: 17,
      municion: FLECHA,
      velocidad: 14,
    },
  ],
  [
    ARCO_INFERNAL,
    {
      nombre: 'arco infernal',
      tipo: 'arco',
      color: '#e05a28',
      maxPila: 1,
      dano: 36,
      cadencia: 14,
      municion: FLECHA,
      velocidad: 16.5,
    },
  ],

  // --- Las tres puntas ---
  //
  // Ninguna es "la flecha buena": la de pedernal sube el daño y ya, la de hueso
  // cruza una fila de bichos y la de fuego reparte en un círculo. Contra un
  // enemigo suelto gana el pedernal; en un pasillo, el hueso; contra un grupo,
  // el fuego. Eso es lo que se quería, y no tres números en escalera.
  [
    FLECHA_HIERRO,
    {
      nombre: 'flecha de hierro',
      tipo: 'municion',
      color: '#9aa3ad',
      maxPila: PILA,
      danoExtra: 6,
    },
  ],
  [
    FLECHA_HUESO,
    {
      nombre: 'flecha de hueso',
      tipo: 'municion',
      color: '#e4dfcc',
      maxPila: PILA,
      danoExtra: 9,
      perfora: 2,
    },
  ],
  [
    FLECHA_FUEGO,
    {
      nombre: 'flecha de fuego',
      tipo: 'municion',
      color: '#ff8a3a',
      maxPila: PILA,
      danoExtra: 7,
      estalla: 2.2,
      // Desde 6.9.0 además prende: el estallido reparte de golpe y la quemadura
      // sigue cobrando mientras el bicho viene. Es lo que la separa de la de
      // hueso cuando el objetivo es uno solo y gordo.
      efecto: 'ardiendo',
      duracion: DURACION.ataque,
    },
  ],
  lingote(PAPEL, 'papel', '#e6e0cc'),
  lingote(PEDERNAL, 'pedernal', '#5a5f68'),
  lingote(PLUMA, 'pluma', '#e8e4d8'),
  lingote(TRIGO, 'trigo', '#d8c855'),
  // Las semillas no son comida ni bloque: son su propio tipo, porque lo que
  // hacen —plantar sobre tierra labrada— no lo hace nada más.
  [
    SEMILLAS,
    {
      nombre: 'semillas de trigo',
      tipo: 'semilla',
      color: '#c8bd6a',
      maxPila: PILA,
      siembra: TRIGO_0,
    },
  ],
  [
    SEMILLAS_ZANAHORIA,
    {
      nombre: 'semillas de zanahoria',
      tipo: 'semilla',
      color: '#e08a3a',
      maxPila: PILA,
      siembra: ZANAHORIA_0,
    },
  ],
  deTile(CAMA),
  deTile(BROTE),
  comida(PAN, 'pan', '#c9a163', 40, 8),
  // La zanahoria se come tal cual, sin pasar por el horno: es la comida que
  // arregla una tarde mala sin tener que montar cocina.
  comida(ZANAHORIA_3, 'zanahoria', '#e08a3a', 22, 4),
  deTile(LADRILLO),
  // La reliquia: lo único que sueltan los hostiles y que no sirve para nada
  // salvo para el altar. Al 3 % cae sola mientras se juega, sin obligar a
  // cazar un bicho concreto, y eso es justo lo que se busca: que el día que
  // encuentres la fortaleza ya lleves una encima sin haberla ido a buscar.
  lingote(RELIQUIA, 'reliquia antigua', '#9a6ad2'),
  // La esencia no hace nada todavía y lo dice en su nombre. Está aquí porque
  // el jefe tiene que soltar algo que huela a lo siguiente, y prometerlo con
  // un objeto real es más honesto que prometerlo con un cartel.
  lingote(ESENCIA, 'esencia del guardián (sin uso aún)', '#6fe0d0'),
  // La espada del jefe: la única mejor que la de hierro, y la única que no se
  // fabrica. Pega bastante más y llega más lejos, pero es igual de lenta: si
  // además fuera rápida, todo lo anterior dejaría de tener sentido.
  espada(ESPADA_GUARDIAN, 'espada del guardián', '#a98ae0', 40, 30, 50),
  [
    BRUJULA,
    {
      nombre: 'brújula',
      tipo: 'brujula',
      color: '#c8b07a',
      maxPila: 1,
    },
  ],
  ...MAPAS.map((id, i): [number, DefObjeto] => [
    id,
    {
      nombre: i === MAPAS.length - 1 ? 'mapa del mundo' : `mapa ${i + 1}`,
      tipo: 'mapa',
      color: '#d8c9a0',
      maxPila: 1,
      nivelMapa: i + 1,
    },
  ]),
];

/** Array disperso: hay hueco entre el último tile y el 64, y no pasa nada. */
const MAPA: DefObjeto[] = [];
for (const [id, def] of ENTRADAS) MAPA[id] = def;

export const OBJETOS: readonly DefObjeto[] = MAPA;
/** Todos los ids existentes, para recorrer el catálogo sin tropezar con huecos. */
export const IDS_OBJETO: readonly number[] = ENTRADAS.map(([id]) => id);

export function defObjeto(id: number): DefObjeto {
  return MAPA[id] ?? MAPA[NADA]!;
}

export function esColocable(id: number): boolean {
  return defObjeto(id).tile !== undefined;
}

export function esHerramienta(id: number): boolean {
  return defObjeto(id).tipo === 'herramienta';
}

/** Nivel de la herramienta que se lleva. 0 son las manos. */
export function nivelHerramienta(id: number): number {
  return defObjeto(id).nivel ?? 0;
}

/** Picos por nivel, para poder decir en voz alta cuál falta. */
const PICO_DE_NIVEL: readonly number[] = [
  NADA,
  PICO_MADERA,
  PICO_PIEDRA,
  PICO_COBRE,
  PICO_HIERRO,
  PICO_PLATA,
  PICO_ORO,
  PICO_COBALTO,
  PICO_TITANIO,
  PICO_INFERNITA,
];

/**
 * Nombre del pico más humilde que rompe un tile de este nivel. Se usa en el
 * aviso al fallar: "necesitas un pico de piedra" enseña el siguiente paso,
 * mientras que un cursor rojo sin más solo dice que algo no va.
 */
export function nombrePicoDeNivel(nivel: number): string {
  const id = PICO_DE_NIVEL[Math.min(nivel, PICO_DE_NIVEL.length - 1)] ?? NADA;
  return id === NADA ? 'un pico' : defObjeto(id).nombre;
}

export function esArma(id: number): boolean {
  return defObjeto(id).tipo === 'arma';
}

export function esCubo(id: number): boolean {
  return defObjeto(id).tipo === 'cubo';
}

export function esComida(id: number): boolean {
  return defObjeto(id).tipo === 'comida';
}

export function esCristal(id: number): boolean {
  return defObjeto(id).tipo === 'cristal';
}

/** ¿Es una poción? */
export function esPocion(id: number): boolean {
  return defObjeto(id).tipo === 'pocion';
}

/** ¿Es un ídolo de invocación? */
export function esInvocador(id: number): boolean {
  return defObjeto(id).tipo === 'invocador';
}

/** ¿Es un trofeo de jefe? */
export function esTrofeo(id: number): boolean {
  return defObjeto(id).tipo === 'trofeo';
}

/** El filo grabado en este objeto, o null si no lleva ninguno. */
export function filoDe(id: number): ClaseFilo | null {
  return defObjeto(id).filo ?? null;
}

/** El poder grabado en este objeto, o null. */
export function poderDe(id: number): ClasePoder | null {
  return defObjeto(id).poder ?? null;
}

/** La represalia grabada en este objeto, o null. */
export function represaliaDe(id: number): ClaseRepresalia | null {
  return defObjeto(id).represalia ?? null;
}

/**
 * La inscripción de un objeto en una línea, o cadena vacía si no lleva.
 *
 * Es lo que se lee pasando el ratón por encima, y existe para que se pueda
 * saber qué hace una espada de jefe *antes* de matar al jefe: quien ve la
 * inscripción de la espada de brasa en la lista de recetas ya sabe a qué va.
 */
export function inscripcionDe(id: number): string {
  const d = defObjeto(id);
  if (d.filo !== undefined) return textoFilo(d.filo);
  // Un peto de jefe lleva las dos: la tecla y lo que contesta solo. Se leen
  // seguidas y no se elige una, porque saber solo la mitad de lo que hace una
  // pieza es justo lo que esta línea existe para evitar.
  const renglones: string[] = [];
  if (d.poder !== undefined) renglones.push(textoPoder(d.poder));
  if (d.represalia !== undefined) renglones.push(textoRepresalia(d.represalia));
  return renglones.join(' ');
}

export function esArmadura(id: number): boolean {
  return defObjeto(id).tipo === 'armadura';
}

export function esPala(id: number): boolean {
  return defObjeto(id).pala === true;
}

export function esAzada(id: number): boolean {
  return defObjeto(id).azada === true;
}

export function esSemilla(id: number): boolean {
  return defObjeto(id).tipo === 'semilla';
}

/** Qué cultivo planta esta semilla, o NADA si no es una semilla. */
export function siembraDe(id: number): number {
  return defObjeto(id).siembra ?? NADA;
}

export function esMapa(id: number): boolean {
  return defObjeto(id).tipo === 'mapa';
}

/** ¿Es la brújula? Llevarla encima es lo que enseña dónde están las cosas. */
export function esBrujula(id: number): boolean {
  return defObjeto(id).tipo === 'brujula';
}

/**
 * Hasta dónde ve el mejor mapa de una lista de objetos, en tiles. 0 si no hay
 * ninguno; Infinity si se lleva el del mundo entero.
 */
export function alcanceDeMapa(id: number): number {
  const nivel = defObjeto(id).nivelMapa;
  return nivel === undefined ? 0 : ALCANCE_MAPA[nivel - 1] ?? 0;
}

/** ¿Es un arma a distancia? */
/** ¿Es munición, o sea, algo que un arco puede gastar? */
export function esMunicion(id: number): boolean {
  return defObjeto(id).tipo === 'municion';
}

export function esArco(id: number): boolean {
  return defObjeto(id).tipo === 'arco';
}

/** ¿Es algo que se tira y estalla? */
export function esExplosivo(id: number): boolean {
  return defObjeto(id).tipo === 'explosivo';
}

/** Munición que gasta este arma, o NADA si no gasta ninguna. */
export function municionDe(id: number): number {
  return defObjeto(id).municion ?? NADA;
}

/**
 * Todas las flechas que existen, de la peor a la mejor.
 *
 * El orden es el de la escalera, y se recorre del final al principio para
 * elegir cuál se dispara: el arco gasta siempre la mejor que lleves encima.
 *
 * Se decidió así y no con una ranura de munición aparte porque una ranura es
 * otra caja en la interfaz, otro campo en el guardado y otra cosa que explicar,
 * y lo que compra —guardarte las flechas buenas para luego— no vale eso en un
 * juego donde la munición se fabrica de sobras. La regla "gasta la mejor" se
 * entiende sin que nadie la explique, y quien quiera reservar las de fuego las
 * deja en un cofre.
 */
export const FLECHAS: readonly number[] = [FLECHA, FLECHA_HIERRO, FLECHA_HUESO, FLECHA_FUEGO];

/** Lo que la punta suma al disparo, para que el proyectil no importe items. */
export function puntaDe(id: number): {
  extra: number;
  perfora: number;
  estalla: number;
  color: string;
  efecto?: ClaseEfecto;
  duracionEfecto: number;
} {
  const d = defObjeto(id);
  return {
    extra: d.danoExtra ?? 0,
    perfora: d.perfora ?? 0,
    estalla: d.estalla ?? 0,
    color: d.color,
    ...(d.efecto === undefined ? {} : { efecto: d.efecto }),
    duracionEfecto: d.duracion ?? 0,
  };
}

/** Hueco donde va esta pieza, o null si no es armadura. */
export function huecoDe(id: number): Hueco | null {
  return defObjeto(id).hueco ?? null;
}

/** Defensa que aporta una pieza suelta. */
export function defensaDe(id: number): number {
  return defObjeto(id).defensa ?? 0;
}

export function maxPila(id: number): number {
  return defObjeto(id).maxPila;
}

/**
 * Qué es cada cosa y para qué sirve.
 *
 * Una tabla aparte y no un campo más de `DefObjeto` porque la mayoría de las
 * entradas del catálogo se construyen con funciones —`pico`, `espada`,
 * `juegoArmadura`— y meterles un texto a cada una habría significado pasar
 * veinte descripciones por parámetro para que solo cambiara una palabra.
 *
 * Solo se escribe lo que no se deduce mirando el icono. Un bloque de tierra no
 * necesita que nadie le explique qué es; una pala, un altar o una brújula sí,
 * porque su gracia está en algo que no se ve.
 */
const DESCRIPCIONES: Readonly<Record<number, string>> = {
  [PICO_MADERA]: 'El primer pico. Con él se saca piedra, y con la piedra todo lo demás.',
  [CARBON]: 'Se saca con las manos y está por todas partes. Antorchas baratas.',
  [INFERNITA]: 'Solo existe en el inframundo. Late aunque esté en el zurrón.',
  [LIANA]: 'Cuelga de la techumbre de la selva.',
  [ROCA_INFERNAL]: 'La piedra del inframundo. Alumbra un poco por sí sola.',
  [PALA_HIERRO]: 'Vuela cavando tierra, arena y nieve. Contra la piedra es un desastre.',
  [AZADA]: 'Clic derecho sobre hierba o tierra: la deja labrada para sembrar.',
  [ARCO]: 'Clic izquierdo hacia donde apunte el ratón. Gasta una flecha por disparo.',
  [FLECHA]: 'Munición del arco. Se clava en el terreno y se puede recoger.',
  [ARCO_CAZA]: 'Pega más y dispara antes que el de madera, y la flecha sale más tensa.',
  [ARCO_COBALTO]: 'Casi el doble de daño que el arco de madera, y a más velocidad.',
  [ARCO_INFERNAL]: 'El arco del inframundo. Dispara casi cada dos disparos del de madera.',
  [FLECHA_HIERRO]: 'Punta de metal: seis de daño más. La mejora de todos los días.',
  [FLECHA_HUESO]: 'Atraviesa hasta tres bichos seguidos. Para pasillos y filas.',
  [FLECHA_FUEGO]: 'Estalla al chocar y reparte alrededor. Vale apuntar al suelo de al lado.',
  [CUBO]: 'Recoge y vierte líquidos. La única forma de mover un lago.',
  [CUBO_AGUA]: 'Vertido sobre lava la apaga y deja obsidiana.',
  [CUBO_LAVA]: 'Quema a todo lo que toque, incluido a ti.',
  [CRISTAL]: 'Clic derecho: sube un corazón la vida máxima. Para siempre.',
  [PAPEL]: 'Sale de la caña de azúcar. Es lo que hace falta para los mapas.',
  [PEDERNAL]: 'Salta al cavar grava. Hace flechas mucho mejores.',
  [PLUMA]: 'La sueltan las gallinas. Con ella las flechas vuelan derechas.',
  [SEMILLAS]: 'Se planta sobre tierra labrada. Da trigo.',
  [SEMILLAS_ZANAHORIA]: 'Se planta sobre tierra labrada. Da zanahorias.',
  [TRIGO]: 'Tres en el horno hacen un pan.',
  [GEL]: 'Lo sueltan los slimes. Alarga muchísimo las antorchas.',
  [HUESO]: 'Lo sueltan los muertos que andan. El altar pide cinco.',
  [BRUJULA]:
    'Llevándola encima, la aguja señala la estructura más cercana y el mapa las marca todas.',
  [RELIQUIA]:
    'No sirve para nada salvo para el altar de la fortaleza. La suelta cualquier hostil, de tarde en tarde.',
  [ESENCIA]:
    'Late. No hace nada todavía: está guardada para lo que venga en la próxima actualización.',
  [ESPADA_GUARDIAN]:
    'Forjada con lo que quedó del guardián. Pega más y llega más lejos que ninguna otra.',
  [VIDRIO]: 'Se funde de arena. Deja pasar la luz del sol.',
};

/** Descripciones por tipo, para lo que no tiene una escrita a mano. */
const DESCRIPCION_POR_TIPO: Readonly<Record<TipoObjeto, string>> = {
  bloque: 'Se coloca en el mundo. Clic derecho.',
  herramienta: 'Herramienta. Clic izquierdo para trabajar.',
  arma: 'Clic izquierdo para golpear. El ratón apunta el mandoble.',
  material: 'Material de fabricación.',
  cubo: 'Recoge y vierte líquidos.',
  comida: 'Clic derecho para comer.',
  cristal: 'Clic derecho para usarlo.',
  armadura: 'Se pone en su hueco del inventario.',
  arco: 'Arma a distancia. Gasta munición.',
  municion: 'Munición.',
  mapa: 'Se abre con M. Enseña el terreno de alrededor.',
  semilla: 'Se planta sobre tierra labrada.',
  brujula: 'Señala lo que hay construido en este mundo.',
  explosivo: 'Clic izquierdo para tirarla. Estalla sola, y a ti también te pilla.',
  pocion: 'Clic derecho para beberla.',
  invocador: 'Clic derecho en su bioma: despierta a lo que vive ahí.',
  trofeo: 'Lo que queda de un jefe. Guárdalo.',
};

/** Qué es este objeto, en una frase. */
export function descripcionDe(id: number): string {
  return DESCRIPCIONES[id] ?? DESCRIPCION_POR_TIPO[defObjeto(id).tipo];
}

/**
 * Los números del objeto en una línea.
 *
 * Se genera del catálogo en vez de escribirse: así el día que la espada de
 * hierro pase de 26 a 24 de daño, la ficha no se queda mintiendo.
 */
export function resumenDe(id: number): string {
  const d = defObjeto(id);
  const partes: string[] = [];
  if (d.dano !== undefined) partes.push(`daño ${d.dano}`);
  if (d.alcance !== undefined) partes.push(`alcance ${d.alcance}`);
  if (d.cadencia !== undefined) partes.push(`cada ${(d.cadencia / 60).toFixed(2)} s`);
  if (d.municion !== undefined) partes.push(`gasta ${defObjeto(d.municion).nombre}`);
  if (d.potencia !== undefined && d.potencia > 0) partes.push(`potencia ${d.potencia}`);
  if (d.nivel !== undefined && d.nivel > 0) partes.push(`nivel ${d.nivel}`);
  if (d.defensa !== undefined) partes.push(`defensa ${d.defensa}`);
  if (d.hueco !== undefined) partes.push(d.hueco);
  if (d.saciedad !== undefined && d.saciedad > 0) partes.push(`sacia ${d.saciedad}`);
  if (d.curacion !== undefined && d.curacion > 0) partes.push(`cura ${d.curacion}`);
  if (d.efecto !== undefined) {
    partes.push(`${EFECTOS[d.efecto].nombre} ${Math.round((d.duracion ?? 0) / 60)} s`);
  }
  if (d.limpia === true) partes.push('quita lo malo');
  if (d.nivelMapa !== undefined) {
    const alcance = ALCANCE_MAPA[d.nivelMapa - 1] ?? 0;
    partes.push(Number.isFinite(alcance) ? `${alcance} tiles alrededor` : 'el mundo entero');
  }
  return partes.join(' · ');
}

/**
 * En qué versión apareció cada objeto.
 *
 * Es la última puerta que faltaba. Las recetas y las especies ya decían de
 * cuándo eran, pero los objetos no, y por ahí se colaba todo lo demás: el menú
 * de depuración te daba un mapa en un mundo de 1.4.0, la hierba soltaba
 * semillas en uno de 2.1.0 —las semillas son de 3.2.0— y la espada del
 * guardián se podía llevar a cualquier parte. Un mundo cuya versión solo se
 * respeta mientras nadie la ponga a prueba no es un mundo versionado.
 *
 * Se escribe por versión y no objeto a objeto porque así se lee como lo que es:
 * la lista de lo que trajo cada tanda. Añadir un objeto nuevo es añadirlo a la
 * fila de la versión que lo trae, y un test se encarga de que nadie se olvide.
 */
const OBJETOS_POR_VERSION: readonly (readonly [string, readonly number[]])[] = [
  // Antes de 1.6.0 no había inventario, así que no había objetos: lo que se
  // picaba desaparecía. Esta es la primera hornada, y la antorcha entra aquí
  // aunque el tile sea de 1.5.0 — el bloque existía, el objeto no.
  ['1.6.0', [ANTORCHA, TIERRA, HIERBA, PIEDRA, MADERA, PLATAFORMA, COBRE, HIERRO, PLATA, ORO, TRONCO, HOJAS]],
  [
    '1.7.0',
    [MESA, HORNO, YUNQUE, COFRE, LINGOTE_COBRE, LINGOTE_HIERRO, PICO_MADERA, PICO_COBRE, PICO_HIERRO],
  ],
  ['2.0.0', [GEL, HUESO, ESPADA_MADERA, ESPADA_COBRE, ESPADA_HIERRO]],
  ['2.1.0', [CUBO, CUBO_AGUA, CUBO_LAVA, ARENA, ARENISCA, CACTUS, NIEVE, HIELO]],
  ['2.3.0', [CARNE_CRUDA, CARNE_ASADA, BAYAS]],
  [
    '3.0.0',
    [
      LINGOTE_PLATA, LINGOTE_ORO, PICO_PIEDRA, PICO_PLATA, PICO_ORO, ESPADA_PIEDRA,
      CRISTAL, ARCO, FLECHA, PALA_HIERRO, AZADA, PAPEL, CANA,
      CASCO_COBRE, PETO_COBRE, GREBAS_COBRE,
      CASCO_HIERRO, PETO_HIERRO, GREBAS_HIERRO,
      CASCO_PLATA, PETO_PLATA, GREBAS_PLATA,
      CASCO_ORO, PETO_ORO, GREBAS_ORO,
      ...MAPAS,
    ],
  ],
  [
    '3.1.0',
    [BARRO, HIERBA_JUNGLA, TRONCO_JUNGLA, HOJAS_JUNGLA, TRONCO_ABEDUL, HOJAS_PINO, GRAVA],
  ],
  [
    '3.2.0',
    [
      PEDERNAL, VIDRIO, OBSIDIANA,
      BOTAS_COBRE, GUANTES_COBRE, BOTAS_HIERRO, GUANTES_HIERRO,
      BOTAS_PLATA, GUANTES_PLATA, BOTAS_ORO, GUANTES_ORO,
      SEMILLAS, SEMILLAS_ZANAHORIA, TRIGO, PAN, PLUMA, CAMA, BROTE,
      ZANAHORIA_3, TIERRA_LABRADA,
    ],
  ],
  ['4.0.0', [LADRILLO, RELIQUIA, BRUJULA, ESPADA_GUARDIAN, ESENCIA]],
  [
    '5.0.0',
    [
      CARBON, COBALTO, TITANIO, INFERNITA, ROCA_INFERNAL, LIANA,
      LINGOTE_COBALTO, LINGOTE_TITANIO, LINGOTE_INFERNITA,
      PICO_COBALTO, PICO_TITANIO, PICO_INFERNITA,
      ESPADA_COBALTO, ESPADA_TITANIO, ESPADA_INFERNITA,
    ],
  ],
  [
    '5.4.0',
    [ARCO_CAZA, ARCO_COBALTO, ARCO_INFERNAL, FLECHA_HIERRO, FLECHA_HUESO, FLECHA_FUEGO],
  ],
  ['6.2.0', [LADRILLO_INFERNAL]],
  ['6.3.0', [PINCHOS]],
  [
    '6.4.0',
    [
      CASCO_COBALTO, PETO_COBALTO, GREBAS_COBALTO, BOTAS_COBALTO, GUANTES_COBALTO,
      CASCO_TITANIO, PETO_TITANIO, GREBAS_TITANIO, BOTAS_TITANIO, GUANTES_TITANIO,
      CASCO_INFERNITA, PETO_INFERNITA, GREBAS_INFERNITA, BOTAS_INFERNITA, GUANTES_INFERNITA,
      ...BLOQUES_METAL,
      POLVORA, BOMBA, DINAMITA,
    ],
  ],
  ['6.5.0', [CABLE, BOMBILLA, BATERIA, INTERRUPTOR]],
  [
    '6.9.0',
    [
      CALDERO, FRASCO,
      POCION_VIDA, POCION_REGENERACION, POCION_FUERZA,
      POCION_PIEDRA, POCION_LIGEREZA, POCION_REMEDIO,
    ],
  ],
  [
    '7.0.0',
    [
      IDOLO_PRADERA, IDOLO_DESIERTO, IDOLO_NIEVE,
      IDOLO_JUNGLA, IDOLO_CUEVA, IDOLO_INFIERNO,
      TROFEO_PRADERA, TROFEO_DESIERTO, TROFEO_NIEVE,
      TROFEO_JUNGLA, TROFEO_CUEVA, TROFEO_INFIERNO,
    ],
  ],
  [
    '7.1.0',
    [
      ESPADA_LIMO, ESPADA_ARENA, ESPADA_ESCARCHA,
      ESPADA_SELVA, ESPADA_CAVERNA, ESPADA_BRASA,
      PETO_LIMO, PETO_ARENA, PETO_ESCARCHA,
      PETO_SELVA, PETO_CAVERNA, PETO_BRASA,
    ],
  ],
  [
    '7.2.0',
    [
      RELIQUIA_PRADERA, RELIQUIA_DESIERTO, RELIQUIA_NIEVE,
      RELIQUIA_JUNGLA, RELIQUIA_CUEVA, RELIQUIA_INFIERNO,
      ESPADA_VERDADERA, CORONA_ROTA,
    ],
  ],
  ['7.3.0', [POCION_AGALLAS, POCION_BRIO, ...PLACAS]],
  [
    '7.10.0',
    [
      GUANTES_PONZONA,
      GUANTES_ESCARCHA,
      GUANTES_BRASA,
      GUANTES_ESQUIRLA,
      GUANTES_SAVIA,
      GUANTES_COSTRA,
    ],
  ],
];

/**
 * Versión declarada explícitamente, o null si el objeto no está en la tabla.
 *
 * Existe para el test que vigila la tabla. `versionObjeto` devuelve 1.6.0 para
 * lo que no encuentra, que es lo correcto para el catálogo viejo pero convierte
 * un olvido en un objeto del futuro disponible en el primer mundo del juego: el
 * ladrillo infernal y los pinchos estuvieron así dos versiones.
 */
export function versionDeclarada(id: number): string | null {
  return VERSION_DE_OBJETO.get(id) ?? null;
}

const VERSION_DE_OBJETO = new Map<number, string>();
for (const [v, ids] of OBJETOS_POR_VERSION) {
  for (const id of ids) VERSION_DE_OBJETO.set(id, v);
}

/** Versión en la que apareció este objeto. */
export function versionObjeto(id: number): string {
  return VERSION_DE_OBJETO.get(id) ?? PRIMERA_VERSION_OBJETO;
}

/** La versión con la que nació el inventario: el suelo de todo el catálogo. */
export const PRIMERA_VERSION_OBJETO = '1.6.0';

/** ¿Existía este objeto en esta versión del juego? */
export function objetoExisteEn(id: number, versionMundo: string): boolean {
  if (id === NADA) return true;
  return alMenos(versionMundo, versionObjeto(id));
}

/**
 * El objeto, o nada si en esta versión todavía no se había inventado.
 *
 * Es el filtro que va en cada sitio por el que un objeto entra en el mundo:
 * lo que suelta un bloque, lo que suelta un bicho, el equipo de salida y el
 * menú de depuración. Devolver `NADA` y no lanzar un error es deliberado —
 * romper una mata de hierba en un mundo de 2.1.0 no es un fallo del programa,
 * es que entonces la hierba no daba semillas.
 */
export function filtrarObjeto(id: number, versionMundo: string): number {
  return objetoExisteEn(id, versionMundo) ? id : NADA;
}

/** Traduce un id guardado por una versión anterior del formato. */
export function migrarId(id: number): number {
  return IDS_ANTIGUOS[id] ?? id;
}

/** Dónde empezaban los objetos que no son bloques antes de 6.4.1. */
export const BASE_NO_TILE_VIEJA = 64;

/**
 * Traduce un id guardado con la frontera vieja a la de hoy.
 *
 * Todo lo que no era un tile estaba en 64 y por encima, y se ha ido sesenta y
 * cuatro sitios más arriba en bloque; los que sí son tiles no se han movido, así
 * que se quedan igual. Se aplica **antes** que `migrarId`, porque los tres ids
 * antiguos de los picos —13, 14 y 15— caen en el rango de tiles y esa tabla ya
 * apunta a los valores de hoy: traducirlos después los dejaría bien, y al revés
 * los sumaría dos veces.
 */
export function migrarBase(id: number): number {
  return id >= BASE_NO_TILE_VIEJA ? id + (BASE_NO_TILE - BASE_NO_TILE_VIEJA) : id;
}

/**
 * Con qué probabilidad una palada de grava deja pedernal en vez de grava.
 *
 * Una de cada cuatro: con menos, hacer un puñado de flechas de sílex sería una
 * tarde entera; con más, la grava dejaría de ser un bloque de construcción.
 */
export const PROBABILIDAD_PEDERNAL = 0.25;

/**
 * Con qué probabilidad la hierba suelta semillas en vez de tierra, y las hojas
 * sueltan un brote.
 *
 * Bajas las dos: cavar un prado entero no puede ser la forma normal de
 * conseguir comida, y un bosque que suelta un brote por hoja se replanta solo.
 * Con estas, un rato de segar da para empezar un huerto.
 */
export const PROBABILIDAD_SEMILLA = 0.12;
export const PROBABILIDAD_BROTE = 0.06;

/** Qué suelta un tile al romperse. NADA si no suelta nada. */
export function dropDeTile(tile: number): number {
  switch (tile) {
    case CRISTAL_VIDA:
      return CRISTAL;
    // El altar no se recoge. No es un mueble que se pueda mudar: es el sitio
    // donde despierta el guardián, y si cupiera en el zurrón se acabaría
    // invocando al jefe en el jardín de casa. Romperlo es tirarlo.
    case ALTAR:
      return NADA;
    // Labrar no crea material nuevo: al romperla vuelve tierra.
    case TIERRA_LABRADA:
      return TIERRA;
    // Y encendido o apagado es un estado, no un objeto distinto: lo que se
    // recoge de un cacharro de la instalación es siempre el cacharro apagado.
    case BOMBILLA_ENCENDIDA:
      return BOMBILLA;
    case INTERRUPTOR_ENCENDIDO:
      return INTERRUPTOR;
    // Un cultivo maduro da su fruto; uno a medias, solo la semilla de vuelta.
    case TRIGO_3:
      return TRIGO;
    case ZANAHORIA_3:
      return ZANAHORIA_3;
    case TRIGO_0:
    case TRIGO_1:
    case TRIGO_2:
      return SEMILLAS;
    case ZANAHORIA_0:
    case ZANAHORIA_1:
    case ZANAHORIA_2:
      return SEMILLAS_ZANAHORIA;
    // La grava se desmorona: a veces deja pedernal en vez del bloque.
    case GRAVA:
      return Math.random() < PROBABILIDAD_PEDERNAL ? PEDERNAL : GRAVA;
    case HIERBA:
      if (Math.random() < PROBABILIDAD_SEMILLA) {
        return Math.random() < 0.5 ? SEMILLAS : SEMILLAS_ZANAHORIA;
      }
      return TIERRA;
    // La selva tiene su propio suelo: al romper su hierba sale barro, no tierra.
    case HIERBA_JUNGLA:
      return BARRO;
    // Los tres árboles dan la misma madera. Cambian de aspecto, no de material:
    // partir el árbol de recetas en tres solo obligaría a talar tres bosques
    // para fabricar lo mismo.
    case TRONCO:
    case TRONCO_JUNGLA:
    case TRONCO_ABEDUL:
      return MADERA;
    // Las hojas casi nunca dan nada, pero de vez en cuando sueltan un brote:
    // es lo que hace que talar un bosque no sea talarlo para siempre.
    case HOJAS:
    case HOJAS_JUNGLA:
    case HOJAS_PINO:
      return Math.random() < PROBABILIDAD_BROTE ? BROTE : NADA;
    // La hierba da tierra casi siempre y semillas de vez en cuando. Es la única
    // forma de empezar a cultivar, y por eso está en el bloque más común del
    // mundo en vez de escondida en un cofre.

    // El cactus se lleva como madera del desierto: sirve para lo mismo.
    case CACTUS:
      return MADERA;
    default:
      return tile;
  }
}

/** Qué suelta una pared al picarse. Las paredes vuelven como su bloque. */
export function dropDePared(pared: number): number {
  return dropDeTile(pared);
}
