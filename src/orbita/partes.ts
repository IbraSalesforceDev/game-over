/**
 * El catálogo de piezas.
 *
 * Unidades: masa en toneladas, empuje en kN (así kN/t sale directamente en
 * m/s²), par en kN·m, combustible y carga en toneladas, extracción en t/s.
 *
 * Las piezas radiales se montan siempre por pares, una a cada lado de la pieza
 * de la pila que las lleva: los números de la tabla son de **una**.
 */

export type Raza = 'humana' | 'alien';

export type Categoria =
  | 'mando'
  | 'combustible'
  | 'motor'
  | 'estructura'
  | 'mineria'
  | 'energia'
  | 'militar'
  | 'defensa';

export const CATEGORIAS: { id: Categoria; nombre: string }[] = [
  { id: 'mando', nombre: 'Mando' },
  { id: 'combustible', nombre: 'Combustible' },
  { id: 'motor', nombre: 'Motores' },
  { id: 'estructura', nombre: 'Estructura' },
  { id: 'mineria', nombre: 'Minería' },
  { id: 'energia', nombre: 'Energía' },
  { id: 'militar', nombre: 'Armas' },
  { id: 'defensa', nombre: 'Defensa' },
];

export type Forma =
  | 'capsula'
  | 'nucleo'
  | 'sonda'
  | 'tanque'
  | 'vejiga'
  | 'motor'
  | 'motorVacio'
  | 'motorSolido'
  | 'motorGrande'
  | 'desacoplador'
  | 'cono'
  | 'aleta'
  | 'patas'
  | 'paracaidas'
  | 'rueda'
  | 'taladro'
  | 'bodega'
  | 'refineria'
  | 'bateria'
  | 'panel'
  | 'canon'
  | 'misil'
  | 'rayo'
  | 'blindaje'
  | 'escudo'
  | 'defensaPuntual';

export interface Arma {
  tipo: 'bala' | 'misil' | 'rayo';
  /** Por disparo; en los rayos, por segundo. */
  dano: number;
  /** Segundos entre disparos (los rayos lo ignoran). */
  cadencia: number;
  velocidad: number;
  alcance: number;
  /** Por disparo; en los rayos, por segundo. */
  energia: number;
  /** Solo dispara a misiles, sola. */
  antimisil?: boolean;
}

export interface Parte {
  id: string;
  nombre: string;
  desc: string;
  raza: Raza | 'ambas';
  cat: Categoria;
  forma: Forma;
  montaje: 'pila' | 'radial' | 'ambos';
  ancho: number;
  alto: number;
  masa: number;
  coste: number;
  hp: number;
  /** Nodo de tecnología que la desbloquea; `base` = disponible desde el principio. */
  tech: string;
  mando?: boolean;
  combustible?: number;
  empuje?: number;
  ispAtm?: number;
  ispVac?: number;
  solido?: boolean;
  par?: number;
  carga?: number;
  taladro?: number;
  refineria?: number;
  energia?: number;
  generacion?: number;
  arma?: Arma;
  blindaje?: boolean;
  escudo?: { max: number; regen: number; consumo: number };
  paracaidas?: number;
  patas?: boolean;
  /** Reduce la resistencia aerodinámica de la nave entera. */
  aerodinamico?: number;
  /** Par extra mientras hay aire. */
  estabilizador?: number;
}

const P = (p: Parte): Parte => p;

