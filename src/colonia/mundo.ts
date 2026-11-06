/**
 * El mundo: mapa, edificios, colonos, criaturas, investigación, energía,
 * contaminación y sucesos. Avanza a ticks fijos (TPS por segundo de juego).
 */
import { type Colono, crearColono, tickColonos } from './colonos';
import { type Criatura, type Nido, crearNido, tickCriaturas } from './criaturas';
import { EDIFICIOS, type Edificio, type TipoEdificio, TECNOLOGIAS, casillas, nuevoEdificio, tecnologia } from './edificios';
import { cantidadEn, puedeColocar, tickMaquinas } from './maquinas';
import { Mapa, Planta, TH, TW, Zona, generar } from './mapa';
import { ALTO, ANCHO, type Coste, type Dir, type ItemId, ITEMS, LISTA_ITEMS, TICKS_DIA, TPS, idx, rng } from './tipos';

export interface Alerta {
  texto: string;
  tipo: 'info' | 'bien' | 'aviso' | 'peligro';
  tick: number;
  x?: number;
  y?: number;
}

export interface Disparo {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: string;
  vida: number;
  laser: boolean;
}

export interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  color: string;
}

export interface EstadoInvestigacion {
  hechas: string[];
  actual: string | null;
  puntos: number;
  /** Paquetes de ciencia ya gastados en la investigación actual. */
  gastado: Coste;
}

export class Mundo {
  semilla: number;
  mapa: Mapa;
  edificios = new Map<number, Edificio>();
  colonos: Colono[] = [];
  criaturas: Criatura[] = [];
  nidos: Nido[] = [];
  disparos: Disparo[] = [];
  particulas: Particula[] = [];
  alertas: Alerta[] = [];
  tick = Math.floor(TICKS_DIA * (7 / 24));
  sigId = 1;
  energia = { demanda: 0, capacidad: 0, sat: 1 };
  investigacion: EstadoInvestigacion = { hechas: [], actual: null, puntos: 0, gastado: {} };
  evolucion = 0;
  contaminacionTotal = 0;
  ganado = false;
  /** Interruptores del panel de administración. */
  admin = { dios: false, gratis: false, pacifico: false, energia: false, combustible: false };
  perdido = false;
  /** Casillas cuyo dibujo hay que rehacer. */
  sucias = new Set<number>();
  /** Destinos reservados por colonos: clave → id de colono. */
  reservas = new Map<string, number>();
  proximaIncursion = TICKS_DIA * 4;
  proximaExpansion = TICKS_DIA * 4;
  proximoViajero = TICKS_DIA * 5;
  azar: () => number;
  inicio: [number, number];
  private cacheExistencias = new Map<ItemId, number>();
  private tickCache = -1;

  constructor(semilla = Date.now() % 1e9) {
    this.semilla = semilla;
    this.azar = rng(semilla ^ 0x9e3779b9);
    const g = generar(semilla);
    this.mapa = g.mapa;
    this.inicio = g.inicio;
    for (const [x, y] of g.nidos) this.nidos.push(crearNido(this, x, y));
  }

  /** Partida nueva: tres colonos y una caja de suministros. */
  static nueva(semilla?: number): Mundo {
    const w = new Mundo(semilla);
    const [x, y] = w.inicio;
    for (let k = 0; k < 3; k++) w.colonos.push(crearColono(w, x - 1 + k, y));
    const caja: Coste = { madera: 80, comida: 30, piedra: 30, placaHierro: 20, engranaje: 6, municion: 10 };
    for (const [it, n] of Object.entries(caja)) w.mapa.soltar(x, y + 2, it as ItemId, n!, ITEMS[it as ItemId].pila);
    // Zona de almacén alrededor de la caja.
    for (let j = 1; j <= 4; j++) for (let i = -2; i <= 2; i++) if (w.mapa.transitable(x + i, y + j)) w.mapa.zona[idx(x + i, y + j)] = Zona.Almacen;
    w.avisar('Tres colonos se han estrellado en este planeta. Construid, fabricad y encended el faro de rescate.', 'info');
    return w;
  }

  // ------------------------------------------------------------------ consultas

  get dia(): number {
    return Math.floor(this.tick / TICKS_DIA) + 1;
  }

  get hora(): number {
    return ((this.tick % TICKS_DIA) / TICKS_DIA) * 24;
  }

  edificioEn(x: number, y: number): Edificio | undefined {
    if (x < 0 || y < 0 || x >= ANCHO || y >= ALTO) return undefined;
    const id = this.mapa.edif[idx(x, y)];
    return id ? this.edificios.get(id) : undefined;
  }

  investigado(id: string): boolean {
    return this.investigacion.hechas.includes(id);
  }

