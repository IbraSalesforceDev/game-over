import { describe, expect, it } from 'vitest';
import { generarMundo, techoInframundo } from '../src/world/gen/worldgen';
import {
  CABANA,
  CUEVA_DESIERTO,
  CUEVA_NIEVE,
  estructuraMasCercana,
  FORTALEZA,
  FORTALEZA_INFERNAL,
  MINA,
  nombreEstructura,
  rumbo,
} from '../src/world/estructuras';
import {
  AIRE,
  ALTAR,
  ANTORCHA,
  ARENISCA,
  COFRE,
  esSolido,
  HIELO,
  LADRILLO,
  LADRILLO_INFERNAL,
  PINCHOS,
  danoTile,
  danoEnCaja,
  nivelPicoTile,
} from '../src/world/tiles';
import { Mundo } from '../src/world/world';
import { estructuraEn } from '../src/world/estructuras';
import { especiesPosibles, esElite } from '../src/entities/spawner';
import { Inventario } from '../src/items/inventory';
import {
  faltaParaOfrenda,
  OFRENDA,
  pagarOfrenda,
  puedeInvocar,
  textoFalta,
} from '../src/world/altar';
import {
  GEL,
  HUESO,
  LINGOTE_COBALTO,
  LINGOTE_INFERNITA,
  LINGOTE_ORO,
  LINGOTE_PLATA,
  LINGOTE_TITANIO,
  RELIQUIA,
} from '../src/items/items';

const OP = { ancho: 400, alto: 300, semilla: 'FORTALEZA' };

describe('estructuras del mundo', () => {
  it('todo mundo tiene una fortaleza, y solo una', () => {
    const { estructuras } = generarMundo(OP);
    const fortalezas = estructuras.filter((e) => e.tipo === FORTALEZA);
    expect(fortalezas).toHaveLength(1);
  });

  it('la fortaleza queda apuntada donde está el altar', () => {
    const { mundo, estructuras } = generarMundo(OP);
    const f = estructuras.find((e) => e.tipo === FORTALEZA)!;
    expect(mundo.getTile(f.tx, f.ty)).toBe(ALTAR);
  });

  it('la fortaleza es de ladrillo y por dentro está hueca', () => {
    const { mundo, estructuras } = generarMundo(OP);
    const f = estructuras.find((e) => e.tipo === FORTALEZA)!;

    // El altar se apoya en su pedestal de ladrillo.
    expect(mundo.getTile(f.tx, f.ty + 1)).toBe(LADRILLO);
    // Y la sala que lo rodea es aire con pared de ladrillo detrás: si fuera
    // aire sin pared, el jugador estaría mirando al vacío en vez de a una sala.
    expect(mundo.getTile(f.tx + 4, f.ty)).toBe(AIRE);
    expect(mundo.getPared(f.tx + 4, f.ty)).toBe(LADRILLO);
  });

  it('la fortaleza no queda pegada al punto de aparición', () => {
    const { spawnTx, estructuras } = generarMundo(OP);
    const f = estructuras.find((e) => e.tipo === FORTALEZA)!;
    // Al menos un cuarto del mundo de distancia: si estuviera al lado, se
    // encontraría el primer día cavando recto hacia abajo.
    expect(Math.abs(f.tx - spawnTx)).toBeGreaterThan(OP.ancho * 0.2);
  });

  it('también salen cabañas y minas', () => {
    const { estructuras } = generarMundo(OP);
    expect(estructuras.some((e) => e.tipo === CABANA)).toBe(true);
    expect(estructuras.some((e) => e.tipo === MINA)).toBe(true);
  });

  it('las estructuras traen cofres con botín dentro', () => {
    const { cofres } = generarMundo(OP);
    expect(cofres.length).toBeGreaterThan(0);
    for (const c of cofres) {
      expect(c.ranuras.length).toBeGreaterThan(0);
      for (const [objeto, cantidad] of c.ranuras) {
        expect(objeto).toBeGreaterThan(0);
        expect(cantidad).toBeGreaterThan(0);
      }
    }
  });

  it('todo cofre de la lista es un cofre en el mundo', () => {
    // Las estructuras se construyen unas tras otras y ninguna mira lo que hay
    // puesto: una mina que pasaba a dieciocho tiles de una cueva de bioma le
    // atravesaba la sala y le borraba el cofre. La lista se quedaba con un
    // contenedor en una casilla vacía, y la partida lo adoptaba igual: botín
    // invisible que solo existía en el guardado.
    for (const semilla of ['CUEVAS', 'A', 'B', 'C', 'D', 'E']) {
      const { mundo, cofres } = generarMundo({ ancho: 2400, alto: 400, semilla });
      const rotos = cofres.filter((c) => mundo.getTile(c.tx, c.ty) !== COFRE);
      expect(rotos).toEqual([]);
    }
  });

  it('la misma semilla pone las estructuras en el mismo sitio', () => {
    const a = generarMundo(OP);
    const b = generarMundo(OP);
    expect(a.estructuras).toEqual(b.estructuras);
    expect(a.cofres).toEqual(b.cofres);
  });

  it('la fortaleza no queda agujereada por una cueva de bioma', () => {
    // Las cuevas se cavan después de la fortaleza y a la misma profundidad. Si
    // no se apartaran, una podría abrir un boquete de veinte tiles en una sala.
    for (const semilla of ['FORTALEZA', 'OTRA', 'TERCERA', 'CUARTA']) {
      const { mundo, estructuras } = generarMundo({ ...OP, ancho: 1400, semilla });
      const f = estructuras.find((e) => e.tipo === FORTALEZA)!;
      for (const c of estructuras) {
        if (c.tipo !== CUEVA_DESIERTO && c.tipo !== CUEVA_NIEVE) continue;
        expect(Math.hypot(c.tx - f.tx, c.ty - f.ty)).toBeGreaterThan(20);
      }
      // Y el altar sigue en pie.
      expect(mundo.getTile(f.tx, f.ty)).toBe(ALTAR);
    }
  });

  it('semillas distintas mueven la fortaleza', () => {
    const a = generarMundo(OP);
    const b = generarMundo({ ...OP, semilla: 'OTRA' });
    const fa = a.estructuras.find((e) => e.tipo === FORTALEZA)!;
    const fb = b.estructuras.find((e) => e.tipo === FORTALEZA)!;
    expect(fa.tx === fb.tx && fa.ty === fb.ty).toBe(false);
  });
});

