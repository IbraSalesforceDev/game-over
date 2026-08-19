import { describe, expect, it } from 'vitest';
import { VERSION_ACTUAL, VERSIONES } from '../src/core/versiones';
import { EFECTOS } from '../src/entities/efectos';
import { guantesDeElite, GUANTES_DE_ELITE } from '../src/entities/enemies';
import {
  crearEquipo,
  indiceDeHueco,
  poderPuesto,
  represaliasPuestas,
} from '../src/items/equipado';
import {
  CLASES_FILO,
  CLASES_PODER,
  CLASES_REPRESALIA,
  REPRESALIAS,
  textoRepresalia,
  crearEstadoPoder,
  FILOS,
  gastarPoder,
  PODERES,
  poderListo,
  textoFilo,
  textoPoder,
  tickPoder,
} from '../src/items/inscripciones';
import {
  defObjeto,
  esArma,
  esArmadura,
  ESPADA_BRASA,
  ESPADA_CAVERNA,
  ESPADA_GUARDIAN,
  ESPADA_INFERNITA,
  ESPADA_LIMO,
  filoDe,
  inscripcionDe,
  objetoExisteEn,
  GUANTES_BRASA,
  GUANTES_PONZONA,
  PETO_ARENA,
  PETO_BRASA,
  PETO_CAVERNA,
  PETO_ESCARCHA,
  PETO_INFERNITA,
  PETO_LIMO,
  PETO_ORO,
  PETO_SELVA,
  poderDe,
  defensaDe,
} from '../src/items/items';
import { RECETAS } from '../src/items/recipes';
import { JEFES, CLASES_JEFE } from '../src/world/jefes';
import { YUNQUE } from '../src/world/tiles';

const ESPADAS = [
  ESPADA_LIMO,
  245,
  246,
  247,
  ESPADA_CAVERNA,
  ESPADA_BRASA,
] as const;
const PETOS = [PETO_LIMO, PETO_ARENA, PETO_ESCARCHA, PETO_SELVA, PETO_CAVERNA, PETO_BRASA] as const;

describe('las inscripciones', () => {
  it('hay seis filos y seis poderes, uno por jefe', () => {
    expect(CLASES_FILO).toHaveLength(6);
    expect(CLASES_PODER).toHaveLength(6);
    expect(CLASES_JEFE).toHaveLength(6);
  });

  it('cada filo hace algo: efecto, cura, doble golpe o daño extra', () => {
    for (const clase of CLASES_FILO) {
      const d = FILOS[clase];
      const hace =
        d.efecto !== undefined || d.curacion > 0 || d.probDoble > 0 || d.bonusHondo !== 1;
      expect(hace, clase).toBe(true);
      expect(d.nombre.length, clase).toBeGreaterThan(0);
      expect(d.texto.length, clase).toBeGreaterThan(0);
    }
  });

  it('el filo que pega estado nombra uno que existe', () => {
    for (const clase of CLASES_FILO) {
      const e = FILOS[clase].efecto;
      if (e === undefined) continue;
      expect(EFECTOS[e], clase).toBeDefined();
      expect(FILOS[clase].duracionEfecto, clase).toBeGreaterThan(0);
    }
  });

  it('cada poder hace algo, y ninguno mata por sí solo', () => {
    for (const clase of CLASES_PODER) {
      const d = PODERES[clase];
      const hace =
        d.efectoPropio !== undefined || d.efectoCercano !== undefined || d.danoProyectil > 0;
      expect(hace, clase).toBe(true);
      expect(d.recarga, clase).toBeGreaterThan(60);
      // El que reparte necesita radio; el que no reparte, no.
      if (d.efectoCercano !== undefined) expect(d.radio, clase).toBeGreaterThan(0);
    }
  });

  it('los textos llevan la inscripción entre comillas', () => {
    for (const clase of CLASES_FILO) expect(textoFilo(clase)).toContain(FILOS[clase].nombre);
    for (const clase of CLASES_PODER) {
      expect(textoPoder(clase)).toContain(PODERES[clase].nombre);
      // Todos dicen con qué tecla van: sin eso la inscripción no se usa nunca.
      expect(textoPoder(clase)).toContain('Q:');
    }
  });
});