  disponible(tipo: TipoEdificio): boolean {
    const t = EDIFICIOS[tipo].tech;
    return !t || this.investigado(t);
  }

  /** Casilla que pisan los colonos (sin muros de piedra, ni edificios sólidos). */
  pasableColono = (i: number): boolean => {
    if (!this.mapa.transitable(i % ANCHO, (i / ANCHO) | 0)) return false;
    const id = this.mapa.edif[i];
    if (!id) return true;
    const e = this.edificios.get(id);
    return !e || !e.construido || !EDIFICIOS[e.tipo].solido;
  };

  /** Existencias de un objeto en almacenes, suelo y cofres (cacheado por tick). */
  existencias(item: ItemId): number {
    if (this.tickCache !== this.tick) {
      this.cacheExistencias.clear();
      this.tickCache = this.tick;
      for (const p of this.mapa.objetos.values()) this.cacheExistencias.set(p.item, (this.cacheExistencias.get(p.item) ?? 0) + p.n);
      for (const e of this.edificios.values()) {
        if (e.salida && e.tipo !== 'taladro' && e.tipo !== 'taladroElectrico') this.cacheExistencias.set(e.salida.item, (this.cacheExistencias.get(e.salida.item) ?? 0) + e.salida.n);
        if (e.tipo !== 'cofre') continue;
        for (const p of e.inv) this.cacheExistencias.set(p.item, (this.cacheExistencias.get(p.item) ?? 0) + p.n);
      }
      for (const c of this.colonos) if (c.carga) this.cacheExistencias.set(c.carga.item, (this.cacheExistencias.get(c.carga.item) ?? 0) + c.carga.n);
    }
    return this.cacheExistencias.get(item) ?? 0;
  }

  inventario(): Record<ItemId, number> {
    const out = {} as Record<ItemId, number>;
    for (const it of LISTA_ITEMS) out[it] = this.existencias(it);
    return out;
  }

  /** Paquetes de ciencia que aún le faltan a la investigación actual (descontando los que hay en la mesa). */
  cienciaPendiente(): Coste {
    const t = this.investigacion.actual ? tecnologia(this.investigacion.actual) : undefined;
    if (!t) return {};
    const out: Coste = {};
    for (const k in t.ciencia) {
      const it = k as ItemId;
      out[it] = Math.max(0, (t.ciencia[it] ?? 0) - (this.investigacion.gastado[it] ?? 0));
    }
    return out;
  }

  criaturaCerca(x: number, y: number, r: number): Criatura | null {
    let mejor: Criatura | null = null;
    let md = r * r;
    for (const c of this.criaturas) {
      const d = (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d < md) {
        md = d;
        mejor = c;
      }
    }
    return mejor;
  }

  // ------------------------------------------------------------------ acciones

  avisar(texto: string, tipo: Alerta['tipo'] = 'info', x?: number, y?: number): void {
    this.alertas.push({ texto, tipo, tick: this.tick, x, y });
    if (this.alertas.length > 60) this.alertas.shift();
  }

  terrenoCambiado(i: number): void {
    this.sucias.add(i);
  }

  colocar(tipo: TipoEdificio, x: number, y: number, dir: Dir, construido = false): Edificio | string {
    if (!this.disponible(tipo)) return 'Hay que investigarlo antes';
    const error = puedeColocar(this, tipo, x, y);
    if (error) return error;
    const e = nuevoEdificio(this.sigId++, tipo, x, y, dir, construido || this.admin.gratis);
    this.edificios.set(e.id, e);
    for (const [cx, cy] of casillas(e)) {
      const i = idx(cx, cy);
      this.mapa.edif[i] = e.id;
      this.mapa.orden[i] = 0;
      if (this.mapa.zona[i] === Zona.Cultivo) this.mapa.zona[i] = 0;
      if (this.mapa.planta[i] === Planta.Patata || this.mapa.planta[i] === Planta.Arbusto) this.mapa.planta[i] = 0;
      this.sucias.add(i);
    }
    return e;
  }