describe('cuevas de bioma', () => {
  // Ancho generoso: con cuatrocientas columnas puede no tocar ni un desierto,
  // y lo que se prueba aquí es la cueva, no la lotería de las franjas.
  const ANCHO = { ancho: 2400, alto: 400, semilla: 'CUEVAS' };

  it('un mundo ancho tiene cuevas de arenisca y heladas', () => {
    const { estructuras } = generarMundo(ANCHO);
    expect(estructuras.some((e) => e.tipo === CUEVA_DESIERTO)).toBe(true);
    expect(estructuras.some((e) => e.tipo === CUEVA_NIEVE)).toBe(true);
  });

  it('por dentro están huecas y forradas del material del bioma', () => {
    const { mundo, estructuras } = generarMundo(ANCHO);
    for (const c of estructuras) {
      const forro =
        c.tipo === CUEVA_DESIERTO ? ARENISCA : c.tipo === CUEVA_NIEVE ? HIELO : null;
      if (forro === null) continue;

      // El centro es aire: si no, no hay sala.
      expect(mundo.getTile(c.tx, c.ty)).toBe(AIRE);
      // Y bajando desde el centro se topa uno con el suelo de la sala, que es
      // del material del bioma y no la piedra gris de todo el mundo. El cofre
      // está apoyado justo ahí, así que se pasa de largo.
      let ty = c.ty;
      while (
        ty < mundo.alto - 1 &&
        (mundo.getTile(c.tx, ty) === AIRE || mundo.getTile(c.tx, ty) === COFRE)
      ) {
        ty++;
      }
      expect(mundo.getTile(c.tx, ty)).toBe(forro);
    }
  });

  it('cada cueva cae dentro de su bioma y bajo tierra', () => {
    const { mundo, estructuras, superficie } = generarMundo(ANCHO);
    for (const c of estructuras) {
      if (c.tipo !== CUEVA_DESIERTO && c.tipo !== CUEVA_NIEVE) continue;
      // Nada de cuevas asomando por la ladera: al menos treinta tiles de techo.
      expect(c.ty - superficie[c.tx]!).toBeGreaterThan(30);
      expect(mundo.dentro(c.tx, c.ty)).toBe(true);
    }
  });

  it('cada cueva guarda un cofre con material del bueno', () => {
    const { mundo, estructuras, cofres } = generarMundo(ANCHO);
    const cuevas = estructuras.filter(
      (e) => e.tipo === CUEVA_DESIERTO || e.tipo === CUEVA_NIEVE,
    );
    for (const c of cuevas) {
      // El cofre va en la misma columna, apoyado en el suelo de la sala.
      const cofre = cofres.find((k) => k.tx === c.tx && k.ty >= c.ty);
      expect(cofre).toBeDefined();
      expect(mundo.getTile(cofre!.tx, cofre!.ty)).toBe(COFRE);
      // Tres o cuatro premios: más que una mina, que da uno o tres.
      expect(cofre!.ranuras.length).toBeGreaterThanOrEqual(3);

      // Y alguna antorcha cerca: sin luz la sala es un rectángulo negro y el
      // cofre solo se encuentra tropezando con él.
      let antorchas = 0;
      for (let ty = cofre!.ty - 3; ty <= cofre!.ty + 1; ty++) {
        for (let tx = cofre!.tx - 5; tx <= cofre!.tx + 5; tx++) {
          if (mundo.getTile(tx, ty) === ANTORCHA) antorchas++;
        }
      }
      expect(antorchas).toBeGreaterThan(0);
    }
  });

  it('antes de 5.2.0 no había cuevas de bioma', () => {
    const { estructuras } = generarMundo({ ...ANCHO, version: '5.1.0' });
    expect(estructuras.some((e) => e.tipo === CUEVA_DESIERTO)).toBe(false);
    expect(estructuras.some((e) => e.tipo === CUEVA_NIEVE)).toBe(false);
    // Pero la fortaleza, que sí existía, sigue ahí.
    expect(estructuras.some((e) => e.tipo === FORTALEZA)).toBe(true);
  });
});

