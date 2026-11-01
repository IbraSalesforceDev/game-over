/**
 * Un vuelo: la nave del jugador, las enemigas, los restos, los proyectiles, los
 * asteroides y las estaciones, todo avanzando a la vez.
 *
 * La física va en subpasos (ver `pasoMaximo`); el combate, la minería y la IA
 * van una vez por fotograma, porque con enemigos cerca el tiempo no se puede
 * acelerar y un fotograma son 16 ms.
 */
import { pasoNave, telemetria, pasoMaximo } from './fisica';
import {
  type Blanco,
  type Cerebro,
  adelanto,
  declararGuerra,
  disenoEnemigo,
  intervaloIncursion,
  pilotar,
  subirTension,
  tamanoIncursion,
  tickDiplomacia,
} from './ia';
import { type Mineral, tickMercado, masaInventario, sumarInventario, MINERALES } from './mercado';
import { type Diseno, type MontajeArma, Nave } from './nave';
import { type Raza, enemigoDe, RAZAS } from './partes';
import { type Partida, hpEstacion, hpMaxEstacion } from './partida';
import {
  ANGULO_BASE,
  type Asteroide,
  type Estacion,
  ESTACIONES,
  acelCuerpo,
  crearAsteroides,
  dominante,
  natalDe,
  posCuerpo,
  posOrbita,
  velOrbita,
  relieve,
  estacionDe,
} from './sistema';
import { type V, dist, distSegmento, escala, largo, polar, punto, resta, suma, unit, v, angulo, perp } from './vec';

export interface Proyectil {
  pos: V;
  vel: V;
  dano: number;
  raza: Raza;
  ttl: number;
  tipo: 'bala' | 'misil';
  objetivo: Nave | null;
  antimisil: boolean;
  /** Lo disparó el jugador: cuenta para la diplomacia. */
  delJugador: boolean;
  vivo: boolean;
}

export interface Particula {
  pos: V;
  vel: V;
  vida: number;
  max: number;
  color: string;
  tam: number;
  /** Crece con la edad (humo) o se encoge (chispa). */
  crece: number;
}

export interface Aviso {
  texto: string;
  tipo: 'info' | 'aviso' | 'peligro' | 'bien';
  vida: number;
}

export type Evento = 'disparo' | 'misil' | 'rayo' | 'impacto' | 'explosion' | 'alerta' | 'etapa' | 'aterriza' | 'venta' | 'taladro';

export const NIVELES_WARP = [1, 2, 4, 10, 50, 100, 1000, 5000, 20000];

interface EstadoEstacion {
  def: Estacion;
  pos: V;
  vel: V;
  cd: number;
}

const RADIO_ACOPLE = 300;

/** Cuánto pega y cuánto dispara la IA respecto al jugador. */
const FACTOR_IA = 0.55;

let asteroidesCompartidos: Asteroide[] | null = null;

/** Los asteroides son los mismos en toda la partida; sus reservas viven en `Partida`. */
export function asteroides(p: Partida): Asteroide[] {
  if (!asteroidesCompartidos) asteroidesCompartidos = crearAsteroides();
  for (const a of asteroidesCompartidos) a.reserva = p.reservas[a.id] ?? a.reservaInicial;
  return asteroidesCompartidos;
}

export class Vuelo {
  readonly p: Partida;
  jugador: Nave;
  naves: Nave[] = [];
  cerebros = new Map<number, Cerebro>();
  proyectiles: Proyectil[] = [];
  particulas: Particula[] = [];
  asteroides: Asteroide[];
  estaciones: EstadoEstacion[] = [];
  warp = 1;
  /** Punto del mundo bajo el ratón. */
  apunte: V = v();
  disparando = false;
  avisos: Aviso[] = [];
  eventos: Evento[] = [];
  terminado: null | 'perdida' | 'recuperada' = null;
  acoplada = false;
  enCasa = false;
  cercano: { a: Asteroide; pos: V; d: number; vrel: number } | null = null;
  /** Por qué no se puede acelerar más el tiempo. */
  limiteWarp = '';
  minando = false;
  private vivos = new Set<number>();
  private ultimaDefensa = -1e9;
  private azar = Math.random;
  private alertaTerritorio = 0;

  constructor(p: Partida, d: Diseno, desdeEstacion: boolean) {
    this.p = p;
    this.asteroides = asteroides(p);
    this.jugador = Nave.desde(d);
    const n = this.jugador;
    n.inmortal = p.admin.dios;
    n.combustibleInfinito = p.admin.combustible;
    if (desdeEstacion) {
      const e = estacionDe(p.raza);
      const pe = posOrbita(e.orbita, p.t);
      const ve = velOrbita(e.orbita, p.t);
      const atras = unit(ve);
      n.pos = suma(pe, escala(atras, -160));
      n.vel = ve;
      n.ang = angulo(resta(pe, posCuerpo(natalDe(p.raza), p.t)));
    } else {
      const c = natalDe(p.raza);
      n.posado = { cuerpo: c.id, ang: ANGULO_BASE };
      n.ang = ANGULO_BASE;
      const g = n.geometria;
      n.pos = suma(posCuerpo(c, p.t), polar(ANGULO_BASE, c.radio + relieve(c, ANGULO_BASE) + g.largo - g.ycm + 0.05));
    }
    this.naves.push(n);
    this.vivos.add(n.id);
    this.actualizarEstaciones();
  }

  get t(): number {
    return this.p.t;
  }