  /** Quita un edificio. Si estaba construido, devuelve parte de sus materiales al suelo. */
  quitar(e: Edificio, reembolso: number): void {
    this.edificios.delete(e.id);
    for (const [cx, cy] of casillas(e)) {
      this.mapa.edif[idx(cx, cy)] = 0;
      this.sucias.add(idx(cx, cy));
    }
    const [x, y] = [e.x, e.y];
    const devolver: Coste = {};
    const def = EDIFICIOS[e.tipo];
    if (e.construido) {
      for (const k in def.coste) devolver[k as ItemId] = Math.floor((def.coste[k as ItemId] ?? 0) * reembolso);
    } else {
      // Un plano a medias devuelve lo que se le había traído.
      for (const k in def.coste) devolver[k as ItemId] = (def.coste[k as ItemId] ?? 0) - (e.faltan[k as ItemId] ?? 0);
    }
    for (const k in e.entrada) devolver[k as ItemId] = (devolver[k as ItemId] ?? 0) + (e.entrada[k as ItemId] ?? 0);
    if (e.salida) devolver[e.salida.item] = (devolver[e.salida.item] ?? 0) + e.salida.n;
    if (e.combustible) devolver[e.combustible.item] = (devolver[e.combustible.item] ?? 0) + e.combustible.n;
    for (const p of e.inv) devolver[p.item] = (devolver[p.item] ?? 0) + p.n;
    for (const c of e.cinta) devolver[c.item] = (devolver[c.item] ?? 0) + 1;
    if (e.mano) devolver[e.mano] = (devolver[e.mano] ?? 0) + 1;
    if (e.balas >= 10) devolver.municion = (devolver.municion ?? 0) + Math.floor(e.balas / 10);
    for (const [k, n] of Object.entries(devolver)) if (n && n > 0) this.mapa.soltar(x, y, k as ItemId, n, ITEMS[k as ItemId].pila);
    for (const [k, v] of [...this.reservas]) if (v !== undefined && k.startsWith(`e:${e.id}:`)) this.reservas.delete(k);
  }

  destruido(e: Edificio): void {
    this.avisar(`${EDIFICIOS[e.tipo].nombre} destruido`, 'peligro', e.x, e.y);
    for (let k = 0; k < 14; k++) this.particula(e.x + 0.5, e.y + 0.5, '#7a6a5a');
    this.quitar(e, 0.25);
  }

  producido(_item: ItemId, _n: number): void {
    // Gancho para estadísticas futuras.
  }

  disparo(x0: number, y0: number, x1: number, y1: number, color: string, laser: boolean): void {
    this.disparos.push({ x0, y0, x1, y1, color, vida: laser ? 0.18 : 0.08, laser });
  }