export const PARTES: Parte[] = [
  // ------------------------------------------------------------ mando humano
  P({ id: 'h_alondra', nombre: 'Cápsula Alondra', desc: 'Un tripulante. Ruedas de reacción pequeñas y una bodega de mano.', raza: 'humana', cat: 'mando', forma: 'capsula', montaje: 'pila', ancho: 1.4, alto: 1.5, masa: 0.8, coste: 600, hp: 60, tech: 'base', mando: true, par: 6, carga: 0.1, energia: 40, generacion: 0.5 }),
  P({ id: 'h_condor', nombre: 'Cápsula Cóndor', desc: 'Tres tripulantes, más blindaje y más par.', raza: 'humana', cat: 'mando', forma: 'capsula', montaje: 'pila', ancho: 2.2, alto: 2, masa: 2.2, coste: 2400, hp: 160, tech: 'estructura1', mando: true, par: 18, carga: 0.3, energia: 120, generacion: 1 }),
  P({ id: 'h_oko', nombre: 'Sonda Oko', desc: 'Núcleo robótico ligerísimo. Nadie a bordo, nadie en peligro.', raza: 'humana', cat: 'mando', forma: 'sonda', montaje: 'pila', ancho: 1, alto: 0.6, masa: 0.1, coste: 450, hp: 20, tech: 'energia1', mando: true, par: 1.5, energia: 30, generacion: 0.2 }),
  // ------------------------------------------------------------ mando alien
  P({ id: 'a_simbionte', nombre: 'Núcleo simbionte', desc: 'Un piloto Xyl fundido con la nave. Regenera energía deprisa.', raza: 'alien', cat: 'mando', forma: 'nucleo', montaje: 'pila', ancho: 1.4, alto: 1.5, masa: 0.7, coste: 650, hp: 70, tech: 'base', mando: true, par: 8, carga: 0.1, energia: 60, generacion: 1 }),
  P({ id: 'a_mente', nombre: 'Mente de la Colmena', desc: 'Un nodo de la conciencia colectiva. Mucha energía y par.', raza: 'alien', cat: 'mando', forma: 'nucleo', montaje: 'pila', ancho: 2.2, alto: 2.2, masa: 2, coste: 2600, hp: 180, tech: 'estructura1', mando: true, par: 22, carga: 0.3, energia: 200, generacion: 2 }),
  P({ id: 'a_espora', nombre: 'Espora guía', desc: 'Un fragmento de la Colmena, minúsculo y obediente.', raza: 'alien', cat: 'mando', forma: 'sonda', montaje: 'pila', ancho: 1, alto: 0.6, masa: 0.08, coste: 480, hp: 22, tech: 'energia1', mando: true, par: 1.5, energia: 40, generacion: 0.4 }),

  // ------------------------------------------------------------ combustible
  P({ id: 'h_t100', nombre: 'Tanque T-100', desc: 'Medio tonelada de queroseno y oxígeno.', raza: 'humana', cat: 'combustible', forma: 'tanque', montaje: 'pila', ancho: 1.4, alto: 0.8, masa: 0.06, coste: 150, hp: 30, tech: 'base', combustible: 0.5 }),
  P({ id: 'h_t400', nombre: 'Tanque T-400', desc: 'El tanque de toda la vida.', raza: 'humana', cat: 'combustible', forma: 'tanque', montaje: 'pila', ancho: 1.4, alto: 2.2, masa: 0.25, coste: 500, hp: 50, tech: 'base', combustible: 2 }),
  P({ id: 'h_t800', nombre: 'Tanque T-800', desc: 'El doble de largo.', raza: 'humana', cat: 'combustible', forma: 'tanque', montaje: 'pila', ancho: 1.4, alto: 4, masa: 0.5, coste: 900, hp: 70, tech: 'estructura1', combustible: 4 }),
  P({ id: 'h_x2000', nombre: 'Tanque X-2000', desc: 'Diámetro grande, para lanzadores pesados.', raza: 'humana', cat: 'combustible', forma: 'tanque', montaje: 'pila', ancho: 2.4, alto: 4.2, masa: 1.6, coste: 3200, hp: 140, tech: 'propulsion2', combustible: 14 }),
  P({ id: 'h_jumbo', nombre: 'Tanque Jumbo X-4000', desc: 'Veintiocho toneladas de combustible.', raza: 'humana', cat: 'combustible', forma: 'tanque', montaje: 'pila', ancho: 2.4, alto: 7.5, masa: 3.2, coste: 6000, hp: 220, tech: 'propulsion2', combustible: 28 }),
  P({ id: 'a_vejiga_s', nombre: 'Vejiga de plasma S', desc: 'Una bolsa viva que guarda plasma frío.', raza: 'alien', cat: 'combustible', forma: 'vejiga', montaje: 'pila', ancho: 1.4, alto: 1, masa: 0.08, coste: 200, hp: 34, tech: 'base', combustible: 0.6 }),
  P({ id: 'a_vejiga_m', nombre: 'Vejiga de plasma M', desc: 'El órgano de combustible estándar de la Colmena.', raza: 'alien', cat: 'combustible', forma: 'vejiga', montaje: 'pila', ancho: 1.4, alto: 2.4, masa: 0.3, coste: 650, hp: 56, tech: 'base', combustible: 2.2 }),
  P({ id: 'a_vejiga_l', nombre: 'Vejiga de plasma L', desc: 'Larga y flexible.', raza: 'alien', cat: 'combustible', forma: 'vejiga', montaje: 'pila', ancho: 1.4, alto: 4.2, masa: 0.6, coste: 1200, hp: 78, tech: 'estructura1', combustible: 4.4 }),
  P({ id: 'a_saco', nombre: 'Saco de reserva', desc: 'Un estómago entero lleno de plasma.', raza: 'alien', cat: 'combustible', forma: 'vejiga', montaje: 'pila', ancho: 2.4, alto: 5, masa: 2.2, coste: 4500, hp: 170, tech: 'propulsion2', combustible: 18 }),

  // ------------------------------------------------------------ motores
  P({ id: 'h_saltamontes', nombre: 'Motor Saltamontes LV-70', desc: 'Fiable y barato. Bien en el aire y en el vacío.', raza: 'humana', cat: 'motor', forma: 'motor', montaje: 'pila', ancho: 1.4, alto: 1.2, masa: 0.6, coste: 900, hp: 40, tech: 'base', empuje: 95, ispAtm: 270, ispVac: 315 }),
  P({ id: 'h_martillo', nombre: 'Cohete sólido Martillo', desc: 'Mucho empuje, nada de control: una vez encendido no se apaga.', raza: 'humana', cat: 'motor', forma: 'motorSolido', montaje: 'ambos', ancho: 1, alto: 4, masa: 0.9, coste: 450, hp: 50, tech: 'base', empuje: 230, ispAtm: 175, ispVac: 205, solido: true, combustible: 5 }),
  P({ id: 'h_terrier', nombre: 'Motor de vacío Terrier', desc: 'Inútil en el aire, excelente en órbita.', raza: 'humana', cat: 'motor', forma: 'motorVacio', montaje: 'pila', ancho: 1.4, alto: 1.3, masa: 0.5, coste: 1100, hp: 36, tech: 'propulsion1', empuje: 60, ispAtm: 90, ispVac: 345 }),
  P({ id: 'h_giro', nombre: 'Motor Giro-200', desc: 'El caballo de batalla de las primeras etapas.', raza: 'humana', cat: 'motor', forma: 'motor', montaje: 'pila', ancho: 1.4, alto: 1.8, masa: 1.4, coste: 1600, hp: 60, tech: 'propulsion1', empuje: 220, ispAtm: 260, ispVac: 320 }),
  P({ id: 'h_mamut', nombre: 'Motor Mamut', desc: 'Mil quinientos kilonewtons. Para sacar del suelo lo que haga falta.', raza: 'humana', cat: 'motor', forma: 'motorGrande', montaje: 'pila', ancho: 2.4, alto: 3, masa: 6, coste: 12000, hp: 160, tech: 'propulsion2', empuje: 1500, ispAtm: 285, ispVac: 310 }),
  P({ id: 'h_nerv', nombre: 'Motor nuclear NERV', desc: 'Poco empuje, rendimiento descomunal. Para ir lejos.', raza: 'humana', cat: 'motor', forma: 'motorVacio', montaje: 'pila', ancho: 1.4, alto: 3.4, masa: 3, coste: 14000, hp: 90, tech: 'propulsion3', empuje: 60, ispAtm: 185, ispVac: 800 }),
  P({ id: 'a_pulso', nombre: 'Impulsor de pulso', desc: 'Late como un corazón y empuja como un motor.', raza: 'alien', cat: 'motor', forma: 'motor', montaje: 'pila', ancho: 1.4, alto: 1.2, masa: 0.5, coste: 1100, hp: 42, tech: 'base', empuje: 88, ispAtm: 280, ispVac: 330 }),
  P({ id: 'a_racimo', nombre: 'Racimo de esporas', desc: 'Esporas que estallan en cadena. No se apaga.', raza: 'alien', cat: 'motor', forma: 'motorSolido', montaje: 'ambos', ancho: 1, alto: 3.6, masa: 0.8, coste: 550, hp: 46, tech: 'base', empuje: 200, ispAtm: 180, ispVac: 210, solido: true, combustible: 4.5 }),
  P({ id: 'a_medusa', nombre: 'Medusa de vacío', desc: 'Se abre como una campana en el vacío.', raza: 'alien', cat: 'motor', forma: 'motorVacio', montaje: 'pila', ancho: 1.4, alto: 1.4, masa: 0.45, coste: 1200, hp: 38, tech: 'propulsion1', empuje: 70, ispAtm: 100, ispVac: 360 }),
  P({ id: 'a_latido', nombre: 'Corazón de empuje', desc: 'Un pulso enorme para primeras etapas.', raza: 'alien', cat: 'motor', forma: 'motor', montaje: 'pila', ancho: 1.4, alto: 1.8, masa: 1.3, coste: 1800, hp: 62, tech: 'propulsion1', empuje: 210, ispAtm: 270, ispVac: 325 }),
  P({ id: 'a_gravitico', nombre: 'Impulsor gravítico', desc: 'Dobla el espacio por debajo de la nave.', raza: 'alien', cat: 'motor', forma: 'motorGrande', montaje: 'pila', ancho: 2.4, alto: 2.6, masa: 4, coste: 14000, hp: 150, tech: 'propulsion2', empuje: 1300, ispAtm: 300, ispVac: 330 }),
  P({ id: 'a_ionico', nombre: 'Motor iónico de Colmena', desc: 'Empuja casi nada pero no se cansa nunca.', raza: 'alien', cat: 'motor', forma: 'motorVacio', montaje: 'pila', ancho: 1.4, alto: 1.6, masa: 0.5, coste: 9000, hp: 40, tech: 'propulsion3', empuje: 22, ispAtm: 100, ispVac: 1400 }),

  // ------------------------------------------------------------ estructura (comunes)
  P({ id: 'desacoplador', nombre: 'Desacoplador TD', desc: 'Separa la etapa de abajo al pulsar Espacio.', raza: 'ambas', cat: 'estructura', forma: 'desacoplador', montaje: 'pila', ancho: 1.4, alto: 0.3, masa: 0.05, coste: 100, hp: 30, tech: 'base' }),
  P({ id: 'desacoplador_g', nombre: 'Desacoplador grande', desc: 'Para etapas de 2,4 m.', raza: 'ambas', cat: 'estructura', forma: 'desacoplador', montaje: 'pila', ancho: 2.4, alto: 0.35, masa: 0.2, coste: 300, hp: 60, tech: 'propulsion2' }),
  P({ id: 'cono', nombre: 'Cono aerodinámico', desc: 'Corta el aire: menos resistencia en el ascenso.', raza: 'ambas', cat: 'estructura', forma: 'cono', montaje: 'pila', ancho: 1.4, alto: 1, masa: 0.05, coste: 80, hp: 20, tech: 'base', aerodinamico: 0.6 }),
  P({ id: 'aletas', nombre: 'Aletas estabilizadoras', desc: 'Más control mientras hay aire.', raza: 'ambas', cat: 'estructura', forma: 'aleta', montaje: 'radial', ancho: 0.7, alto: 1.3, masa: 0.04, coste: 120, hp: 15, tech: 'base', estabilizador: 8 }),
  P({ id: 'paracaidas', nombre: 'Paracaídas Mk16', desc: 'Se abre con P. Aterrizar sin él es estrellarse.', raza: 'ambas', cat: 'estructura', forma: 'paracaidas', montaje: 'pila', ancho: 0.9, alto: 0.4, masa: 0.1, coste: 300, hp: 15, tech: 'base', paracaidas: 1600 }),
  P({ id: 'patas', nombre: 'Patas de aterrizaje', desc: 'Aguantan tomas de contacto más bruscas.', raza: 'ambas', cat: 'estructura', forma: 'patas', montaje: 'radial', ancho: 0.6, alto: 1.6, masa: 0.08, coste: 300, hp: 20, tech: 'estructura1', patas: true }),
  P({ id: 'rueda', nombre: 'Rueda de reacción', desc: 'Par de giro sin gastar combustible.', raza: 'ambas', cat: 'estructura', forma: 'rueda', montaje: 'pila', ancho: 1.4, alto: 0.4, masa: 0.15, coste: 600, hp: 25, tech: 'estructura1', par: 20 }),

  // ------------------------------------------------------------ minería
  P({ id: 'h_topo', nombre: 'Taladro Topo', desc: 'Extrae roca de un asteroide cercano y quieto (F).', raza: 'humana', cat: 'mineria', forma: 'taladro', montaje: 'radial', ancho: 0.7, alto: 1.4, masa: 0.25, coste: 700, hp: 30, tech: 'base', taladro: 0.04 }),
  P({ id: 'h_perforadora', nombre: 'Perforadora industrial', desc: 'Cuatro veces más rápida que el Topo.', raza: 'humana', cat: 'mineria', forma: 'taladro', montaje: 'radial', ancho: 1, alto: 2, masa: 1, coste: 3500, hp: 60, tech: 'mineria1', taladro: 0.18 }),
  P({ id: 'h_bodega_s', nombre: 'Bodega de carga S', desc: 'Dos toneladas de mineral.', raza: 'humana', cat: 'mineria', forma: 'bodega', montaje: 'pila', ancho: 1.4, alto: 1.2, masa: 0.25, coste: 400, hp: 40, tech: 'base', carga: 2 }),
  P({ id: 'h_bodega_l', nombre: 'Bodega de carga L', desc: 'Doce toneladas.', raza: 'humana', cat: 'mineria', forma: 'bodega', montaje: 'pila', ancho: 2.4, alto: 2.4, masa: 1.2, coste: 2400, hp: 120, tech: 'mineria1', carga: 12 }),
  P({ id: 'h_refineria', nombre: 'Refinería de hielo', desc: 'Convierte el hielo de la bodega en combustible (G).', raza: 'humana', cat: 'mineria', forma: 'refineria', montaje: 'pila', ancho: 1.4, alto: 1.4, masa: 0.8, coste: 4000, hp: 50, tech: 'mineria2', refineria: 0.05 }),
  P({ id: 'a_garra', nombre: 'Garra extractora', desc: 'Muerde la roca y la traga (F).', raza: 'alien', cat: 'mineria', forma: 'taladro', montaje: 'radial', ancho: 0.7, alto: 1.4, masa: 0.2, coste: 800, hp: 32, tech: 'base', taladro: 0.05 }),
  P({ id: 'a_fauce', nombre: 'Fauce trituradora', desc: 'Una boca de diez metros de dientes.', raza: 'alien', cat: 'mineria', forma: 'taladro', montaje: 'radial', ancho: 1, alto: 2, masa: 1.1, coste: 3800, hp: 64, tech: 'mineria1', taladro: 0.22 }),
  P({ id: 'a_buche_s', nombre: 'Buche de carga', desc: 'Dos toneladas y media.', raza: 'alien', cat: 'mineria', forma: 'bodega', montaje: 'pila', ancho: 1.4, alto: 1.2, masa: 0.3, coste: 450, hp: 44, tech: 'base', carga: 2.5 }),
  P({ id: 'a_buche_l', nombre: 'Gran buche', desc: 'Catorce toneladas.', raza: 'alien', cat: 'mineria', forma: 'bodega', montaje: 'pila', ancho: 2.4, alto: 2.4, masa: 1.4, coste: 2700, hp: 130, tech: 'mineria1', carga: 14 }),
  P({ id: 'a_glandula', nombre: 'Glándula digestora', desc: 'Digiere hielo y lo devuelve como plasma (G).', raza: 'alien', cat: 'mineria', forma: 'refineria', montaje: 'pila', ancho: 1.4, alto: 1.4, masa: 0.7, coste: 4200, hp: 55, tech: 'mineria2', refineria: 0.06 }),

  // ------------------------------------------------------------ energía
  P({ id: 'bateria', nombre: 'Batería Z-200', desc: 'Almacena energía para armas, escudos y taladros.', raza: 'ambas', cat: 'energia', forma: 'bateria', montaje: 'pila', ancho: 1.4, alto: 0.35, masa: 0.05, coste: 250, hp: 15, tech: 'energia1', energia: 200 }),
  P({ id: 'h_panel', nombre: 'Panel solar OX', desc: 'Recarga energía con la luz del sol.', raza: 'humana', cat: 'energia', forma: 'panel', montaje: 'radial', ancho: 0.4, alto: 2.4, masa: 0.03, coste: 400, hp: 8, tech: 'energia1', generacion: 1.2 }),
  P({ id: 'h_rtg', nombre: 'Generador RTG', desc: 'Energía constante, de noche y de día.', raza: 'humana', cat: 'energia', forma: 'bateria', montaje: 'pila', ancho: 1.4, alto: 0.8, masa: 0.08, coste: 3000, hp: 30, tech: 'propulsion3', generacion: 3, energia: 50 }),
  P({ id: 'a_membrana', nombre: 'Membrana fotosintética', desc: 'Se despliega y bebe la luz.', raza: 'alien', cat: 'energia', forma: 'panel', montaje: 'radial', ancho: 0.4, alto: 2.4, masa: 0.03, coste: 420, hp: 10, tech: 'energia1', generacion: 1.5 }),

  // ------------------------------------------------------------ armas
  P({ id: 'h_canon', nombre: 'Cañón automático 30 mm', desc: 'Torreta de proyectiles. Apunta con el ratón, dispara con clic.', raza: 'humana', cat: 'militar', forma: 'canon', montaje: 'radial', ancho: 0.6, alto: 1.4, masa: 0.35, coste: 2500, hp: 40, tech: 'militar1', arma: { tipo: 'bala', dano: 7, cadencia: 0.14, velocidad: 900, alcance: 3200, energia: 0.15 } }),
  P({ id: 'h_halcon', nombre: 'Lanzamisiles Halcón', desc: 'Misiles que persiguen al blanco más cercano al puntero.', raza: 'humana', cat: 'militar', forma: 'misil', montaje: 'radial', ancho: 0.8, alto: 1.8, masa: 0.6, coste: 5000, hp: 45, tech: 'militar2', arma: { tipo: 'misil', dano: 70, cadencia: 2.6, velocidad: 140, alcance: 9000, energia: 2 } }),
  P({ id: 'h_riel', nombre: 'Cañón de riel', desc: 'Un proyectil a 3 km/s. Gasta mucha energía.', raza: 'humana', cat: 'militar', forma: 'canon', montaje: 'radial', ancho: 0.8, alto: 2.6, masa: 1.2, coste: 12000, hp: 60, tech: 'militar3', arma: { tipo: 'bala', dano: 85, cadencia: 1.8, velocidad: 3000, alcance: 9000, energia: 12 } }),
  P({ id: 'a_lanza', nombre: 'Lanza de plasma', desc: 'Un rayo continuo de plasma. Corto alcance, quema todo.', raza: 'alien', cat: 'militar', forma: 'rayo', montaje: 'radial', ancho: 0.6, alto: 1.4, masa: 0.3, coste: 3000, hp: 38, tech: 'militar1', arma: { tipo: 'rayo', dano: 48, cadencia: 0, velocidad: 0, alcance: 2200, energia: 4 } }),
  P({ id: 'a_enjambre', nombre: 'Enjambre de esporas', desc: 'Esporas buscadoras que estallan al contacto.', raza: 'alien', cat: 'militar', forma: 'misil', montaje: 'radial', ancho: 0.8, alto: 1.8, masa: 0.5, coste: 5200, hp: 42, tech: 'militar2', arma: { tipo: 'misil', dano: 48, cadencia: 1.6, velocidad: 160, alcance: 7500, energia: 1.5 } }),
  P({ id: 'a_haz', nombre: 'Haz de antimateria', desc: 'El arma definitiva de la Colmena.', raza: 'alien', cat: 'militar', forma: 'rayo', montaje: 'radial', ancho: 0.8, alto: 2.6, masa: 1, coste: 14000, hp: 55, tech: 'militar3', arma: { tipo: 'rayo', dano: 170, cadencia: 0, velocidad: 0, alcance: 5000, energia: 14 } }),

  // ------------------------------------------------------------ defensa
  P({ id: 'h_placa', nombre: 'Placa de blindaje', desc: 'Acero en capas. Recibe los golpes antes que lo demás.', raza: 'humana', cat: 'defensa', forma: 'blindaje', montaje: 'pila', ancho: 1.4, alto: 0.6, masa: 0.6, coste: 600, hp: 240, tech: 'defensa1', blindaje: true }),
  P({ id: 'h_compuesto', nombre: 'Blindaje compuesto', desc: 'Cerámica y titanio. Para naves de 2,4 m.', raza: 'humana', cat: 'defensa', forma: 'blindaje', montaje: 'pila', ancho: 2.4, alto: 0.8, masa: 1.5, coste: 1800, hp: 650, tech: 'defensa1', blindaje: true }),
  P({ id: 'h_deflector', nombre: 'Deflector magnético', desc: 'Escudo que absorbe daño y se recarga con energía.', raza: 'humana', cat: 'defensa', forma: 'escudo', montaje: 'pila', ancho: 1.4, alto: 0.7, masa: 0.5, coste: 6000, hp: 30, tech: 'defensa2', escudo: { max: 160, regen: 6, consumo: 3 } }),
  P({ id: 'h_pdc', nombre: 'Defensa puntual', desc: 'Derriba misiles enemigos sola.', raza: 'humana', cat: 'defensa', forma: 'defensaPuntual', montaje: 'radial', ancho: 0.5, alto: 0.8, masa: 0.2, coste: 3000, hp: 20, tech: 'defensa2', arma: { tipo: 'bala', dano: 4, cadencia: 0.08, velocidad: 1400, alcance: 1500, energia: 0.05, antimisil: true } }),
  P({ id: 'a_quitina', nombre: 'Caparazón quitinoso', desc: 'Concha viva que se endurece con los golpes.', raza: 'alien', cat: 'defensa', forma: 'blindaje', montaje: 'pila', ancho: 1.4, alto: 0.6, masa: 0.7, coste: 650, hp: 220, tech: 'defensa1', blindaje: true }),
  P({ id: 'a_coraza', nombre: 'Coraza ancestral', desc: 'Una concha de 2,4 m de un ser muy viejo.', raza: 'alien', cat: 'defensa', forma: 'blindaje', montaje: 'pila', ancho: 2.4, alto: 0.8, masa: 1.6, coste: 1900, hp: 600, tech: 'defensa1', blindaje: true }),
  P({ id: 'a_fase', nombre: 'Escudo de fase', desc: 'Desplaza la nave un instante fuera del espacio.', raza: 'alien', cat: 'defensa', forma: 'escudo', montaje: 'pila', ancho: 1.4, alto: 0.7, masa: 0.4, coste: 6000, hp: 30, tech: 'defensa2', escudo: { max: 280, regen: 11, consumo: 4 } }),
  P({ id: 'a_cilios', nombre: 'Cilios defensivos', desc: 'Atrapan misiles al vuelo.', raza: 'alien', cat: 'defensa', forma: 'defensaPuntual', montaje: 'radial', ancho: 0.5, alto: 0.8, masa: 0.18, coste: 3200, hp: 22, tech: 'defensa2', arma: { tipo: 'bala', dano: 4, cadencia: 0.08, velocidad: 1400, alcance: 1500, energia: 0.05, antimisil: true } }),
];