  avisar(texto: string, tipo: Aviso['tipo'] = 'info'): void {
    this.avisos.push({ texto, tipo, vida: tipo === 'peligro' ? 7 : 5 });
    if (this.avisos.length > 6) this.avisos.shift();
  }

  get enemigo(): Raza {
    return enemigoDe(this.p.raza);
  }

  private actualizarEstaciones(): void {
    this.estaciones = ESTACIONES.map((def) => {
      const prev = this.estaciones.find((e) => e.def.id === def.id);
      return { def, pos: posOrbita(def.orbita, this.t), vel: velOrbita(def.orbita, this.t), cd: prev?.cd ?? 0 };
    });
  }

  estacion(id: Raza): EstadoEstacion {
    return this.estaciones.find((e) => e.def.id === id)!;
  }

  enemigosCerca(radio: number): number {
    let k = 0;
    for (const n of this.naves) if (n.raza !== this.p.raza && n.controlable && dist(n.pos, this.jugador.pos) < radio) k++;
    return k;
  }

  /** Cuánto se puede acelerar el tiempo ahora mismo. */
  warpMaximo(): number {
    const n = this.jugador;
    if (this.terminado) return 1;
    if (this.enemigosCerca(80_000) > 0) {
      this.limiteWarp = 'enemigos cerca';
      return 1;
    }
    if (n.hayMotorSolidoArdiendo() || (n.encendida && n.acel > 0 && n.empujeMax() > 0 && !n.posado)) {
      this.limiteWarp = 'motores encendidos';
      return 1;
    }
    const tel = telemetria(n, this.t);
    if (tel.rho > 0 && !n.posado) {
      this.limiteWarp = 'dentro de la atmósfera';
      return 4;
    }
    this.limiteWarp = '';
    return this.p.admin.warpMax;
  }

  cambiarWarp(dir: number): void {
    const i = NIVELES_WARP.indexOf(this.warp);
    const j = Math.max(0, Math.min(NIVELES_WARP.length - 1, i + dir));
    const nuevo = NIVELES_WARP[j]!;
    const max = this.warpMaximo();
    if (nuevo > max) {
      if (this.limiteWarp) this.avisar(`No se puede acelerar el tiempo: ${this.limiteWarp}.`, 'aviso');
      this.warp = NIVELES_WARP.filter((w) => w <= max).pop() ?? 1;
      return;
    }
    this.warp = nuevo;
  }

  etapa(): void {
    const n = this.jugador;
    if (!n.controlable) return;
    const restos = n.etapa();
    this.eventos.push('etapa');
    if (restos) {
      this.naves.push(restos);
      this.chispas(restos.puntoEje(0), n.vel, '#ffd27a', 14);
    }
  }

  // ------------------------------------------------------------ bucle

  paso(dtReal: number): void {
    const dt0 = Math.min(dtReal, 0.1);
    if (this.terminado === 'recuperada') return;
    const max = this.warpMaximo();
    if (this.warp > max) {
      this.warp = NIVELES_WARP.filter((w) => w <= max).pop() ?? 1;
      if (this.limiteWarp) this.avisar(`Tiempo normal: ${this.limiteWarp}.`, 'aviso');
    }
    const dtJuego = dt0 * this.warp;
    const h0 = this.warp <= 4 ? 1 / 60 : pasoMaximo(this.jugador, this.t);
    const nSub = Math.min(600, Math.max(1, Math.ceil(dtJuego / h0)));
    const h = dtJuego / nSub;
    const tAntes = this.t;

    if (!this.terminado) this.controlarIA();

    for (let s = 0; s < nSub; s++) {
      for (const n of this.naves) {
        const c = pasoNave(n, h, this.p.t);
        if (!c) continue;
        if (n === this.jugador) {
          if (c.tipo === 'aterriza') {
            this.eventos.push('aterriza');
            this.avisar(`Posada en ${c.cuerpo.nombre} a ${c.velocidad.toFixed(1)} m/s.`, 'bien');
            this.warp = 1;
          } else if (c.tipo === 'choca') {
            this.explosion(n.pos, n.vel, 40);
            this.warp = 1;
          }
        } else if (c.tipo === 'choca') {
          this.explosion(n.pos, n.vel, n.controlable ? 25 : 10);
        }
      }
      this.p.t += h;
    }
    this.actualizarEstaciones();

    // Restos: se van cuando se alejan o caducan.
    for (const n of this.naves) {
      if (n === this.jugador) continue;
      if (!n.controlable) n.vida -= dt0;
      if (n.vida <= 0 || dist(n.pos, this.jugador.pos) > 400_000) n.destruida = true;
    }

    this.armas(dt0);
    this.moverProyectiles(dtJuego);
    this.torretas(dt0);
    this.mineria(dt0, dtJuego);
    this.situacion(dt0);
    this.revisarBajas();
    this.naves = this.naves.filter((n) => n === this.jugador || !(n.destruida && !this.cerebros.has(n.id)) || n.nodos.length > 0);
    this.naves = this.naves.filter((n) => n === this.jugador || !n.destruida);
    for (const id of [...this.cerebros.keys()]) if (!this.naves.some((n) => n.id === id)) this.cerebros.delete(id);

    // Diplomacia y mercado.
    const d = this.p.diplomacia;
    const cambio = tickDiplomacia(d, dt0, this.t);
    if (cambio === 'tension') this.avisar(`${RAZAS[this.enemigo].nombre}: tensión diplomática. Deja de provocar o habrá guerra.`, 'aviso');
    if (cambio === 'guerra') {
      this.avisar(`¡${RAZAS[this.enemigo].nombre} os declara la guerra!`, 'peligro');
      this.eventos.push('alerta');
    }
    if (d.estado === 'guerra' && !this.terminado) {
      d.proxima -= dt0;
      if (d.proxima <= 0) {
        this.incursion();
        d.proxima = intervaloIncursion(d, this.azar);
      }
    } else if (d.estado !== 'guerra' && this.cerebros.size > 0) {
      for (const n of this.naves) {
        if (this.cerebros.has(n.id)) {
          this.chispas(n.pos, n.vel, '#9ff', 20);
          n.destruida = true;
        }
      }
      this.cerebros.clear();
      this.avisar('Las naves enemigas saltan y se retiran.', 'bien');
    }
    tickMercado(this.p.mercado, tAntes, this.t, d.estado === 'guerra');

    this.particulasPaso(dt0, dtJuego);
    for (const a of this.avisos) a.vida -= dt0;
    this.avisos = this.avisos.filter((a) => a.vida > 0);
  }

