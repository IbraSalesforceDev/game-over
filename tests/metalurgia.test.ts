import { describe, expect, it } from 'vitest';
import { RECETAS } from '../src/items/recipes';
import {
  BOMBA,
  defensaDe,
  defObjeto,
  DINAMITA,
  esArmadura,
  esExplosivo,
  huecoDe,
  IDS_OBJETO,
  objetoExisteEn,
  POLVORA,
  versionObjeto,
  CASCO_ORO,
  PETO_ORO,
  GREBAS_ORO,
  BOTAS_ORO,
  GUANTES_ORO,
  CASCO_INFERNITA,
  PETO_INFERNITA,
  GREBAS_INFERNITA,
  BOTAS_INFERNITA,
  GUANTES_INFERNITA,
} from '../src/items/items';
import { danoTrasArmadura, MINIMO_PASA } from '../src/items/equipado';
import { BLOQUES_METAL, TILES, versionTile } from '../src/world/tiles';
import { ENEMIGOS } from '../src/entities/enemies';

const JUEGO_ORO = [CASCO_ORO, PETO_ORO, GREBAS_ORO, BOTAS_ORO, GUANTES_ORO];
const JUEGO_INFERNITA = [
  CASCO_INFERNITA,
  PETO_INFERNITA,
  GREBAS_INFERNITA,
  BOTAS_INFERNITA,
  GUANTES_INFERNITA,
];

const defensaJuego = (juego: readonly number[]): number =>
  juego.reduce((t, id) => t + defensaDe(id), 0);

describe('armadura de los tres metales hondos (6.4.0)', () => {
  it('los tres juegos están completos y en los cinco huecos', () => {
    // Lo que faltaba: cobalto, titanio e infernita tenían pico, espada y arco
    // desde 5.0.0 y nada que ponerse, así que llegar al inframundo no mejoraba
    // en nada lo que aguantabas.
    for (const juego of [JUEGO_INFERNITA]) {
      expect(new Set(juego.map((id) => huecoDe(id))).size).toBe(5);
      for (const id of juego) expect(esArmadura(id)).toBe(true);
    }
  });

  it('la infernita protege más que el oro, pero no vuelve inmune', () => {
    expect(defensaJuego(JUEGO_INFERNITA)).toBeGreaterThan(defensaJuego(JUEGO_ORO));
    // El suelo del 25 % es lo que impide que juntar defensa suficiente saque el
    // combate del juego. Con el mandoble del guardián encima, alguien vestido de
    // infernita sigue perdiendo vida en cada golpe.
    const jefe = ENEMIGOS.guardian.dano;
    const pasa = danoTrasArmadura(jefe, defensaJuego(JUEGO_INFERNITA));
    expect(pasa).toBeGreaterThanOrEqual(Math.round(jefe * MINIMO_PASA));
    expect(pasa).toBeLessThan(danoTrasArmadura(jefe, defensaJuego(JUEGO_ORO)));
  });

  it('y ninguna pieza existe antes de 6.4.0', () => {
    for (const id of JUEGO_INFERNITA) {
      expect(versionObjeto(id)).toBe('6.4.0');
      expect(objetoExisteEn(id, '6.3.1')).toBe(false);
    }
  });
});

describe('bloques de metal (6.4.0)', () => {
  it('los siete se comprimen y se deshacen sin perder nada', () => {
    // Las dos direcciones importan igual. Sin la vuelta, comprimir sería una
    // decisión de la que uno se arrepiente al necesitar catorce lingotes.
    for (const bloque of BLOQUES_METAL) {
      const comprimir = RECETAS.find((r) => r.resultado === bloque);
      expect(comprimir, `falta cómo hacer ${TILES[bloque]?.nombre}`).toBeDefined();
      const [lingote, cuantos] = comprimir!.ingredientes[0]!;
      expect(comprimir!.cantidad).toBe(1);

      const deshacer = RECETAS.find(
        (r) => r.resultado === lingote && r.ingredientes.some(([o]) => o === bloque),
      );
      expect(deshacer, `${TILES[bloque]?.nombre} no se deshace`).toBeDefined();
      expect(deshacer!.cantidad).toBe(cuantos);
      expect(deshacer!.ingredientes).toEqual([[bloque, 1]]);
    }
  });

  it('cada uno es tan duro como el mineral del que sale', () => {
    // Una casa de infernita tiene que costar más de desmontar que una de cobre;
    // si todos tuvieran la misma dureza, elegir metal sería elegir color.
    const durezas = BLOQUES_METAL.map((id) => TILES[id]!.dureza);
    for (let i = 1; i < durezas.length; i++) {
      expect(durezas[i]!).toBeGreaterThan(durezas[i - 1]!);
    }
    const niveles = BLOQUES_METAL.map((id) => TILES[id]!.nivelPico ?? 0);
    for (let i = 1; i < niveles.length; i++) {
      expect(niveles[i]!).toBeGreaterThanOrEqual(niveles[i - 1]!);
    }
  });

  it('y ninguno existía antes de 6.4.0', () => {
    for (const id of BLOQUES_METAL) expect(versionTile(id)).toBe('6.4.0');
  });
});

describe('pólvora y explosivos (6.4.0)', () => {
  it('los dos explosivos salen de la pólvora, y la pólvora del carbón', () => {
    const polvora = RECETAS.find((r) => r.resultado === POLVORA);
    expect(polvora).toBeDefined();
    for (const id of [BOMBA, DINAMITA]) {
      const r = RECETAS.find((x) => x.resultado === id);
      expect(r, `${defObjeto(id).nombre} no se fabrica`).toBeDefined();
      expect(r!.ingredientes.some(([o]) => o === POLVORA)).toBe(true);
    }
  });

  it('la dinamita cuesta bastante más pólvora que una bomba', () => {
    const porUnidad = (id: number): number => {
      const r = RECETAS.find((x) => x.resultado === id)!;
      return (r.ingredientes.find(([o]) => o === POLVORA)?.[1] ?? 0) / r.cantidad;
    };
    expect(porUnidad(DINAMITA)).toBeGreaterThan(porUnidad(BOMBA) * 5);
  });

  it('se apilan menos que un material normal', () => {
    // Noventa y nueve dinamitas encima convierten cualquier montaña en un rato
    // de clics.
    for (const id of [BOMBA, DINAMITA]) {
      expect(defObjeto(id).maxPila).toBeLessThan(defObjeto(POLVORA).maxPila);
    }
  });

  it('todo lo que se marca como explosivo se puede tirar', () => {
    for (const id of IDS_OBJETO.filter(esExplosivo)) {
      expect(defObjeto(id).velocidad, defObjeto(id).nombre).toBeGreaterThan(0);
    }
  });
});
