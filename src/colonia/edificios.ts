/**
 * Catálogo de edificios y árbol de investigación.
 */
import type { Coste, Dir, ItemId, Pila } from './tipos';

export type TipoEdificio =
  | 'muroMadera'
  | 'muroPiedra'
  | 'puerta'
  | 'cama'
  | 'fogata'
  | 'mesaTrabajo'
  | 'mesaInvestigacion'
  | 'horno'
  | 'taladro'
  | 'taladroElectrico'
  | 'cinta'
  | 'insertador'
  | 'cofre'
  | 'generador'
  | 'panelSolar'
  | 'lampara'
  | 'torreta'
  | 'torretaLaser'
  | 'ensambladora'
  | 'faro';

export type Categoria = 'estructura' | 'muebles' | 'produccion' | 'logistica' | 'energia' | 'defensa' | 'especial';

export const CATEGORIAS: { id: Categoria; nombre: string }[] = [
  { id: 'estructura', nombre: 'Estructura' },
  { id: 'muebles', nombre: 'Muebles' },
  { id: 'produccion', nombre: 'Producción' },
  { id: 'logistica', nombre: 'Logística' },
  { id: 'energia', nombre: 'Energía' },
  { id: 'defensa', nombre: 'Defensa' },
  { id: 'especial', nombre: 'Rescate' },
];

export interface DefEdificio {
  id: TipoEdificio;
  nombre: string;
  desc: string;
  cat: Categoria;
  w: number;
  h: number;
  coste: Coste;
  /** Segundos de trabajo de construcción para un constructor medio. */
  trabajo: number;
  hp: number;
  /** Los colonos no pueden atravesarlo. */
  solido: boolean;
  rotable?: boolean;
  tech?: string;
  /** kW que consume trabajando. */
  consumo?: number;
  /** kW que genera a pleno rendimiento. */
  genera?: number;
  /** Contaminación por segundo mientras trabaja. */
  contamina?: number;
  /** Radio de luz en casillas. */
  luz?: number;
  /** Solo en casillas con mineral. */
  sobreMineral?: boolean;
}

const D = (d: DefEdificio): DefEdificio => d;