describe('la recarga del poder', () => {
  it('empieza listo', () => {
    expect(poderListo(crearEstadoPoder())).toBe(true);
  });

  it('gastarlo lo deja fuera de juego el tiempo que diga su tabla', () => {
    const e = crearEstadoPoder();
    gastarPoder(e, 'bolaDeFuego');
    expect(poderListo(e)).toBe(false);
    for (let i = 0; i < PODERES.bolaDeFuego.recarga - 1; i++) tickPoder(e);
    expect(poderListo(e)).toBe(false);
    tickPoder(e);
    expect(poderListo(e)).toBe(true);
  });

  it('la recarga no baja de cero', () => {
    const e = crearEstadoPoder();
    for (let i = 0; i < 100; i++) tickPoder(e);
    expect(e.restante).toBe(0);
  });
});

describe('el equipo de bioma', () => {
  it('las seis espadas son armas con filo, y no todas el mismo', () => {
    const filos = new Set<string>();
    for (const id of ESPADAS) {
      expect(esArma(id), defObjeto(id).nombre).toBe(true);
      const f = filoDe(id);
      expect(f, defObjeto(id).nombre).not.toBeNull();
      filos.add(f!);
    }
    expect(filos.size).toBe(6);
  });

  it('los seis petos son armadura con poder, y no todos el mismo', () => {
    const poderes = new Set<string>();
    for (const id of PETOS) {
      expect(esArmadura(id), defObjeto(id).nombre).toBe(true);
      const p = poderDe(id);
      expect(p, defObjeto(id).nombre).not.toBeNull();
      poderes.add(p!);
    }
    expect(poderes.size).toBe(6);
  });

  it('las espadas pegan menos que las de arriba, y llegan más lejos', () => {
    // Lo que se paga es la inscripción, no el número. Si además fueran las que
    // más pegan, la escalera de metales de 5.0.0 se quedaría sin sentido.
    for (const id of ESPADAS) {
      const d = defObjeto(id);
      expect(d.dano ?? 0, d.nombre).toBeLessThan(defObjeto(ESPADA_INFERNITA).dano ?? 0);
      expect(d.dano ?? 0, d.nombre).toBeLessThan(defObjeto(ESPADA_GUARDIAN).dano ?? 0);
      expect(d.alcance ?? 0, d.nombre).toBeGreaterThan(
        defObjeto(ESPADA_GUARDIAN).alcance ?? 0,
      );
    }
  });

  it('las seis pegan exactamente igual: no son una escalera', () => {
    const danos = new Set(ESPADAS.map((id) => defObjeto(id).dano));
    expect(danos.size).toBe(1);
  });

  it('los petos defienden más que el de oro y menos que el de infernita', () => {
    for (const id of PETOS) {
      expect(defensaDe(id), defObjeto(id).nombre).toBeGreaterThan(defensaDe(PETO_ORO));
      expect(defensaDe(id), defObjeto(id).nombre).toBeLessThan(defensaDe(PETO_INFERNITA));
    }
  });

  it('todo lo del equipo enseña su inscripción, y lo demás no', () => {
    for (const id of [...ESPADAS, ...PETOS]) {
      expect(inscripcionDe(id), defObjeto(id).nombre).not.toBe('');
    }
    expect(inscripcionDe(ESPADA_GUARDIAN)).toBe('');
    expect(inscripcionDe(PETO_ORO)).toBe('');
  });

  it('nada de esto existe antes de 7.1.0', () => {
    for (const id of [...ESPADAS, ...PETOS]) {
      expect(objetoExisteEn(id, '7.0.0'), defObjeto(id).nombre).toBe(false);
      expect(objetoExisteEn(id, '7.1.0'), defObjeto(id).nombre).toBe(true);
    }
  });

  it('cada pieza pide el trofeo de su jefe, y solo el suyo', () => {
    const trofeos = new Set(CLASES_JEFE.map((c) => JEFES[c].trofeo));
    for (const id of [...ESPADAS, ...PETOS]) {
      const r = RECETAS.find((x) => x.resultado === id);
      expect(r, defObjeto(id).nombre).toBeDefined();
      expect(r!.estacion, r!.id).toBe(YUNQUE);
      expect(r!.desde, r!.id).toBe('7.1.0');
      const pedidos = r!.ingredientes.filter(([o]) => trofeos.has(o));
      expect(pedidos.length, r!.id).toBe(1);
      expect(pedidos[0]![1], r!.id).toBe(1);
    }
  });

  it('además del trofeo hay que picar: todas piden metal', () => {
    for (const id of [...ESPADAS, ...PETOS]) {
      const r = RECETAS.find((x) => x.resultado === id)!;
      expect(r.ingredientes.length, r.id).toBe(2);
      const metal = r.ingredientes.find(([o]) => defObjeto(o).nombre.startsWith('lingote'));
      expect(metal, r.id).toBeDefined();
      expect(metal![1], r.id).toBeGreaterThanOrEqual(12);
    }
  });

  it('el peto cuesta más metal que el arma de su mismo jefe', () => {
    for (let i = 0; i < 6; i++) {
      const arma = RECETAS.find((x) => x.resultado === ESPADAS[i])!;
      const peto = RECETAS.find((x) => x.resultado === PETOS[i])!;
      const suma = (r: typeof arma) => r.ingredientes.reduce((a, [, n]) => a + n, 0);
      expect(suma(peto), peto.id).toBeGreaterThan(suma(arma));
    }
  });

  it('el poder del peto se encuentra estando puesto, y no si no lo está', () => {
    const eq = crearEquipo();
    expect(poderPuesto(eq)).toBeNull();
    eq.ponerEn(indiceDeHueco('torso'), PETO_ORO, 1);
    expect(poderPuesto(eq)).toBeNull();
    eq.vaciar();
    eq.ponerEn(indiceDeHueco('torso'), PETO_BRASA, 1);
    expect(poderPuesto(eq)).toBe('bolaDeFuego');
  });

  it('las versiones que declaran existen', () => {
    const conocidas = new Set(VERSIONES.map((v) => v.id));
    expect(conocidas.has('7.1.0')).toBe(true);
  });
});