  // ------------------------------------------------------------ IA

  private controlarIA(): void {
    for (const n of this.naves) {
      const cer = this.cerebros.get(n.id);
      if (!cer || !n.controlable) continue;
      const b = this.blancoDe(cer);
      if (!b) continue;
      pilotar(n, b, cer);
    }
  }

  private blancoDe(cer: Cerebro): Blanco | null {
    if (cer.objetivo === 'estacion') {
      const e = this.estacion(this.p.raza);
      if (hpEstacion(this.p, e.def.id) <= 0) return this.jugador.controlable ? this.jugador : null;
      return e;
    }
    return this.jugador.controlable ? this.jugador : null;
  }

  private nuevaEnemiga(nivel: 1 | 2 | 3, pos: V, vel: V, objetivo: Cerebro['objetivo']): Nave {
    const n = Nave.desde(disenoEnemigo(this.enemigo, nivel));
    n.pos = pos;
    n.vel = vel;
    n.ang = angulo(resta(this.jugador.pos, pos));
    n.encendida = true;
    n.combustibleInfinito = true;
    n.energiaInfinita = true;
    n.sas = true;
    this.naves.push(n);
    this.vivos.add(n.id);
    // Se acerca hasta donde llega su arma más corta: si no, la lanza de plasma no tocaría nunca.
    const alcances = n.armas().filter((m) => !m.parte.arma?.antimisil).map((m) => m.parte.arma?.alcance ?? 0);
    const alcance = Math.max(600, alcances.length ? Math.min(...alcances) : 1500);
    this.cerebros.set(n.id, {
      nivel,
      objetivo,
      distancia: alcance * (0.4 + this.azar() * 0.3),
      lado: this.azar() < 0.5 ? -1 : 1,
      recompensa: [1500, 3500, 8000][nivel - 1]!,
    });
    this.chispas(pos, vel, '#bff', 26);
    return n;
  }

  /** Una flota sale del salto cerca del jugador, o de la estación si el jugador está en tierra. */
  incursion(forzarNaves?: number, forzarNivel?: 1 | 2 | 3): void {
    const d = this.p.diplomacia;
    const tam = tamanoIncursion(d);
    const nNaves = forzarNaves ?? tam.naves;
    const nivel = forzarNivel ?? tam.nivel;
    const contraEstacion = !!this.jugador.posado && hpEstacion(this.p, this.p.raza) > 0;
    const centro = contraEstacion ? this.estacion(this.p.raza) : this.jugador;
    const c = dominante(centro.pos, this.t);
    const fuera = unit(resta(centro.pos, posCuerpo(c, this.t)));
    for (let i = 0; i < nNaves; i++) {
      const ang = (this.azar() - 0.5) * 2.4;
      const dir = v(fuera.x * Math.cos(ang) - fuera.y * Math.sin(ang), fuera.x * Math.sin(ang) + fuera.y * Math.cos(ang));
      const pos = suma(centro.pos, escala(dir, 3500 + this.azar() * 1500));
      const vel = suma(centro.vel, escala(perp(dir), (this.azar() - 0.5) * 30));
      this.nuevaEnemiga(nivel, pos, vel, contraEstacion ? 'estacion' : 'jugador');
    }
    this.warp = 1;
    this.eventos.push('alerta');
    this.avisar(
      contraEstacion
        ? `¡Alerta! ${nNaves} naves de ${RAZAS[this.enemigo].nombre} atacan ${this.estacion(this.p.raza).def.nombre}.`
        : `¡Alerta! ${nNaves} naves de ${RAZAS[this.enemigo].nombre} salen del salto.`,
      'peligro',
    );
  }

  // ------------------------------------------------------------ armas

  private hostiles(raza: Raza): Nave[] {
    return this.naves.filter((n) => n.raza !== raza && n.controlable);
  }

  /** La nave enemiga más cercana a un punto, dentro de un radio. */
  hostilCerca(raza: Raza, p: V, radio: number): Nave | null {
    let mejor: Nave | null = null;
    let md = radio;
    for (const n of this.hostiles(raza)) {
      const d = dist(n.pos, p);
      if (d < md) {
        md = d;
        mejor = n;
      }
    }
    return mejor;
  }