export const EDIFICIOS: Record<TipoEdificio, DefEdificio> = {
  muroMadera: D({ id: 'muroMadera', nombre: 'Muro de madera', desc: 'Frena a las criaturas mientras lo muerden.', cat: 'estructura', w: 1, h: 1, coste: { madera: 5 }, trabajo: 3, hp: 120, solido: true }),
  muroPiedra: D({ id: 'muroPiedra', nombre: 'Muro de piedra', desc: 'Tres veces más duro que el de madera.', cat: 'estructura', w: 1, h: 1, coste: { piedra: 5 }, trabajo: 5, hp: 400, solido: true, tech: 'defensa' }),
  puerta: D({ id: 'puerta', nombre: 'Puerta', desc: 'Los colonos pasan; las criaturas tienen que romperla.', cat: 'estructura', w: 1, h: 1, coste: { madera: 6 }, trabajo: 3, hp: 150, solido: false }),
  cama: D({ id: 'cama', nombre: 'Cama', desc: 'Dormir en cama descansa más y anima. Cura heridas.', cat: 'muebles', w: 1, h: 1, coste: { madera: 15 }, trabajo: 6, hp: 60, solido: false }),
  lampara: D({ id: 'lampara', nombre: 'Lámpara', desc: 'Luz para la noche. Necesita electricidad.', cat: 'muebles', w: 1, h: 1, coste: { placaHierro: 2, placaCobre: 2 }, trabajo: 2, hp: 30, solido: false, tech: 'electricidad', consumo: 3, luz: 6 }),
  fogata: D({ id: 'fogata', nombre: 'Fogata', desc: 'Cocina bayas y patatas. Da luz.', cat: 'produccion', w: 1, h: 1, coste: { madera: 10 }, trabajo: 3, hp: 50, solido: false, luz: 4, contamina: 0.2 }),
  mesaTrabajo: D({ id: 'mesaTrabajo', nombre: 'Mesa de trabajo', desc: 'Un colono fabrica a mano engranajes, circuitos, munición y ciencia.', cat: 'produccion', w: 2, h: 1, coste: { madera: 20, piedra: 10 }, trabajo: 8, hp: 100, solido: true }),
  mesaInvestigacion: D({ id: 'mesaInvestigacion', nombre: 'Mesa de investigación', desc: 'Donde se investiga. Las tecnologías avanzadas gastan paquetes de ciencia.', cat: 'produccion', w: 2, h: 1, coste: { madera: 20, piedra: 10 }, trabajo: 8, hp: 100, solido: true }),
  horno: D({ id: 'horno', nombre: 'Horno de piedra', desc: 'Funde mineral en placas. Quema carbón o madera.', cat: 'produccion', w: 2, h: 2, coste: { piedra: 12 }, trabajo: 6, hp: 200, solido: true, contamina: 2 }),
  taladro: D({ id: 'taladro', nombre: 'Taladro de combustión', desc: 'Extrae mineral del suelo y lo suelta delante. Quema carbón o madera.', cat: 'produccion', w: 2, h: 2, coste: { engranaje: 3, placaHierro: 3, piedra: 5 }, trabajo: 8, hp: 150, solido: true, rotable: true, contamina: 9, sobreMineral: true }),
  taladroElectrico: D({ id: 'taladroElectrico', nombre: 'Taladro eléctrico', desc: 'Más rápido y no necesita combustible.', cat: 'produccion', w: 2, h: 2, coste: { circuito: 3, engranaje: 5, placaHierro: 10 }, trabajo: 10, hp: 250, solido: true, rotable: true, tech: 'electricidad', consumo: 90, contamina: 6, sobreMineral: true }),
  ensambladora: D({ id: 'ensambladora', nombre: 'Ensambladora', desc: 'Fabrica sola la receta que elijas. Aliméntala con insertadores.', cat: 'produccion', w: 2, h: 2, coste: { circuito: 3, engranaje: 5, placaHierro: 9 }, trabajo: 10, hp: 250, solido: true, tech: 'automatizacion', consumo: 75, contamina: 2 }),
  cinta: D({ id: 'cinta', nombre: 'Cinta transportadora', desc: 'Mueve objetos en la dirección de la flecha. R para girar.', cat: 'logistica', w: 1, h: 1, coste: { engranaje: 1, placaHierro: 1 }, trabajo: 1, hp: 60, solido: false, rotable: true, tech: 'cintas' }),
  insertador: D({ id: 'insertador', nombre: 'Insertador', desc: 'Coge de atrás y deja delante: cintas, cofres, hornos, máquinas.', cat: 'logistica', w: 1, h: 1, coste: { circuito: 1, engranaje: 1, placaHierro: 1 }, trabajo: 1.5, hp: 60, solido: false, rotable: true, tech: 'electricidad', consumo: 13 }),
  cofre: D({ id: 'cofre', nombre: 'Cofre', desc: 'Guarda 16 pilas. Los colonos también lo usan como almacén.', cat: 'logistica', w: 1, h: 1, coste: { madera: 8 }, trabajo: 2, hp: 100, solido: true, tech: 'cintas' }),
  generador: D({ id: 'generador', nombre: 'Generador de vapor', desc: 'Quema carbón o madera y da 200 kW a toda la colonia.', cat: 'energia', w: 2, h: 2, coste: { placaHierro: 10, engranaje: 5, piedra: 10 }, trabajo: 10, hp: 200, solido: true, tech: 'electricidad', genera: 200, contamina: 7 }),
  panelSolar: D({ id: 'panelSolar', nombre: 'Panel solar', desc: '60 kW de día, nada de noche. No contamina.', cat: 'energia', w: 2, h: 2, coste: { placaCobre: 5, placaHierro: 10, circuito: 5 }, trabajo: 8, hp: 120, solido: true, tech: 'solar', genera: 60 }),
  torreta: D({ id: 'torreta', nombre: 'Torreta', desc: 'Dispara cargadores a las criaturas. Hay que llenarla de munición.', cat: 'defensa', w: 1, h: 1, coste: { engranaje: 5, placaHierro: 10, placaCobre: 5 }, trabajo: 6, hp: 300, solido: true, tech: 'defensa' }),
  torretaLaser: D({ id: 'torretaLaser', nombre: 'Torreta láser', desc: 'Sin munición: gasta electricidad al disparar.', cat: 'defensa', w: 2, h: 2, coste: { circuito: 15, placaHierro: 20, engranaje: 10 }, trabajo: 12, hp: 600, solido: true, tech: 'laser', consumo: 120 }),
  faro: D({ id: 'faro', nombre: 'Faro de rescate', desc: 'Llama a una nave. Encendido un día entero con energía, rescata a la colonia: ganas.', cat: 'especial', w: 3, h: 3, coste: { circuito: 60, placaHierro: 80, placaCobre: 40, cienciaVerde: 30 }, trabajo: 60, hp: 1500, solido: true, tech: 'faro', consumo: 300 }),
};

export const LISTA_EDIFICIOS = Object.values(EDIFICIOS);

/** Una orden de fabricación en una estación: «mantener N en el almacén». */
export interface Orden {
  receta: string;
  cantidad: number;
  activa: boolean;
}

export interface EnCinta {
  item: ItemId;
  /** 0 = entra por detrás, 1 = llega al borde de salida. */
  p: number;
}

export interface Edificio {
  id: number;
  tipo: TipoEdificio;
  x: number;
  y: number;
  dir: Dir;
  hp: number;
  construido: boolean;
  /** Materiales que aún faltan por traer al plano. */
  faltan: Coste;
  /** Segundos de trabajo de construcción que quedan. */
  trabajo: number;
  deconstruir: boolean;
  /** Buffer de entrada (máquinas, estaciones, mesa de investigación). */
  entrada: Coste;
  salida: Pila | null;
  /** Segundos de combustión que quedan del último trozo quemado. */
  ardiendo: number;
  /** Combustible guardado. */
  combustible: Pila | null;
  progreso: number;
  receta: string | null;
  /** Trabajó el último tick (para la contaminación, la luz y el dibujo). */
  activo: boolean;
  cinta: EnCinta[];
  mano: ItemId | null;
  fase: number;
  inv: Pila[];
  balas: number;
  cd: number;
  /** Ángulo del cañón, para dibujarlo. */
  apunta: number;
  ordenes: Orden[];
  /** Tiempo encendido (el faro). */
  encendido: number;
}