  particula(x: number, y: number, color: string): void {
    const a = this.azar() * Math.PI * 2;
    const v = 0.5 + this.azar() * 2.5;
    this.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.4 + this.azar() * 0.5, color });
  }

  danarCriatura(c: Criatura, d: number): void {
    c.hp -= d;
    c.golpe = 0.1;
    if (this.azar() < 0.3) this.particula(c.x, c.y, '#9ad04a');
  }

  ganar(): void {
    this.ganado = true;
    this.avisar('¡La nave de rescate ha llegado! La colonia se salva.', 'bien');
  }

  // ------------------------------------------------------------------ investigación

  elegirInvestigacion(id: string): void {
    if (this.investigacion.actual === id) return;
    const t = tecnologia(id);
    if (!t || this.investigado(id) || !t.requiere.every((r) => this.investigado(r))) return;
    this.investigacion = { ...this.investigacion, actual: id, puntos: 0, gastado: {} };
  }

  /** Un colono investiga `puntos`. Gasta ciencia de la mesa en proporción. */
  investigar(mesa: Edificio, puntos: number): boolean {
    const t = this.investigacion.actual ? tecnologia(this.investigacion.actual) : undefined;
    if (!t) return false;
    const fraccion = Math.min(1, (this.investigacion.puntos + puntos) / t.puntos);
    for (const k in t.ciencia) {
      const it = k as ItemId;
      const total = t.ciencia[it] ?? 0;
      const debe = Math.ceil(total * fraccion - 1e-9);
      while ((this.investigacion.gastado[it] ?? 0) < debe) {
        if ((mesa.entrada[it] ?? 0) <= 0) return false;
        mesa.entrada[it] = (mesa.entrada[it] ?? 0) - 1;
        if (!mesa.entrada[it]) delete mesa.entrada[it];
        this.investigacion.gastado[it] = (this.investigacion.gastado[it] ?? 0) + 1;
      }
    }
    this.investigacion.puntos += puntos;
    if (this.investigacion.puntos >= t.puntos) {
      this.investigacion.hechas.push(t.id);
      this.avisar(`Investigación terminada: ${t.nombre}`, 'bien');
      this.investigacion.actual = null;
      this.investigacion.puntos = 0;
      this.investigacion.gastado = {};
      // Si queda alguna disponible, se elige sola la primera.
      const sig = TECNOLOGIAS.find((x) => !this.investigado(x.id) && x.requiere.every((r) => this.investigado(r)));
      if (sig) this.elegirInvestigacion(sig.id);
    }
    return true;
  }

  // ------------------------------------------------------------------ tick

  paso(): void {
    if (this.perdido || this.ganado) return;
    this.tick++;
    tickMaquinas(this);
    tickColonos(this);
    tickCriaturas(this);
    const dt = 1 / TPS;
    for (const d of this.disparos) d.vida -= dt;
    this.disparos = this.disparos.filter((d) => d.vida > 0);
    for (const p of this.particulas) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vida -= dt;
    }
    this.particulas = this.particulas.filter((p) => p.vida > 0);
    if (this.tick % TPS === 0) this.cadaSegundo();
  }

  private cadaSegundo(): void {
    // Contaminación: se difunde a los trozos vecinos y la absorben el suelo y los árboles.
    const c = this.mapa.contaminacion;
    const nueva = new Float32Array(c.length);
    for (let ty = 0; ty < TH; ty++) {
      for (let tx = 0; tx < TW; tx++) {
        const t = ty * TW + tx;
        let v = c[t]!;
        if (v <= 0) continue;
        const sale = v > 15 ? v * 0.02 : 0;
        let vecinos = 0;
        for (const [ax, ay] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = tx + ax;
          const ny = ty + ay;
          if (nx < 0 || ny < 0 || nx >= TW || ny >= TH) continue;
          nueva[ny * TW + nx] = nueva[ny * TW + nx]! + sale;
          vecinos++;
        }
        v -= sale * vecinos;
        nueva[t] = nueva[t]! + v;
      }
    }
    for (let t = 0; t < nueva.length; t++) {
      const arboles = this.arbolesEnTrozo(t);
      nueva[t] = Math.max(0, nueva[t]! - 0.25 - arboles * 0.012);
    }
    this.mapa.contaminacion = nueva;

    // La evolución de las criaturas avanza con el tiempo y con lo que se contamina.
    const antes = this.evolucion;
    this.evolucion = Math.min(1, this.evolucion + (1 - this.evolucion) * (0.02 / (TICKS_DIA / TPS)));
    if (Math.floor(antes * 10) !== Math.floor(this.evolucion * 10)) this.avisar(`Las criaturas evolucionan: ${(this.evolucion * 100).toFixed(0)} %`, 'aviso');

    // Crecen las plantas.
    const m = this.mapa;
    const crecePorSeg = 1 / (TICKS_DIA / TPS) / 1.5;
    for (let i = 0; i < m.planta.length; i++) {
      const p = m.planta[i];
      if (p === Planta.Patata || p === Planta.Arbusto) {
        const antesC = m.crece[i]!;
        m.crece[i] = Math.min(1, antesC + crecePorSeg * (p === Planta.Arbusto ? 0.5 : 1));
        if (antesC < 1 && m.crece[i] === 1) this.sucias.add(i);
      }
    }

    // Sucesos.
    if (this.tick >= this.proximoViajero) {
      this.proximoViajero = this.tick + TICKS_DIA * (4 + this.azar() * 3);
      const vivos = this.colonos.filter((c) => !c.muerto).length;
      if (vivos > 0 && vivos < 8) {
        const [x, y] = this.bordeAleatorio();
        const c = crearColono(this, x, y);
        this.colonos.push(c);
        this.avisar(`${c.nombre} llega caminando y se une a la colonia.`, 'bien', x, y);
      }
    }
  }

  private arbolesCache = new Map<number, number>();
  private arbolesTick = -1;
  private arbolesEnTrozo(t: number): number {
    if (this.arbolesTick < 0 || this.tick - this.arbolesTick > TPS * 30) {
      this.arbolesCache.clear();
      this.arbolesTick = this.tick;
      for (let i = 0; i < this.mapa.planta.length; i++) {
        if (this.mapa.planta[i] !== Planta.Arbol) continue;
        const k = this.mapa.trozo(i % ANCHO, (i / ANCHO) | 0);
        this.arbolesCache.set(k, (this.arbolesCache.get(k) ?? 0) + 1);
      }
    }
    return this.arbolesCache.get(t) ?? 0;
  }

  bordeAleatorio(): [number, number] {
    for (let k = 0; k < 200; k++) {
      const lado = Math.floor(this.azar() * 4);
      const t = this.azar();
      const x = lado === 0 ? 1 : lado === 1 ? ANCHO - 2 : Math.floor(t * (ANCHO - 2)) + 1;
      const y = lado === 2 ? 1 : lado === 3 ? ALTO - 2 : Math.floor(t * (ALTO - 2)) + 1;
      if (this.pasableColono(idx(x, y))) return [x, y];
    }
    return this.inicio;
  }

  /** Objetos de un tipo dentro de cofres: [cofre, cantidad]. */
  *cofresCon(item: ItemId): Generator<[Edificio, number]> {
    for (const e of this.edificios.values()) {
      if (e.tipo !== 'cofre' || !e.construido) continue;
      const n = cantidadEn(e, item);
      if (n > 0) yield [e, n];
    }
  }
}
