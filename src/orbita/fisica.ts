/**
 * El paso de física de una nave: gravedad del cuerpo dominante (cónicas
 * enlazadas), empuje, resistencia del aire, giro, y contacto con el suelo.
 */
import type { Nave } from './nave';
import {
  type Cuerpo,
  acelCuerpo,
  cuerpo,
  densidad,
  dominante,
  posCuerpo,
  presion,
  relieve,
  velCuerpo,
} from './sistema';
import { type V, angulo, clamp, difAngulo, escala, largo, polar, punto, resta, suma, unit } from './vec';

export interface Contacto {
  tipo: 'aterriza' | 'choca' | 'despega';
  cuerpo: Cuerpo;
  velocidad: number;
}

export interface Telemetria {
  cuerpo: Cuerpo;
  altitud: number;
  /** Velocidad respecto al cuerpo dominante. */
  velRel: V;
  rho: number;
  presion: number;
  empuje: number;
  gravedad: number;
}

export function altitudDe(c: Cuerpo, p: V, t: number): number {
  const rel = resta(p, posCuerpo(c, t));
  return largo(rel) - c.radio - relieve(c, angulo(rel));
}

/** Telemetría sin avanzar nada. */
export function telemetria(n: Nave, t: number): Telemetria {
  const c = dominante(n.pos, t);
  const rel = resta(n.pos, posCuerpo(c, t));
  const r = largo(rel);
  const alt = r - c.radio - relieve(c, angulo(rel));
  const rho = densidad(c, alt);
  return {
    cuerpo: c,
    altitud: alt,
    velRel: resta(n.vel, velCuerpo(c, t)),
    rho,
    presion: presion(c, alt),
    empuje: 0,
    gravedad: c.gm / (r * r),
  };
}

/** Tolerancia de aterrizaje, en m/s. */
export function toleranciaAterrizaje(n: Nave): number {
  return n.tienePatas() ? 14 : 8;
}

/**
 * Avanza la nave `dt` segundos. Devuelve un contacto si ha tocado suelo, ha
 * despegado o se ha estrellado.
 */