describe('encontrar estructuras', () => {
  const lista = [
    { tipo: FORTALEZA, tx: 800, ty: 200 } as const,
    { tipo: CABANA, tx: 120, ty: 60 } as const,
    { tipo: MINA, tx: 140, ty: 90 } as const,
  ];

  it('devuelve la más cercana y su distancia', () => {
    const r = estructuraMasCercana(lista, 130, 62)!;
    expect(r.estructura.tipo).toBe(CABANA);
    expect(r.distancia).toBeCloseTo(Math.hypot(10, 2));
  });

  it('sin estructuras no hay nada que señalar', () => {
    expect(estructuraMasCercana([], 0, 0)).toBeNull();
  });

  it('el rumbo dice hacia dónde tirar', () => {
    expect(rumbo(100, 2)).toBe('este');
    expect(rumbo(-100, 2)).toBe('oeste');
    expect(rumbo(2, 100)).toBe('abajo');
    expect(rumbo(80, 80)).toBe('este y abajo');
  });

  it('cada tipo tiene nombre', () => {
    expect(nombreEstructura(FORTALEZA)).toBe('Fortaleza');
    expect(nombreEstructura(99)).toBe('Estructura');
  });
});

describe('el altar', () => {
  function conOfrenda(): Inventario {
    const inv = new Inventario(40);
    for (const [objeto, cantidad] of OFRENDA) inv.anadir(objeto, cantidad);
    return inv;
  }

  it('con el zurrón vacío falta todo', () => {
    const falta = faltaParaOfrenda(new Inventario(40));
    expect(falta).toHaveLength(OFRENDA.length);
    expect(puedeInvocar(new Inventario(40))).toBe(false);
  });

  it('con la ofrenda completa se puede invocar', () => {
    expect(puedeInvocar(conOfrenda())).toBe(true);
  });

  it('faltando una sola reliquia, no', () => {
    const inv = conOfrenda();
    inv.quitar(RELIQUIA, 1);
    expect(puedeInvocar(inv)).toBe(false);
    const falta = faltaParaOfrenda(inv);
    expect(falta).toEqual([{ objeto: RELIQUIA, faltan: 1 }]);
    expect(textoFalta(falta)).toContain('reliquia');
  });

  it('pagar deja el zurrón sin la ofrenda y no toca lo demás', () => {
    const inv = conOfrenda();
    inv.anadir(HUESO, 3);
    expect(pagarOfrenda(inv)).toBe(true);
    // Los huesos de más se quedan; los cinco de la ofrenda se van.
    expect(inv.contar(HUESO)).toBe(3);
    expect(inv.contar(GEL)).toBe(0);
    expect(inv.contar(LINGOTE_ORO)).toBe(0);
    expect(inv.contar(LINGOTE_PLATA)).toBe(0);
    expect(inv.contar(RELIQUIA)).toBe(0);
  });

  it('sin la ofrenda entera no se cobra nada', () => {
    const inv = conOfrenda();
    inv.quitar(GEL, 1);
    expect(pagarOfrenda(inv)).toBe(false);
    // Ni un lingote de menos: cobrar a medias dejaría sin material y sin jefe.
    expect(inv.contar(LINGOTE_ORO)).toBe(25);
    expect(inv.contar(GEL)).toBe(99);
  });

  it('el oro y la plata suman los cincuenta lingotes prometidos', () => {
    const oro = OFRENDA.find(([o]) => o === LINGOTE_ORO)![1];
    const plata = OFRENDA.find(([o]) => o === LINGOTE_PLATA)![1];
    expect(oro + plata).toBe(50);
  });
});