const POR_ID = new Map(PARTES.map((p) => [p.id, p]));

export function parte(id: string): Parte {
  const p = POR_ID.get(id);
  if (!p) throw new Error(`pieza desconocida: ${id}`);
  return p;
}

export function existeParte(id: string): boolean {
  return POR_ID.has(id);
}

export function sirveA(p: Parte, r: Raza): boolean {
  return p.raza === 'ambas' || p.raza === r;
}

export function esRadial(p: Parte): boolean {
  return p.montaje === 'radial' || p.montaje === 'ambos';
}

export function esDePila(p: Parte): boolean {
  return p.montaje === 'pila' || p.montaje === 'ambos';
}

export interface InfoRaza {
  id: Raza;
  nombre: string;
  pueblo: string;
  desc: string;
  ventajas: string[];
  /** Multiplicador del coste de las piezas. */
  costePiezas: number;
  /** Multiplicador de lo que se cobra al vender mineral. */
  venta: number;
  /** Multiplicador de la velocidad de extracción. */
  taladro: number;
  colores: { casco: string; casco2: string; acento: string; oscuro: string; brillo: string; llama: string };
}

export const RAZAS: Record<Raza, InfoRaza> = {
  humana: {
    id: 'humana',
    nombre: 'Unión Terrana',
    pueblo: 'humanos',
    desc: 'Ingenieros testarudos de Gaia. Cohetes de aluminio, cañones y blindaje de acero.',
    ventajas: ['Piezas un 15 % más baratas', 'Venden mineral un 10 % más caro', 'Blindajes más resistentes, armas de proyectil'],
    costePiezas: 0.85,
    venta: 1.1,
    taladro: 1,
    colores: { casco: '#e9ecef', casco2: '#c3c9d1', acento: '#f28c28', oscuro: '#3a4048', brillo: '#9fd3ff', llama: '#ffb347' },
  },
  alien: {
    id: 'alien',
    nombre: 'Colmena Xyl',
    pueblo: 'alienígenas',
    desc: 'Una mente colectiva de Xyl que cultiva sus naves. Rayos de plasma y escudos de fase.',
    ventajas: ['Taladros un 30 % más rápidos', 'Escudos más grandes, armas de energía', 'Su mundo natal tiene menos gravedad'],
    costePiezas: 1,
    venta: 1,
    taladro: 1.3,
    colores: { casco: '#5a2d7a', casco2: '#3e1d57', acento: '#3ff2c0', oscuro: '#1d0f2b', brillo: '#7bffd9', llama: '#b06cff' },
  },
};

export const enemigoDe = (r: Raza): Raza => (r === 'humana' ? 'alien' : 'humana');

export function costeParte(p: Parte, r: Raza): number {
  return Math.round(p.coste * RAZAS[r].costePiezas);
}