export function pasoNave(n: Nave, dt: number, t: number): Contacto | null {
  if (n.destruida) return null;
  const c = dominante(n.pos, t);
  const cp = posCuerpo(c, t);
  const cv = velCuerpo(c, t);
  const rel = resta(n.pos, cp);
  const r = largo(rel);
  const arriba = unit(rel);
  const alt = r - c.radio - relieve(c, angulo(rel));
  const rho = densidad(c, alt);
  const pres = presion(c, alt);
  const masa = n.masa();
  const g = c.gm / (r * r);

  // --- Energía y escudos
  const eMax = n.energiaMax();
  n.energia = Math.min(eMax, n.energia + n.generacion() * dt);
  const er = n.escudoRegen();
  if (n.escudo < n.escudoMax() && er.regen > 0 && n.energia > er.consumo * dt) {
    n.escudo = Math.min(n.escudoMax(), n.escudo + er.regen * dt);
    n.energia -= er.consumo * dt;
  }

  // --- Giro
  const par = n.par(rho) * (n.energia > 0 || eMax === 0 ? 1 : 0.15);
  const empujeMax = n.empujeMax();
  const parMotores = n.encendida ? empujeMax * 0.04 * Math.max(n.acel, n.hayMotorSolidoArdiendo() ? 1 : 0) : 0;
  const alfaMax = (par + parMotores) / n.geometria.inercia;
  if (n.giro !== 0) {
    n.omega += clamp(n.giro, -1, 1) * alfaMax * dt;
    if (n.energia > 0) n.energia = Math.max(0, n.energia - Math.abs(n.giro) * 0.3 * dt);
  } else if (n.sas) {
    const freno = alfaMax * dt;
    n.omega = Math.abs(n.omega) <= freno ? 0 : n.omega - Math.sign(n.omega) * freno;
  }
  n.omega = clamp(n.omega, -3, 3);
  // El aire endereza la nave hacia la dirección de vuelo si lleva aletas o cono.
  const vAire = resta(n.vel, cv);
  const va = largo(vAire);
  if (rho > 0.001 && va > 20 && !n.posado) {
    const estab = n.par(rho) - n.par(0);
    if (estab > 0) {
      const d = difAngulo(n.ang, angulo(vAire));
      n.omega += d * estab * rho * 0.002 * dt * Math.min(1, va / 200);
    }
  }
  n.ang += n.omega * dt;

  // --- Empuje
  const empuje = n.quemar(dt, pres);
  const aEmpuje = escala(n.dir, empuje / masa);

  // --- Posado: o despega o sigue pegado al suelo.
  if (n.posado) {
    const pc = cuerpo(n.posado.cuerpo);
    const ppos = posCuerpo(pc, t);
    const up = polar(n.posado.ang);
    const subida = punto(aEmpuje, up);
    const gp = pc.gm / Math.pow(largo(resta(n.pos, ppos)), 2);
    if (subida > gp * 1.02) {
      n.posado = null;
      n.vel = suma(velCuerpo(pc, t), escala(aEmpuje, dt));
      return { tipo: 'despega', cuerpo: pc, velocidad: 0 };
    }
    const g2 = n.geometria;
    const h = pc.radio + relieve(pc, n.posado.ang) + (g2.largo - g2.ycm) + 0.05;
    n.pos = suma(ppos, escala(up, h));
    n.vel = velCuerpo(pc, t);
    // Se endereza solo, poco a poco.
    const d = difAngulo(n.ang, n.posado.ang);
    n.ang += d * Math.min(1, dt * 3);
    n.omega = 0;
    return null;
  }

  // --- Gravedad (y aceleración del propio cuerpo: así el movimiento relativo es una cónica exacta)
  const aG = suma(escala(arriba, -g), acelCuerpo(c, t));

  // --- Resistencia
  let aDrag = { x: 0, y: 0 };
  if (rho > 0 && va > 0.01) {
    const radio = n.geometria.anchoMax / 2;
    let cdA = 0.9 * n.aerodinamica() * Math.PI * radio * radio;
    if (n.paracaidas) {
      const areaPar = n.areaParacaidas();
      // El paracaídas no aguanta a mucha velocidad: se abre del todo por debajo de 250 m/s.
      cdA += areaPar * clamp((300 - va) / 100, 0.05, 1);
    }
    const f = 0.5 * rho * va * va * cdA; // N
    const a = Math.min(f / (masa * 1000), va / dt); // no invertir el sentido en un paso
    aDrag = escala(vAire, -a / va);
  }

  const a = suma(suma(aG, aEmpuje), aDrag);
  n.vel = suma(n.vel, escala(a, dt));
  n.pos = suma(n.pos, escala(n.vel, dt));

  // --- Contacto con el suelo
  const g2 = n.geometria;
  const cola = n.puntoEje(g2.largo);
  const nariz = n.puntoEje(0);
  const cpNuevo = posCuerpo(c, t + dt);
  const altCola = altitudDe(c, cola, t + dt);
  const altNariz = altitudDe(c, nariz, t + dt);
  if (Math.min(altCola, altNariz) > 0) return null;

  const relN = resta(n.pos, cpNuevo);
  const up = unit(relN);
  const vRel = resta(n.vel, velCuerpo(c, t + dt));
  const rapidez = largo(vRel);
  const inclinacion = Math.abs(difAngulo(n.ang, angulo(up)));
  const tol = toleranciaAterrizaje(n);
  const tocaCola = altCola <= altNariz;
  if (tocaCola && ((rapidez < tol && inclinacion < 0.35) || (rapidez < tol * 0.5 && inclinacion < 0.8))) {
    n.posado = { cuerpo: c.id, ang: angulo(relN) };
    n.paracaidas = false;
    n.acel = n.hayMotorSolidoArdiendo() ? n.acel : 0;
    n.vel = velCuerpo(c, t + dt);
    n.omega = 0;
    const h = c.radio + relieve(c, n.posado.ang) + (g2.largo - g2.ycm) + 0.05;
    n.pos = suma(cpNuevo, escala(up, h));
    return { tipo: 'aterriza', cuerpo: c, velocidad: rapidez };
  }
  if (n.inmortal) {
    // En modo dios el suelo empuja en vez de matar.
    const h = c.radio + relieve(c, angulo(relN)) + (g2.largo - g2.ycm) + 0.1;
    n.pos = suma(cpNuevo, escala(up, h));
    n.vel = velCuerpo(c, t + dt);
    n.posado = { cuerpo: c.id, ang: angulo(relN) };
    return { tipo: 'aterriza', cuerpo: c, velocidad: rapidez };
  }
  n.destruida = true;
  n.motivo = `se estrelló contra ${c.nombre} a ${rapidez.toFixed(0)} m/s`;
  return { tipo: 'choca', cuerpo: c, velocidad: rapidez };
}

/**
 * Paso máximo estable para la nave: una fracción del periodo de una órbita
 * circular a esa distancia. En órbita baja de Gaia sale medio segundo.
 */
export function pasoMaximo(n: Nave, t: number): number {
  const c = dominante(n.pos, t);
  const r = largo(resta(n.pos, posCuerpo(c, t)));
  return clamp(0.002 * Math.sqrt((r * r * r) / c.gm), 0.02, 2);
}