describe('fortalezas del inframundo (6.2.0)', () => {
  const OP = { ancho: 2100, alto: 900, semilla: 'INFERNAL' };

  it('salen varias, y todas dentro del inframundo', () => {
    const { mundo, estructuras } = generarMundo(OP);
    const fs = estructuras.filter((e) => e.tipo === FORTALEZA_INFERNAL);
    expect(fs.length).toBeGreaterThan(0);
    const techo = techoInframundo(mundo.alto, true);
    for (const f of fs) expect(f.ty).toBeGreaterThan(techo);
  });

  it('se apoyan en el suelo, no cuelgan sobre el mar', () => {
    // Una fortaleza flotando sobre la lava solo la visita quien ya tiene con
    // qué volar, y entonces deja de ser el premio de haber bajado hasta aquí.
    const { mundo, estructuras } = generarMundo(OP);
    for (const f of estructuras.filter((e) => e.tipo === FORTALEZA_INFERNAL)) {
      let ty = f.ty;
      while (ty < mundo.alto - 2 && !esSolido(mundo.getTile(f.tx, ty + 1))) ty++;
      expect(ty - f.ty).toBeLessThan(6);
    }
  });

  it('no se solapan entre sí', () => {
    // Miden hasta cincuenta y tres columnas: dos a dieciocho de distancia no
    // son dos fortalezas, son una con las paredes cruzadas por dentro.
    for (const semilla of ['INFERNAL', 'A', 'B', 'C']) {
      const { estructuras } = generarMundo({ ...OP, semilla });
      const fs = estructuras.filter((e) => e.tipo === FORTALEZA_INFERNAL);
      for (let i = 0; i < fs.length; i++) {
        for (let j = i + 1; j < fs.length; j++) {
          expect(Math.abs(fs[i]!.tx - fs[j]!.tx)).toBeGreaterThan(50);
        }
      }
    }
  });

  it('se puede entrar andando: hay puerta en la planta baja', () => {
    // El ladrillo infernal pide un pico de nivel seis, y ese pico se fabrica
    // justamente con lo que hay dentro. Una fortaleza cerrada sería una
    // cerradura con la llave dentro de la caja.
    const { mundo, estructuras } = generarMundo(OP);
    for (const f of estructuras.filter((e) => e.tipo === FORTALEZA_INFERNAL)) {
      // Desde el punto anotado —el centro de la planta baja— se sale andando
      // hacia algún lado sin atravesar ladrillo.
      let salida = false;
      for (const paso of [-1, 1]) {
        for (let d = 1; d < 60; d++) {
          const tx = f.tx + paso * d;
          if (mundo.getTile(tx, f.ty) === LADRILLO_INFERNAL) break;
          if (mundo.getTile(tx, f.ty) !== AIRE) break;
          // Se ha salido de la caja: ya no hay pared de ladrillo detrás.
          if (mundo.getPared(tx, f.ty) !== LADRILLO_INFERNAL) {
            salida = true;
            break;
          }
        }
        if (salida) break;
      }
      expect(salida).toBe(true);
    }
  });

  it('están secas: la sala no nace inundada', () => {
    const { mundo, estructuras } = generarMundo(OP);
    for (const f of estructuras.filter((e) => e.tipo === FORTALEZA_INFERNAL)) {
      for (let ty = f.ty - 20; ty <= f.ty + 2; ty++) {
        for (let tx = f.tx - 25; tx <= f.tx + 25; tx++) {
          if (mundo.getPared(tx, ty) !== LADRILLO_INFERNAL) continue;
          expect(mundo.getLiquido(tx, ty)).toBe(0);
        }
      }
    }
  });

  it('guardan lingotes de los tres metales hondos', () => {
    const { estructuras, cofres } = generarMundo(OP);
    const fs = estructuras.filter((e) => e.tipo === FORTALEZA_INFERNAL);
    const dentro = cofres.filter((c) =>
      fs.some((f) => Math.abs(c.tx - f.tx) < 30 && Math.abs(c.ty - f.ty) < 25),
    );
    expect(dentro.length).toBeGreaterThan(0);
    const objetos = new Set(dentro.flatMap((c) => c.ranuras.map(([o]) => o)));
    const hondos = [LINGOTE_COBALTO, LINGOTE_TITANIO, LINGOTE_INFERNITA];
    expect(hondos.some((m) => objetos.has(m))).toBe(true);
  });

  it('no existen antes de 6.2.0', () => {
    const { estructuras } = generarMundo({ ...OP, version: '6.1.0' });
    expect(estructuras.some((e) => e.tipo === FORTALEZA_INFERNAL)).toBe(false);
  });
});