/**
 * La armadura que contesta.
 *
 * El filo sale del arma cuando pegas tú; la represalia sale de la armadura
 * cuando te pegan a ti. Son la misma idea vista desde los dos lados, y por eso
 * la tabla se comprueba igual: que ninguna esté vacía y que ninguna mate.
 */
describe('represalias', () => {
  it('las seis hacen algo, y ninguna hace nada de más', () => {
    for (const clase of CLASES_REPRESALIA) {
      const def = REPRESALIAS[clase];
      const hace =
        def.efecto !== undefined ||
        def.efectoPropio !== undefined ||
        def.dano > 0 ||
        def.curacion > 0;
      expect(hace, clase).toBe(true);
      expect(def.nombre.length, clase).toBeGreaterThan(0);
      expect(def.texto.length, clase).toBeGreaterThan(0);
      // Los efectos que reparte tienen que existir de verdad.
      if (def.efecto) expect(EFECTOS[def.efecto], clase).toBeDefined();
      if (def.efectoPropio) expect(EFECTOS[def.efectoPropio], clase).toBeDefined();
    }
  });

  /**
   * Si la represalia matara, la mejor táctica del juego sería dejarse pegar. El
   * tope es holgado: lo que se vigila es el orden de magnitud, no el número.
   */
  it('ninguna pega tan fuerte como para matar sola', () => {
    for (const clase of CLASES_REPRESALIA) {
      expect(REPRESALIAS[clase].dano, clase).toBeLessThan(20);
    }
  });

  it('los seis petos de jefe traen la suya, y no se repite ninguna', () => {
    const petos = [PETO_LIMO, PETO_ARENA, PETO_ESCARCHA, PETO_SELVA, PETO_CAVERNA, PETO_BRASA];
    const vistas = petos.map((id) => defObjeto(id).represalia);
    for (const [i, r] of vistas.entries()) expect(r, String(petos[i])).toBeDefined();
    expect(new Set(vistas).size).toBe(petos.length);
  });

  /** Lo que pidió el personaje, tal cual: el peto de la araña madre envenena. */
  it('el peto de la selva envenena a quien te ataca', () => {
    const clase = defObjeto(PETO_SELVA).represalia!;
    expect(REPRESALIAS[clase].efecto).toBe('veneno');
  });

  it('una armadura corriente no contesta nada', () => {
    expect(defObjeto(PETO_ORO).represalia).toBeUndefined();
  });

  it('se encuentra la del equipo puesto, sin repetir', () => {
    const eq = crearEquipo();
    expect(represaliasPuestas(eq)).toEqual([]);
    eq.ponerEn(indiceDeHueco('torso'), PETO_ORO, 1);
    expect(represaliasPuestas(eq)).toEqual([]);
    eq.vaciar();
    eq.ponerEn(indiceDeHueco('torso'), PETO_SELVA, 1);
    expect(represaliasPuestas(eq)).toEqual(['ponzona']);
  });

  it('la ficha del peto de jefe cuenta las dos cosas', () => {
    const texto = inscripcionDe(PETO_SELVA);
    expect(texto).toContain(PODERES[defObjeto(PETO_SELVA).poder!].nombre);
    expect(texto).toContain(REPRESALIAS[defObjeto(PETO_SELVA).represalia!].nombre);
  });

  it('cada represalia tiene su renglón', () => {
    for (const clase of CLASES_REPRESALIA) {
      expect(textoRepresalia(clase)).toContain(REPRESALIAS[clase].nombre);
    }
  });
});