  private armas(dt: number): void {
    for (const n of this.naves) {
      n.rayos = [];
      for (const m of n.armas()) m.nodo.cd[m.lado] = Math.max(0, m.nodo.cd[m.lado] - dt);
      if (!n.controlable) continue;
      if (n.golpe > 0) n.golpe -= dt;
      const esJugador = n === this.jugador;
      let blanco: Blanco | null = null;
      let apunte: V | null = null;
      let dispara = false;
      if (esJugador) {
        dispara = this.disparando && !this.terminado;
        const cerca = this.hostilCerca(n.raza, this.apunte, 400);
        blanco = cerca;
        apunte = this.apunte;
        // Las estaciones enemigas también son blanco.
        const est = this.estacion(this.enemigo);
        if (!cerca && dist(est.pos, this.apunte) < 300 && hpEstacion(this.p, est.def.id) > 0) blanco = est;
      } else {
        const cer = this.cerebros.get(n.id);
        if (cer) {
          blanco = this.blancoDe(cer);
          if (blanco) {
            apunte = blanco.pos;
            dispara = dist(blanco.pos, n.pos) < 9000;
          }
        }
      }
      for (const m of n.armas()) {
        const arma = m.parte.arma!;
        if (arma.antimisil) {
          this.antimisil(n, m);
          continue;
        }
        if (!dispara || !apunte) continue;
        this.disparar(n, m, blanco, apunte, dt, esJugador);
      }
    }
  }

  private gastar(n: Nave, e: number): boolean {
    if (n.energiaInfinita) return true;
    if (n.energia < e) return false;
    n.energia -= e;
    return true;
  }

  private disparar(n: Nave, m: MontajeArma, blanco: Blanco | null, apunte: V, dt: number, delJugador: boolean): void {
    const arma = m.parte.arma!;
    // La IA apunta peor, dispara menos y pega más flojo que el jugador: si no,
    // tres naves enemigas deshacen cualquier diseño en diez segundos.
    const k = delJugador ? 1 : FACTOR_IA;
    const o = n.posArma(m);
    const destino = blanco && arma.tipo === 'bala' ? adelanto(o, n.vel, blanco, arma.velocidad) : blanco ? blanco.pos : apunte;
    const dir = unit(resta(destino, o));
    if (!delJugador && dist(o, destino) > arma.alcance * 1.05) return;
    if (arma.tipo === 'rayo') {
      if (!this.gastar(n, arma.energia * dt)) return;
      // Un rayo no falla nunca, así que en manos de la IA quema bastante menos.
      this.rayo(n, o, dir, arma.alcance, arma.dano * dt * k * (delJugador ? 1 : 0.55), delJugador);
      if (this.azar() < dt * 8) this.eventos.push('rayo');
      return;
    }
    if (m.nodo.cd[m.lado] > 0) return;
    if (!this.gastar(n, arma.energia)) return;
    m.nodo.cd[m.lado] = (arma.cadencia * (0.9 + this.azar() * 0.2)) / k;
    if (arma.tipo === 'bala') {
      const disp = (this.azar() - 0.5) * (delJugador ? 0.004 : 0.03);
      const d2 = v(dir.x * Math.cos(disp) - dir.y * Math.sin(disp), dir.x * Math.sin(disp) + dir.y * Math.cos(disp));
      this.proyectiles.push({
        pos: o,
        vel: suma(n.vel, escala(d2, arma.velocidad)),
        dano: arma.dano * k,
        raza: n.raza,
        ttl: arma.alcance / arma.velocidad,
        tipo: 'bala',
        objetivo: null,
        antimisil: false,
        delJugador,
        vivo: true,
      });
      this.chispas(o, n.vel, n.info.colores.llama, 2);
      this.eventos.push('disparo');
    } else {
      const objetivo = blanco instanceof Nave ? blanco : this.hostilCerca(n.raza, destino, 3000);
      this.proyectiles.push({
        pos: o,
        vel: suma(n.vel, escala(dir, 40)),
        dano: arma.dano * k,
        raza: n.raza,
        ttl: 40,
        tipo: 'misil',
        objetivo,
        antimisil: false,
        delJugador,
        vivo: true,
      });
      this.eventos.push('misil');
    }
  }

  private antimisil(n: Nave, m: MontajeArma): void {
    const arma = m.parte.arma!;
    if (m.nodo.cd[m.lado] > 0) return;
    const o = n.posArma(m);
    let mejor: Proyectil | null = null;
    let md = arma.alcance;
    for (const p of this.proyectiles) {
      if (p.tipo !== 'misil' || p.raza === n.raza || !p.vivo) continue;
      const d = dist(p.pos, o);
      if (d < md) {
        md = d;
        mejor = p;
      }
    }
    if (!mejor || !this.gastar(n, arma.energia)) return;
    m.nodo.cd[m.lado] = arma.cadencia;
    const destino = adelanto(o, n.vel, mejor, arma.velocidad);
    const disp = (this.azar() - 0.5) * 0.03;
    const dir = unit(resta(destino, o));
    const d2 = v(dir.x * Math.cos(disp) - dir.y * Math.sin(disp), dir.x * Math.sin(disp) + dir.y * Math.cos(disp));
    this.proyectiles.push({
      pos: o,
      vel: suma(n.vel, escala(d2, arma.velocidad)),
      dano: arma.dano,
      raza: n.raza,
      ttl: arma.alcance / arma.velocidad,
      tipo: 'bala',
      objetivo: null,
      antimisil: true,
      delJugador: false,
      vivo: true,
    });
  }