describe('las estructuras se defienden (6.3.0)', () => {
  const OP = { ancho: 2400, alto: 900, semilla: 'DEFENSA' };

  it('hay trampas por los suelos, y no en las cabañas', () => {
    const { mundo, estructuras } = generarMundo(OP);
    let pinchos = 0;
    for (let i = 0; i < mundo.tileId.length; i++) {
      if (mundo.tileId[i] === PINCHOS) pinchos++;
    }
    expect(pinchos).toBeGreaterThan(20);

    // La cabaña es el refugio de la superficie: el sitio donde uno se mete a
    // pasar la noche. Llenarla de pinchos sería quitarle aquello para lo que
    // existe.
    for (const cabana of estructuras.filter((e) => e.tipo === CABANA)) {
      for (let ty = cabana.ty - 6; ty <= cabana.ty + 3; ty++) {
        for (let tx = cabana.tx - 8; tx <= cabana.tx + 8; tx++) {
          expect(mundo.getTile(tx, ty)).not.toBe(PINCHOS);
        }
      }
    }
  });

  it('ningún pincho queda flotando ni encima de un cofre', () => {
    const { mundo } = generarMundo(OP);
    for (let ty = 1; ty < mundo.alto - 1; ty++) {
      for (let tx = 1; tx < mundo.ancho - 1; tx++) {
        if (mundo.getTile(tx, ty) !== PINCHOS) continue;
        // Siempre apoyados: uno en el aire se lee como un fallo del generador.
        expect(esSolido(mundo.getTile(tx, ty + 1))).toBe(true);
        expect(mundo.getTile(tx, ty)).not.toBe(COFRE);
      }
    }
  });

  it('los pinchos hacen daño y el resto de bloques no', () => {
    expect(danoTile(PINCHOS)).toBeGreaterThan(0);
    expect(danoTile(LADRILLO)).toBe(0);
    expect(danoTile(AIRE)).toBe(0);
    // Y se detectan por la caja del jugador, no por un punto.
    const m = new Mundo(10, 10);
    m.setTile(5, 5, PINCHOS);
    expect(danoEnCaja(m, 5 * 16, 5 * 16, 16, 16, 16)).toBe(danoTile(PINCHOS));
    expect(danoEnCaja(m, 0, 0, 16, 16, 16)).toBe(0);
  });

  it('la fortaleza es el doble de grande que antes', () => {
    const nueva = generarMundo(OP);
    const vieja = generarMundo({ ...OP, version: '6.2.1' });
    const contar = (r: typeof nueva): number => {
      let n = 0;
      for (let i = 0; i < r.mundo.tileId.length; i++) {
        if (r.mundo.tileId[i] === LADRILLO) n++;
      }
      return n;
    };
    expect(contar(nueva)).toBeGreaterThan(contar(vieja) * 1.4);
  });

  it('un mundo anterior a 6.3.0 no tiene ni un pincho', () => {
    const { mundo } = generarMundo({ ...OP, version: '6.2.1' });
    expect(mundo.tileId.includes(PINCHOS)).toBe(false);
  });

  it('el ladrillo pide ya pico de hierro', () => {
    // Con pico de cobre se abría un boquete en la pared exterior y se entraba
    // por detrás sin ver una sola sala: la fortaleza tenía puertas y nadie las
    // usaba.
    expect(nivelPicoTile(LADRILLO)).toBeGreaterThanOrEqual(3);
  });
});