/**
 * Lo que deja una élite.
 *
 * Hasta 7.10.0 una élite dejaba el doble de gel y una poción: más de lo mismo,
 * que no se recuerda. Los guantes son lo que hacía ella, y por eso la tabla se
 * comprueba entera: que cada especie deje algo que exista y que lo que deje
 * tenga que ver con lo que hace.
 */
describe('los guantes de élite', () => {
  it('cada especie de la tabla deja unos guantes de verdad', () => {
    for (const [especie, id] of Object.entries(GUANTES_DE_ELITE)) {
      expect(defObjeto(id), especie).toBeDefined();
      expect(defObjeto(id).represalia, especie).toBeDefined();
      expect(defObjeto(id).hueco, especie).toBe('manos');
    }
  });

  it('están las seis represalias repartidas, sin dejarse ninguna', () => {
    const puestas = new Set(
      Object.values(GUANTES_DE_ELITE).map((id) => defObjeto(id).represalia),
    );
    expect(puestas.size).toBe(CLASES_REPRESALIA.length);
  });

  /** La araña envenena, así que deja ponzoña. Es toda la regla de la tabla. */
  it('lo que dejan tiene que ver con lo que hacen', () => {
    const rep = (especie: keyof typeof GUANTES_DE_ELITE): string =>
      defObjeto(GUANTES_DE_ELITE[especie]!).represalia!;
    expect(rep('arana')).toBe('ponzona');
    expect(rep('diablillo')).toBe('brasa');
    expect(rep('espectro')).toBe('escarcha');
    expect(rep('esqueleto')).toBe('pinchos');
  });

  it('solo los sueltan las élites, y no siempre', () => {
    const siempre = () => 0;
    const nunca = () => 0.99;
    expect(guantesDeElite('arana', false, VERSION_ACTUAL, siempre)).toBeNull();
    expect(guantesDeElite('arana', true, VERSION_ACTUAL, siempre)).toBe(GUANTES_PONZONA);
    expect(guantesDeElite('arana', true, VERSION_ACTUAL, nunca)).toBeNull();
  });

  it('una especie sin guantes no suelta ninguno, por élite que sea', () => {
    expect(guantesDeElite('conejo', true, VERSION_ACTUAL, () => 0)).toBeNull();
  });

  it('en un mundo anterior a 7.10.0 no existen', () => {
    expect(guantesDeElite('arana', true, '7.9.0', () => 0)).toBeNull();
    expect(objetoExisteEn(GUANTES_PONZONA, '7.9.0')).toBe(false);
    expect(objetoExisteEn(GUANTES_PONZONA, '7.10.0')).toBe(true);
  });

  /**
   * Defienden poco a propósito: lo que se lleva puesto es la inscripción, no la
   * plancha. Si además fueran los mejores guantes, la escalera de metales se
   * saltaría entera.
   */
  it('defienden menos que unos guantes de metal', () => {
    for (const id of Object.values(GUANTES_DE_ELITE)) {
      expect(defObjeto(id).defensa ?? 0, defObjeto(id).nombre).toBeLessThan(5);
    }
  });

  it('con guantes y peto se llevan dos represalias a la vez', () => {
    const eq = crearEquipo();
    eq.ponerEn(indiceDeHueco('torso'), PETO_SELVA, 1);
    eq.ponerEn(indiceDeHueco('manos'), GUANTES_BRASA, 1);
    expect(represaliasPuestas(eq).sort()).toEqual(['brasa', 'ponzona']);
  });

  it('dos piezas con la misma no la cuentan dos veces', () => {
    const eq = crearEquipo();
    eq.ponerEn(indiceDeHueco('torso'), PETO_SELVA, 1);
    eq.ponerEn(indiceDeHueco('manos'), GUANTES_PONZONA, 1);
    expect(represaliasPuestas(eq)).toEqual(['ponzona']);
  });
});