  private rayo(n: Nave, o: V, dir: V, alcance: number, dano: number, delJugador: boolean): void {
    let mejorS = alcance;
    let golpeada: Nave | null = null;
    let estacionGolpeada: EstadoEstacion | null = null;
    for (const h of this.hostiles(n.raza)) {
      const rel = resta(h.pos, o);
      const s = punto(rel, dir);
      if (s <= 0 || s >= mejorS) continue;
      const perpD = Math.abs(rel.x * dir.y - rel.y * dir.x);
      if (perpD < h.geometria.anchoMax / 2 + h.geometria.largo * 0.3 + 2) {
        mejorS = s;
        golpeada = h;
      }
    }
    for (const e of this.estaciones) {
      if (e.def.id === n.raza || hpEstacion(this.p, e.def.id) <= 0) continue;
      const rel = resta(e.pos, o);
      const s = punto(rel, dir);
      if (s <= 0 || s >= mejorS) continue;
      if (Math.abs(rel.x * dir.y - rel.y * dir.x) < e.def.radio) {
        mejorS = s;
        golpeada = null;
        estacionGolpeada = e;
      }
    }
    const fin = suma(o, escala(dir, mejorS));
    n.rayos.push({ desde: o, hasta: fin, color: n.info.colores.brillo });
    if (golpeada) this.impactar(golpeada, dano, fin, delJugador, false);
    if (estacionGolpeada) this.danarEstacion(estacionGolpeada, dano, delJugador);
    if (golpeada || estacionGolpeada) if (this.azar() < 0.4) this.chispas(fin, golpeada?.vel ?? estacionGolpeada!.vel, n.info.colores.brillo, 1);
  }

  private impactar(h: Nave, dano: number, donde: V, delJugador: boolean, sonar = true): void {
    if (delJugador && this.p.diplomacia.estado !== 'guerra') {
      declararGuerra(this.p.diplomacia);
      this.avisar('¡Has disparado primero! Ahora estáis en guerra.', 'peligro');
    }
    const restos = h.danar(dano, this.azar);
    for (const r of restos) this.naves.push(r);
    if (sonar) this.eventos.push('impacto');
    if (sonar) this.chispas(donde, h.vel, '#ffcf8a', 5);
  }

  private danarEstacion(e: EstadoEstacion, dano: number, delJugador: boolean): void {
    const id = e.def.id;
    if (hpEstacion(this.p, id) <= 0) return;
    if (delJugador && this.p.diplomacia.estado !== 'guerra') {
      declararGuerra(this.p.diplomacia);
      this.avisar('¡Has atacado su estación! Ahora estáis en guerra.', 'peligro');
    }
    if (id === this.p.raza && this.p.admin.dios) return;
    this.p.estaciones[id] = Math.max(0, hpEstacion(this.p, id) - dano);
    if (this.p.estaciones[id]! <= 0) {
      this.explosion(e.pos, e.vel, 120);
      if (id === this.p.raza) {
        this.avisar(`${e.def.nombre} ha sido destruida. Repárala desde el hangar.`, 'peligro');
      } else {
        const d = this.p.diplomacia;
        d.victorias++;
        d.fuerza = 0;
        d.rendidaHasta = this.t + 3 * 24 * 3600;
        d.estado = 'paz';
        d.tension = 0;
        const premio = 60_000;
        this.p.creditos += premio;
        this.avisar(`¡Victoria! ${RAZAS[this.enemigo].nombre} se rinde. Botín: ${premio.toLocaleString('es')} cr.`, 'bien');
      }
    }
  }

  private moverProyectiles(dt: number): void {
    for (const p of this.proyectiles) {
      if (!p.vivo) continue;
      // Caen como todo lo demás, o se desviarían respecto a las naves.
      const c = dominante(p.pos, this.t);
      const rel = resta(p.pos, posCuerpo(c, this.t));
      const r = largo(rel);
      const g = suma(escala(rel, -c.gm / (r * r * r)), acelCuerpo(c, this.t));
      if (p.tipo === 'misil') {
        if (p.objetivo && !p.objetivo.controlable) p.objetivo = this.hostilCerca(p.raza, p.pos, 4000);
        const b = p.objetivo;
        if (b) {
          // Navegación proporcional simplificada: anula la velocidad lateral y acelera hacia el blanco.
          const relB = resta(b.pos, p.pos);
          const vr = resta(p.vel, b.vel);
          const haciaB = unit(relB);
          const lateral = resta(vr, escala(haciaB, punto(vr, haciaB)));
          const deseo = resta(escala(haciaB, 70), escala(lateral, 1.5));
          const ad = largo(deseo);
          const acc = escala(deseo, Math.min(1, 90 / Math.max(1, ad)));
          p.vel = suma(p.vel, escala(acc, dt));
          if (this.azar() < 0.7) this.particulas.push({ pos: p.pos, vel: p.vel, vida: 0.6, max: 0.6, color: '#d8d8d8', tam: 1.4, crece: 3 });
        }
      }
      p.vel = suma(p.vel, escala(g, dt));
      const antes = p.pos;
      p.pos = suma(p.pos, escala(p.vel, dt));
      p.ttl -= dt;
      if (p.ttl <= 0) {
        p.vivo = false;
        if (p.tipo === 'misil') this.explosion(p.pos, p.vel, 6);
        continue;
      }
      // Choque con el suelo.
      if (r - c.radio < 0) {
        p.vivo = false;
        continue;
      }
      // Balas antimisil contra misiles.
      if (p.antimisil) {
        for (const q of this.proyectiles) {
          if (q.tipo !== 'misil' || q.raza === p.raza || !q.vivo) continue;
          if (distSegmento(q.pos, antes, p.pos) < 6) {
            q.vivo = false;
            p.vivo = false;
            this.explosion(q.pos, q.vel, 5);
            break;
          }
        }
        continue;
      }
      // Contra naves: segmento recorrido contra el eje de la nave.
      for (const n of this.naves) {
        if (n.raza === p.raza || !n.controlable) continue;
        const g2 = n.geometria;
        const radio = g2.anchoMax / 2 + (p.tipo === 'misil' ? 5 : 1.2);
        if (dist(n.pos, p.pos) > g2.largo + radio + largo(resta(p.pos, antes)) + 10) continue;
        const nariz = n.puntoEje(0);
        const cola = n.puntoEje(g2.largo);
        let golpe = false;
        for (let k = 0; k <= 6 && !golpe; k++) {
          const q = suma(antes, escala(resta(p.pos, antes), k / 6));
          if (distSegmento(q, nariz, cola) < radio) golpe = true;
        }
        if (golpe) {
          p.vivo = false;
          this.impactar(n, p.dano, p.pos, p.delJugador);
          if (p.tipo === 'misil') this.explosion(p.pos, n.vel, 10);
          break;
        }
      }
      if (!p.vivo) continue;
      for (const e of this.estaciones) {
        if (e.def.id === p.raza || hpEstacion(this.p, e.def.id) <= 0) continue;
        if (distSegmento(e.pos, antes, p.pos) < e.def.radio) {
          p.vivo = false;
          this.danarEstacion(e, p.dano, p.delJugador);
          this.chispas(p.pos, e.vel, '#ffcf8a', 6);
          if (p.tipo === 'misil') this.explosion(p.pos, e.vel, 10);
          break;
        }
      }
    }
    this.proyectiles = this.proyectiles.filter((p) => p.vivo);
  }