describe('la guarnición de cada estructura', () => {
  it('dentro salen los bichos del sitio, y fuera no', () => {
    const lista = [{ tipo: FORTALEZA, tx: 500, ty: 400 } as const];
    const dentro = estructuraEn(lista, 500, 400);
    expect(dentro).toBe(FORTALEZA);
    // Y a doscientos tiles, no.
    expect(estructuraEn(lista, 700, 400)).toBeNull();

    const ctx = { esNoche: false, superficieTy: 100, bioma: 'bosque' } as const;
    const conGuarnicion = especiesPosibles({ ...ctx, estructura: FORTALEZA }, 400);
    const sin = especiesPosibles(ctx, 400);
    // La fortaleza está hecha de huesos y ladrillo: esqueletos.
    expect(conGuarnicion.filter((e) => e === 'esqueleto').length).toBeGreaterThan(
      sin.filter((e) => e === 'esqueleto').length,
    );
  });

  it('la cabaña no tiene guarnición: es el refugio', () => {
    const lista = [{ tipo: CABANA, tx: 500, ty: 100 } as const];
    expect(estructuraEn(lista, 500, 100)).toBeNull();
  });

  it('dentro puede haber élites a cualquier hora y profundidad', () => {
    const siempre = () => 0;
    const dia = { esNoche: false, superficieTy: 100, bioma: 'bosque' } as const;
    // Fuera, de día y bajo tierra: no.
    expect(esElite(dia, 'esqueleto', false, siempre)).toBe(false);
    // Dentro de una fortaleza, sí.
    expect(esElite({ ...dia, estructura: FORTALEZA }, 'esqueleto', false, siempre)).toBe(true);
    // Pero sigue sin haberlos entre los animales.
    expect(esElite({ ...dia, estructura: FORTALEZA }, 'conejo', false, siempre)).toBe(false);
  });
});
