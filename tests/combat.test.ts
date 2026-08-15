import { describe, expect, it } from 'vitest';
import { JUGADOR_ALTO, JUGADOR_ANCHO, TILE } from '../src/core/constants';
import {
  cajaGolpe,
  crearGolpe,
  lanzarGolpe,
  puedeGolpear,
  resolverGolpe,
  tickGolpe,
  TICKS_GOLPE,
} from '../src/entities/combat';
import {
  actualizarEnemigos,
  botinDe,
  centro,
  crearEnemigo,
  danarEnemigo,
  ENEMIGOS,
  moverEnemigo,
  pensar,
  solapan,
  type Enemigo,
} from '../src/entities/enemies';
import { crearCaja, type Caja } from '../src/entities/physics';
import {
  corazones,
  crearSalud,
  curar,
  golpear,
  revivir,
  tickSalud,
  TICKS_INVULNERABLE,
  VIDA_MAXIMA,
} from '../src/entities/salud';
import {
  biomaEn,
  especiesPosibles,
  intentarAparicion,
  TOPE_ENEMIGOS,
} from '../src/entities/spawner';
import { defObjeto, ESPADA_HIERRO, ESPADA_MADERA, GEL, HUESO } from '../src/items/items';
import { ARENA, NIEVE, PIEDRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

const SUELO = 20;

function mundoPlano(ancho = 120, alto = 60): Mundo {
  const m = new Mundo(ancho, alto);
  m.rellenar(0, SUELO, ancho - 1, alto - 1, PIEDRA);
  return m;
}

function jugadorEn(tx: number): Caja {
  return crearCaja(tx * TILE, SUELO * TILE - JUGADOR_ALTO, JUGADOR_ANCHO, JUGADOR_ALTO);
}

describe('salud', () => {
  it('empieza llena y viva', () => {
    const s = crearSalud();
    expect(s.vida).toBe(VIDA_MAXIMA);
    expect(s.muerto).toBe(false);
  });

  it('un golpe resta vida, da invulnerabilidad y empuja', () => {
    const s = crearSalud();
    const c = jugadorEn(10);
    const entra = golpear(s, c, 20, c.x - 40);
    expect(entra).toBe(true);
    expect(s.vida).toBe(VIDA_MAXIMA - 20);
    expect(s.invulnerable).toBe(TICKS_INVULNERABLE);
    // Empujado hacia la derecha, en sentido contrario a la fuente.
    expect(c.vx).toBeGreaterThan(0);
    expect(c.vy).toBeLessThan(0);
  });

  it('el empujón va en la dirección contraria a la fuente', () => {
    const s = crearSalud();
    const c = jugadorEn(10);
    golpear(s, c, 5, c.x + 200);
    expect(c.vx).toBeLessThan(0);
  });

  it('mientras dura la invulnerabilidad no entra ningún golpe', () => {
    const s = crearSalud();
    const c = jugadorEn(10);
    golpear(s, c, 20, 0);
    expect(golpear(s, c, 20, 0)).toBe(false);
    expect(s.vida).toBe(VIDA_MAXIMA - 20);
  });

  it('la invulnerabilidad se agota con el tiempo', () => {
    const s = crearSalud();
    const c = jugadorEn(10);
    golpear(s, c, 10, 0);
    for (let i = 0; i < TICKS_INVULNERABLE; i++) tickSalud(s);
    expect(s.invulnerable).toBe(0);
    expect(golpear(s, c, 10, 0)).toBe(true);
  });

  it('sin invulnerabilidad, el daño continuo mataría en un instante', () => {
    // Es exactamente lo que los fotogramas de gracia evitan.
    const s = crearSalud();
    const c = jugadorEn(10);
    for (let i = 0; i < 20; i++) {
      s.invulnerable = 0;
      golpear(s, c, 12, 0);
    }
    expect(s.muerto).toBe(true);
  });

  it('llegar a cero mata y revivir devuelve la vida', () => {
    const s = crearSalud();
    const c = jugadorEn(10);
    golpear(s, c, VIDA_MAXIMA + 50, 0);
    expect(s.vida).toBe(0);
    expect(s.muerto).toBe(true);
    revivir(s);
    expect(s.vida).toBe(VIDA_MAXIMA);
    expect(s.muerto).toBe(false);
  });

  it('curar no pasa del máximo', () => {
    const s = crearSalud();
    const c = jugadorEn(10);
    golpear(s, c, 30, 0);
    curar(s, 100);
    expect(s.vida).toBe(VIDA_MAXIMA);
  });

  it('los corazones reflejan la vida', () => {
    const s = crearSalud();
    expect(corazones(s).llenos).toBe(5);
    s.vida = 50;
    const c = corazones(s);
    expect(c.llenos).toBe(2);
    expect(c.parcial).toBeCloseTo(0.5, 5);
  });
});

describe('enemigos', () => {
  it('cada especie tiene vida, daño y botín', () => {
    for (const def of Object.values(ENEMIGOS)) {
      expect(def.vida).toBeGreaterThan(0);
      expect(def.dano).toBeGreaterThan(0);
      expect(def.botinMax).toBeGreaterThan(0);
    }
  });

  it('el slime salta hacia el jugador cuando toca', () => {
    const e = crearEnemigo('slime', 20 * TILE, (SUELO - 1) * TILE);
    e.caja.enSuelo = true;
    e.reloj = 100; // temporizador ya vencido
    pensar(e, { x: 40 * TILE, y: SUELO * TILE });
    expect(e.caja.vy).toBeLessThan(0);
    expect(e.caja.vx).toBeGreaterThan(0);
  });

  it('el slime no corrige en el aire', () => {
    const e = crearEnemigo('slime', 20 * TILE, 10 * TILE);
    e.caja.enSuelo = false;
    e.caja.vx = 0;
    pensar(e, { x: 40 * TILE, y: SUELO * TILE });
    expect(e.caja.vx).toBe(0);
  });

  it('el zombi camina hacia el jugador', () => {
    const e = crearEnemigo('zombi', 30 * TILE, (SUELO - 3) * TILE);
    e.caja.enSuelo = true;
    pensar(e, { x: 10 * TILE, y: SUELO * TILE });
    expect(e.caja.vx).toBeLessThan(0);
    expect(e.caja.mirando).toBe(-1);
  });

  it('el zombi salta cuando le cortan el paso', () => {
    const m = mundoPlano();
    m.rellenar(32, SUELO - 3, 32, SUELO - 1, PIEDRA);
    const e = crearEnemigo('zombi', 31 * TILE, (SUELO - 3) * TILE);
    let salto = false;
    for (let i = 0; i < 90 && !salto; i++) {
      pensar(e, { x: 45 * TILE, y: SUELO * TILE });
      moverEnemigo(m, e);
      if (e.caja.vy < -1) salto = true;
    }
    expect(salto).toBe(true);
  });

  it('el murciélago vuela: no cae', () => {
    const m = mundoPlano();
    const e = crearEnemigo('murcielago', 30 * TILE, 5 * TILE);
    const yInicial = e.caja.y;
    for (let i = 0; i < 60; i++) moverEnemigo(m, e);
    // Sin gravedad, y sin objetivo no se hunde hasta el suelo.
    expect(e.caja.y).toBeLessThan(yInicial + 5 * TILE);
  });

  it('ninguno atraviesa el suelo', () => {
    const m = mundoPlano();
    for (const especie of ['slime', 'zombi'] as const) {
      const e = crearEnemigo(especie, 30 * TILE, 2 * TILE);
      for (let i = 0; i < 200; i++) {
        pensar(e, { x: 30 * TILE, y: SUELO * TILE });
        moverEnemigo(m, e);
      }
      expect(e.caja.y + e.caja.alto).toBeLessThanOrEqual(SUELO * TILE + 0.001);
    }
  });

  it('recibir daño puede matarlo y el botín es de su especie', () => {
    const e = crearEnemigo('slime', 0, 0);
    expect(danarEnemigo(e, 10, -100)).toBe(false);
    // Los enemigos también tienen su ventana de gracia, más corta que la del
    // jugador: sin dejarla pasar, el segundo golpe ni se registra.
    expect(danarEnemigo(e, 100, -100)).toBe(false);
    for (let i = 0; i < 12; i++) tickSalud(e.salud);
    expect(danarEnemigo(e, 100, -100)).toBe(true);
    expect(e.salud.muerto).toBe(true);
    expect(botinDe('slime', () => 0).objeto).toBe(GEL);
    expect(botinDe('zombi', () => 0).objeto).toBe(HUESO);
  });

  it('el contacto hace daño al jugador solo si no está invulnerable', () => {
    const m = mundoPlano();
    const jugador = jugadorEn(30);
    const e = crearEnemigo('zombi', jugador.x, jugador.y);
    const enemigos: Enemigo[] = [e];

    const conGracia = actualizarEnemigos(m, enemigos, jugador, { invulnerable: 10 });
    expect(conGracia.danoAlJugador).toBe(0);

    const sinGracia = actualizarEnemigos(m, enemigos, jugador, { invulnerable: 0 });
    expect(sinGracia.danoAlJugador).toBe(ENEMIGOS.zombi.dano);
  });

  it('los que se quedan muy lejos acaban desapareciendo', () => {
    const m = mundoPlano(400);
    const jugador = jugadorEn(10);
    const e = crearEnemigo('slime', 350 * TILE, (SUELO - 1) * TILE);
    const enemigos = [e];
    for (let i = 0; i < 700; i++) {
      actualizarEnemigos(m, enemigos, jugador, { invulnerable: 0 });
    }
    expect(e.vivo).toBe(false);
  });
});

describe('golpe cuerpo a cuerpo', () => {
  it('el arma marca daño, cadencia y alcance', () => {
    const def = defObjeto(ESPADA_MADERA);
    expect(def.dano).toBeGreaterThan(0);
    expect(def.cadencia).toBeGreaterThan(0);
    expect(def.alcance).toBeGreaterThan(0);
  });

  it('no se puede volver a golpear hasta que pasa la cadencia', () => {
    const g = crearGolpe();
    expect(lanzarGolpe(g, ESPADA_MADERA, 1)).toBe(true);
    expect(lanzarGolpe(g, ESPADA_MADERA, 1)).toBe(false);
    const cadencia = defObjeto(ESPADA_MADERA).cadencia!;
    for (let i = 0; i < cadencia; i++) tickGolpe(g);
    expect(puedeGolpear(g)).toBe(true);
  });

  it('la caja del golpe sale delante y cambia con la dirección', () => {
    const g = crearGolpe();
    const j = jugadorEn(10);
    lanzarGolpe(g, ESPADA_MADERA, 1);
    const derecha = cajaGolpe(g, j)!;
    expect(derecha.x).toBeGreaterThanOrEqual(j.x + j.ancho);

    const g2 = crearGolpe();
    lanzarGolpe(g2, ESPADA_MADERA, -1);
    const izquierda = cajaGolpe(g2, j)!;
    expect(izquierda.x + izquierda.ancho).toBeLessThanOrEqual(j.x + 0.001);
  });

  it('sin golpe activo no hay caja', () => {
    expect(cajaGolpe(crearGolpe(), jugadorEn(10))).toBeNull();
  });

  it('alcanza al enemigo que tiene delante y no al de detrás', () => {
    const g = crearGolpe();
    const j = jugadorEn(10);
    const delante = crearEnemigo('slime', j.x + j.ancho + 4, j.y);
    const detras = crearEnemigo('slime', j.x - 80, j.y);
    lanzarGolpe(g, ESPADA_HIERRO, 1);
    const r = resolverGolpe(g, j, [delante, detras]);
    expect(r.alcanzados).toBe(1);
    expect(delante.salud.vida).toBeLessThan(delante.salud.vidaMax);
    expect(detras.salud.vida).toBe(detras.salud.vidaMax);
  });

  it('un mismo mandoble no pega dos veces al mismo enemigo', () => {
    const g = crearGolpe();
    const j = jugadorEn(10);
    const e = crearEnemigo('zombi', j.x + j.ancho + 2, j.y);
    lanzarGolpe(g, ESPADA_HIERRO, 1);
    resolverGolpe(g, j, [e]);
    const tras1 = e.salud.vida;
    for (let i = 0; i < TICKS_GOLPE - 1; i++) {
      tickGolpe(g);
      resolverGolpe(g, j, [e]);
    }
    expect(e.salud.vida).toBe(tras1);
  });

  it('una espada mejor mata en menos golpes', () => {
    const golpes = (arma: number): number => {
      const g = crearGolpe();
      const j = jugadorEn(10);
      const e = crearEnemigo('zombi', j.x + j.ancho + 2, j.y);
      let n = 0;
      while (!e.salud.muerto && n < 50) {
        if (lanzarGolpe(g, arma, 1)) {
          resolverGolpe(g, j, [e]);
          n++;
        }
        tickGolpe(g);
        // La invulnerabilidad del enemigo también se consume.
        e.salud.invulnerable = 0;
      }
      return n;
    };
    expect(golpes(ESPADA_HIERRO)).toBeLessThan(golpes(ESPADA_MADERA));
  });

  it('solapan detecta el contacto', () => {
    const a = jugadorEn(10);
    const b = crearEnemigo('slime', a.x + 4, a.y).caja;
    expect(solapan(a, b)).toBe(true);
    const lejos = crearEnemigo('slime', a.x + 500, a.y).caja;
    expect(solapan(a, lejos)).toBe(false);
  });
});

describe('aparición de enemigos', () => {
  it('de día en la superficie solo salen slimes', () => {
    const especies = especiesPosibles({ esNoche: false, superficieTy: SUELO , bioma: 'bosque' }, SUELO - 2);
    expect(especies).toEqual(['slime']);
  });

  it('de noche en la superficie salen zombis', () => {
    const especies = especiesPosibles({ esNoche: true, superficieTy: SUELO , bioma: 'bosque' }, SUELO - 2);
    expect(especies).toContain('zombi');
  });

  it('bajo tierra hay peligro a cualquier hora', () => {
    const especies = especiesPosibles({ esNoche: false, superficieTy: SUELO , bioma: 'bosque' }, SUELO + 60);
    expect(especies).toContain('murcielago');
    expect(especies).toContain('zombi');
  });

  it('cada bioma de superficie tiene su bicho', () => {
    const desierto = especiesPosibles(
      { esNoche: false, superficieTy: SUELO, bioma: 'desierto' },
      SUELO - 2,
    );
    expect(desierto).toEqual(['escarabajo']);
    const nieve = especiesPosibles(
      { esNoche: true, superficieTy: SUELO, bioma: 'nieve' },
      SUELO - 2,
    );
    expect(nieve).toContain('lobo');
  });

  it('bajo tierra el bioma da igual: manda la profundidad', () => {
    const hondo = especiesPosibles(
      { esNoche: false, superficieTy: SUELO, bioma: 'desierto' },
      SUELO + 60,
    );
    expect(hondo).not.toContain('escarabajo');
  });

  it('el bioma se deduce del suelo que se pisa', () => {
    const m = mundoPlano();
    expect(biomaEn(m, 10, SUELO - 3)).toBe('bosque');
    m.rellenar(10, SUELO, 10, SUELO + 4, ARENA);
    expect(biomaEn(m, 10, SUELO - 3)).toBe('desierto');
    m.rellenar(10, SUELO, 10, SUELO + 4, NIEVE);
    expect(biomaEn(m, 10, SUELO - 3)).toBe('nieve');
  });

  it('aparecen lejos del jugador, no encima', () => {
    const m = mundoPlano(300);
    const jugador = jugadorEn(150);
    const enemigos: Enemigo[] = [];
    let aparecido = null;
    for (let i = 0; i < 60 && !aparecido; i++) {
      aparecido = intentarAparicion(
        m,
        enemigos,
        jugador,
        { esNoche: true, superficieTy: SUELO , bioma: 'bosque' },
        () => (i % 10) / 10 + 0.05,
      );
    }
    if (aparecido) {
      const d = Math.abs(centro(aparecido.caja).x - centro(jugador).x) / TILE;
      expect(d).toBeGreaterThan(15);
    }
  });

  it('no se pasa del tope de enemigos', () => {
    const m = mundoPlano(300);
    const jugador = jugadorEn(150);
    const enemigos: Enemigo[] = [];
    for (let i = 0; i < 300; i++) {
      intentarAparicion(m, enemigos, jugador, { esNoche: true, superficieTy: SUELO , bioma: 'bosque' });
    }
    expect(enemigos.filter((e) => e.vivo).length).toBeLessThanOrEqual(TOPE_ENEMIGOS);
  });
});