  private torretas(dt: number): void {
    for (const e of this.estaciones) {
      if (hpEstacion(this.p, e.def.id) <= 0) continue;
      e.cd -= dt;
      if (e.cd > 0) continue;
      const fuerte = e.def.id === this.p.raza && this.p.tecnologias.includes('defensa3');
      const enemigoDeEstacion = e.def.id as Raza;
      const blanco = this.hostilCerca(enemigoDeEstacion, e.pos, fuerte ? 5000 : 3500);
      if (!blanco) continue;
      // Solo dispara a quien está en guerra con ella.
      if (this.p.diplomacia.estado !== 'guerra') continue;
      e.cd = fuerte ? 0.25 : 0.5;
      const vp = 1100;
      const destino = adelanto(e.pos, e.vel, blanco, vp);
      const dir = unit(resta(destino, e.pos));
      const o = suma(e.pos, escala(dir, e.def.radio + 4));
      this.proyectiles.push({
        pos: o,
        vel: suma(e.vel, escala(dir, vp)),
        dano: fuerte ? 14 : 9,
        raza: enemigoDeEstacion,
        ttl: 5,
        tipo: 'bala',
        objetivo: null,
        antimisil: false,
        delJugador: false,
        vivo: true,
      });
    }
  }

  private revisarBajas(): void {
    for (const n of this.naves) {
      if (!this.vivos.has(n.id) || n.controlable) continue;
      this.vivos.delete(n.id);
      this.explosion(n.pos, n.vel, Math.max(15, n.geometria.largo * 2));
      if (n === this.jugador) {
        this.terminado = 'perdida';
        this.p.stats.perdidas++;
        this.avisar(`Nave perdida: ${n.motivo || 'destruida'}.`, 'peligro');
        continue;
      }
      const cer = this.cerebros.get(n.id);
      if (cer) {
        const d = this.p.diplomacia;
        d.derribadas++;
        d.fuerza = Math.max(0, d.fuerza - 6 * cer.nivel);
        this.p.stats.derribos++;
        this.p.creditos += cer.recompensa;
        const chatarra = 0.5 + this.azar() * cer.nivel;
        const cabe = Math.max(0, this.jugador.capacidadCarga() - masaInventario(this.jugador.carga));
        const coge = dist(n.pos, this.jugador.pos) < 5000 ? Math.min(cabe, chatarra) : 0;
        if (coge > 0) this.jugador.carga.chatarra = (this.jugador.carga.chatarra ?? 0) + coge;
        this.avisar(
          `Derribada ${n.nombre}: +${cer.recompensa.toLocaleString('es')} cr` + (coge > 0 ? ` y ${coge.toFixed(1)} t de chatarra.` : '.'),
          'bien',
        );
        this.cerebros.delete(n.id);
      }
    }
  }

  // ------------------------------------------------------------ minería y situación