export function nuevoEdificio(id: number, tipo: TipoEdificio, x: number, y: number, dir: Dir, construido: boolean): Edificio {
  const def = EDIFICIOS[tipo];
  return {
    id,
    tipo,
    x,
    y,
    dir,
    hp: construido ? def.hp : Math.max(1, Math.round(def.hp * 0.1)),
    construido,
    faltan: construido ? {} : { ...def.coste },
    trabajo: construido ? 0 : def.trabajo,
    deconstruir: false,
    entrada: {},
    salida: null,
    ardiendo: 0,
    combustible: null,
    progreso: 0,
    receta: null,
    activo: false,
    cinta: [],
    mano: null,
    fase: 0,
    inv: [],
    balas: 0,
    cd: 0,
    apunta: 0,
    ordenes: ordenesIniciales(tipo),
    encendido: 0,
  };
}

function ordenesIniciales(tipo: TipoEdificio): Orden[] {
  if (tipo === 'fogata') return [{ receta: 'comida', cantidad: 15, activa: true }, { receta: 'comidaPatata', cantidad: 15, activa: true }];
  if (tipo === 'mesaTrabajo')
    return [
      { receta: 'engranaje', cantidad: 10, activa: true },
      { receta: 'circuito', cantidad: 10, activa: false },
      { receta: 'municion', cantidad: 30, activa: false },
      { receta: 'cienciaRoja', cantidad: 10, activa: false },
      { receta: 'cienciaVerde', cantidad: 10, activa: false },
    ];
  if (tipo === 'horno')
    return [
      { receta: 'placaHierro', cantidad: 50, activa: true },
      { receta: 'placaCobre', cantidad: 30, activa: true },
    ];
  return [];
}

/** Casillas que ocupa (en la rotación del edificio, los 2×2 y 3×3 no cambian). */
export function casillas(e: { tipo: TipoEdificio; x: number; y: number }): [number, number][] {
  const d = EDIFICIOS[e.tipo];
  const out: [number, number][] = [];
  for (let j = 0; j < d.h; j++) for (let i = 0; i < d.w; i++) out.push([e.x + i, e.y + j]);
  return out;
}

/** Centro del edificio en coordenadas de casilla (con decimales). */
export function centro(e: { tipo: TipoEdificio; x: number; y: number }): [number, number] {
  const d = EDIFICIOS[e.tipo];
  return [e.x + d.w / 2, e.y + d.h / 2];
}

// ------------------------------------------------------------------ investigación

export interface Tecnologia {
  id: string;
  nombre: string;
  desc: string;
  puntos: number;
  ciencia: Coste;
  requiere: string[];
}

export const TECNOLOGIAS: Tecnologia[] = [
  { id: 'agricultura', nombre: 'Agricultura', desc: 'Zonas de cultivo de patatas.', puntos: 120, ciencia: {}, requiere: [] },
  { id: 'cintas', nombre: 'Cintas transportadoras', desc: 'Cintas y cofres.', puntos: 180, ciencia: {}, requiere: [] },
  { id: 'defensa', nombre: 'Defensa', desc: 'Torretas de munición y muros de piedra.', puntos: 240, ciencia: {}, requiere: [] },
  { id: 'electricidad', nombre: 'Electricidad', desc: 'Generador, insertadores, taladro eléctrico y lámparas.', puntos: 400, ciencia: { cienciaRoja: 10 }, requiere: ['cintas'] },
  { id: 'automatizacion', nombre: 'Automatización', desc: 'Ensambladoras que fabrican solas.', puntos: 500, ciencia: { cienciaRoja: 20 }, requiere: ['electricidad'] },
  { id: 'solar', nombre: 'Energía solar', desc: 'Paneles solares: energía limpia que no atrae a las criaturas.', puntos: 600, ciencia: { cienciaRoja: 30 }, requiere: ['electricidad'] },
  { id: 'logistica', nombre: 'Logística', desc: 'Receta de ciencia verde.', puntos: 600, ciencia: { cienciaRoja: 30 }, requiere: ['automatizacion'] },
  { id: 'laser', nombre: 'Torretas láser', desc: 'Defensa sin munición que tira de la red eléctrica.', puntos: 900, ciencia: { cienciaRoja: 40, cienciaVerde: 30 }, requiere: ['defensa', 'logistica'] },
  { id: 'faro', nombre: 'Faro de rescate', desc: 'El camino a casa.', puntos: 1500, ciencia: { cienciaRoja: 60, cienciaVerde: 60 }, requiere: ['logistica', 'solar'] },
];

export function tecnologia(id: string): Tecnologia | undefined {
  return TECNOLOGIAS.find((t) => t.id === id);
}