  private mineria(dt: number, dtJuego: number): void {
    const n = this.jugador;
    this.minando = false;
    let mejor: Vuelo['cercano'] = null;
    for (const a of this.asteroides) {
      const pa = posOrbita(a.orbita, this.t);
      const d = dist(pa, n.pos) - a.radio;
      if (!mejor || d < mejor.d) mejor = { a, pos: pa, d, vrel: largo(resta(n.vel, velOrbita(a.orbita, this.t))) };
    }
    this.cercano = mejor;
    if (!n.controlable) return;

    // Choque con la roca: aterrizar suave es posarse; rápido, abollarse.
    if (mejor && !n.posado) {
      const radioRoca = mejor.a.radio * 0.85;
      const centro = dist(mejor.pos, n.pos);
      const contacto = radioRoca + n.geometria.anchoMax * 0.5;
      if (centro < contacto) {
        const fuera = unit(resta(n.pos, mejor.pos));
        const va = velOrbita(mejor.a.orbita, this.t);
        if (mejor.vrel > 12 && !n.inmortal) {
          const restos = n.danar(mejor.vrel * mejor.vrel * 0.15, this.azar);
          for (const r of restos) this.naves.push(r);
          this.chispas(n.pos, va, '#c9b48a', 12);
          this.eventos.push('impacto');
          this.avisar(`Choque contra ${mejor.a.nombre} a ${mejor.vrel.toFixed(0)} m/s.`, 'peligro');
        }
        n.pos = suma(mejor.pos, escala(fuera, contacto + 0.2));
        const rel = resta(n.vel, va);
        const radial = punto(rel, fuera);
        // Se anula lo que empuja contra la roca y se frena el deslizamiento.
        n.vel = suma(va, escala(resta(rel, escala(fuera, Math.min(0, radial))), 0.9));
      }
    }

    if (n.refinando) {
      const ritmo = n.ritmoRefineria() * dtJuego;
      const hielo = n.carga.hielo ?? 0;
      if (ritmo <= 0) n.refinando = false;
      else if (hielo <= 0) {
        n.refinando = false;
        this.avisar('No queda hielo que refinar.', 'aviso');
      } else {
        const t = Math.min(ritmo, hielo);
        const puesto = n.repostar(t * 0.8);
        if (puesto <= 0) {
          n.refinando = false;
          this.avisar('Los tanques de la etapa están llenos.', 'info');
        } else n.carga.hielo = hielo - puesto / 0.8;
      }
    }

    if (!n.taladrando || !mejor) return;
    const ritmo = n.ritmoTaladro();
    if (ritmo <= 0) {
      n.taladrando = false;
      this.avisar('Esta nave no lleva taladro.', 'aviso');
      return;
    }
    if (mejor.d > n.radio() + 40) return;
    if (mejor.vrel > 8) return;
    const a = mejor.a;
    if (a.reserva <= 0) {
      n.taladrando = false;
      this.avisar(`${a.nombre} está agotado.`, 'aviso');
      return;
    }
    const cabe = n.capacidadCarga() - masaInventario(n.carga);
    if (cabe <= 1e-6) {
      n.taladrando = false;
      this.avisar('La bodega está llena. Vuelve a casa a vender.', 'aviso');
      return;
    }
    const sinEnergia = n.energiaMax() > 0 && n.energia <= 0;
    const cant = Math.min(ritmo * dtJuego * (sinEnergia ? 0.25 : 1), cabe, a.reserva);
    if (!sinEnergia) n.energia = Math.max(0, n.energia - ritmo * 25 * dtJuego);
    a.reserva -= cant;
    this.p.reservas[a.id] = a.reserva;
    this.p.stats.toneladas += cant;
    for (const k in a.composicion) {
      const m = k as Mineral;
      n.carga[m] = (n.carga[m] ?? 0) + cant * (a.composicion[m] ?? 0);
    }
    this.minando = true;
    if (this.azar() < 0.5) {
      const hacia = unit(resta(n.pos, mejor.pos));
      const borde = suma(mejor.pos, escala(hacia, a.radio));
      const col = MINERALES.find((x) => a.composicion[x.id])?.color ?? '#aaa';
      this.particulas.push({ pos: borde, vel: suma(velOrbita(a.orbita, this.t), escala(hacia, 4 + this.azar() * 6)), vida: 1.2, max: 1.2, color: col, tam: 1.2, crece: 0 });
    }
    if (this.azar() < dt * 3) this.eventos.push('taladro');
    if (a.territorio === this.enemigo) {
      subirTension(this.p.diplomacia, dt * 1.2);
      this.alertaTerritorio -= dt;
      if (this.alertaTerritorio <= 0 && this.p.diplomacia.estado !== 'guerra') {
        this.alertaTerritorio = 20;
        this.avisar(`Estás minando en territorio de ${RAZAS[this.enemigo].nombre}. La tensión sube.`, 'aviso');
      }
    }
  }

  private situacion(dt: number): void {
    const n = this.jugador;
    const propia = this.estacion(this.p.raza);
    const ajena = this.estacion(this.enemigo);
    const antes = this.acoplada;
    this.acoplada =
      n.controlable &&
      hpEstacion(this.p, propia.def.id) > 0 &&
      dist(n.pos, propia.pos) < RADIO_ACOPLE &&
      largo(resta(n.vel, propia.vel)) < 15;
    if (this.acoplada && !antes) this.avisar(`Junto a ${propia.def.nombre}: [E] mercado · [R] recuperar la nave.`, 'bien');
    const natal = natalDe(this.p.raza);
    this.enCasa = n.controlable && n.posado?.cuerpo === natal.id;

    const dAjena = dist(n.pos, ajena.pos);
    if (dAjena < 50_000 && hpEstacion(this.p, ajena.def.id) > 0) {
      subirTension(this.p.diplomacia, dt * 0.25);
      const d = this.p.diplomacia;
      if (d.estado === 'guerra' && dAjena < 40_000 && this.t - this.ultimaDefensa > 240 && d.fuerza > 5) {
        this.ultimaDefensa = this.t;
        const tam = tamanoIncursion(d);
        for (let i = 0; i < tam.naves; i++) {
          const pos = suma(ajena.pos, polar(this.azar() * Math.PI * 2, 400 + this.azar() * 400));
          this.nuevaEnemiga(tam.nivel, pos, ajena.vel, 'jugador');
        }
        this.avisar(`${ajena.def.nombre} lanza ${tam.naves} naves de defensa.`, 'peligro');
        this.eventos.push('alerta');
      }
    }
  }

  /** Vuelve al hangar con lo que quede: reembolso y carga al almacén. */
  recuperar(): { reembolso: number; carga: number } | null {
    const n = this.jugador;
    if (!n.controlable || !(this.acoplada || this.enCasa)) return null;
    const reembolso = Math.round(n.valor() * 0.9);
    const carga = masaInventario(n.carga);
    this.p.creditos += reembolso;
    sumarInventario(this.p.almacen, n.carga);
    n.carga = {};
    this.terminado = 'recuperada';
    return { reembolso, carga };
  }

  /** Lo que cuesta llenar los tanques y reparar en la estación. */
  costeServicio(): { combustible: number; reparacion: number; precioComb: number } {
    const n = this.jugador;
    let falta = 0;
    let dano = 0;
    for (const x of n.nodos) {
      if (!x.parte.solido) falta += (x.parte.combustible ?? 0) - x.comb;
      dano += (x.parte.hp - x.hp) / x.parte.hp * x.parte.coste * 0.5;
    }
    const precioComb = 120;
    return { combustible: Math.ceil(falta * precioComb), reparacion: Math.ceil(dano), precioComb };
  }

  repostarYReparar(): boolean {
    const s = this.costeServicio();
    const total = s.combustible + s.reparacion;
    if (total <= 0 || this.p.creditos < total) return false;
    this.p.creditos -= total;
    for (const x of this.jugador.nodos) {
      if (!x.parte.solido) x.comb = x.parte.combustible ?? 0;
      x.hp = x.parte.hp;
    }
    this.jugador.energia = this.jugador.energiaMax();
    this.jugador.escudo = this.jugador.escudoMax();
    return true;
  }

  // ------------------------------------------------------------ partículas

  chispas(p: V, vel: V, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = this.azar() * Math.PI * 2;
      const s = 5 + this.azar() * 40;
      this.particulas.push({ pos: p, vel: suma(vel, polar(a, s)), vida: 0.3 + this.azar() * 0.6, max: 0.9, color, tam: 1 + this.azar() * 1.5, crece: 0 });
    }
  }

  explosion(p: V, vel: V, tam: number): void {
    this.eventos.push('explosion');
    const k = Math.min(80, Math.round(10 + tam));
    for (let i = 0; i < k; i++) {
      const a = this.azar() * Math.PI * 2;
      const s = this.azar() * tam * 2;
      const col = this.azar() < 0.4 ? '#fff2b0' : this.azar() < 0.6 ? '#ff9a3c' : '#c24a1c';
      this.particulas.push({ pos: p, vel: suma(vel, polar(a, s)), vida: 0.5 + this.azar() * 1.2, max: 1.7, color: col, tam: tam * 0.08 + this.azar() * tam * 0.12, crece: 2 });
    }
    for (let i = 0; i < k / 2; i++) {
      const a = this.azar() * Math.PI * 2;
      const s = this.azar() * tam;
      this.particulas.push({ pos: p, vel: suma(vel, polar(a, s)), vida: 1.5 + this.azar() * 2, max: 3.5, color: '#555', tam: tam * 0.1, crece: 4 });
    }
  }

  private particulasPaso(dt: number, dtJuego: number): void {
    // Humo de los motores encendidos.
    if (this.warp <= 4) {
      for (const n of this.naves) {
        if (!n.encendida || n.destruida) continue;
        const g = n.geometria;
        for (let i = n.inicioEtapa(); i < n.nodos.length; i++) {
          const x = n.nodos[i]!;
          const motores: { parte: typeof x.parte; lados: number[] }[] = [];
          if (x.parte.empuje && (x.parte.solido ? x.comb > 0 : n.acel > 0 && (n.combustibleEtapa() > 0 || n.combustibleInfinito))) motores.push({ parte: x.parte, lados: [0] });
          if (x.radial?.empuje && x.combRadial > 0) motores.push({ parte: x.radial, lados: [1, -1] });
          for (const m of motores) {
            for (const lado of m.lados) {
              if (this.azar() > 0.6) continue;
              const yBase = (g.ys[i] ?? 0) + (lado === 0 ? x.parte.alto : x.parte.alto / 2 + m.parte.alto / 2);
              let o = n.puntoEje(yBase);
              if (lado !== 0) o = suma(o, escala(polar(n.ang - Math.PI / 2), (x.parte.ancho / 2 + m.parte.ancho / 2) * lado));
              const atras = escala(n.dir, -(30 + this.azar() * 40));
              const j = polar(this.azar() * Math.PI * 2, this.azar() * 6);
              this.particulas.push({ pos: o, vel: suma(suma(n.vel, atras), j), vida: 1.2 + this.azar(), max: 2.2, color: '#9a9aa0', tam: m.parte.ancho * 0.5, crece: 3 });
            }
          }
        }
      }
    }
    for (const q of this.particulas) {
      q.pos = suma(q.pos, escala(q.vel, Math.min(dtJuego, 0.1)));
      q.vida -= dt;
    }
    this.particulas = this.particulas.filter((q) => q.vida > 0);
    if (this.particulas.length > 2500) this.particulas.splice(0, this.particulas.length - 2500);
  }
}

export { hpMaxEstacion };
