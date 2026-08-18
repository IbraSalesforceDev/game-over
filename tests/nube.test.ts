import { describe, expect, it, vi, beforeEach } from 'vitest';
import { rutaMundo } from '../src/nube/cliente';
import {
  MINIMO_CONTRASENA,
  mensajeDeError,
  revisarCredenciales,
} from '../src/nube/sesion';

/**
 * Cliente de mentira.
 *
 * Apunta el orden de las llamadas, que es lo que de verdad hay que comprobar
 * aquí: el adaptador no tiene lógica propia casi, pero sí tiene un orden que si
 * se invierte cuesta partidas.
 */
const pasos: string[] = [];
let haySesion = true;
let fallaSubida: string | null = null;
let fallaBorradoBlob: string | null = null;
let filas: unknown[] = [];
let yaExistia = false;
let fallaBorradoFicha = false;

function clienteFalso() {
  return {
    auth: {
      getSession: async () => {
        pasos.push('sesion');
        return { data: { session: haySesion ? { user: { id: 'yo' } } : null } };
      },
    },
    storage: {
      from: () => ({
        upload: async () => {
          pasos.push('subir blob');
          return { error: fallaSubida ? { message: fallaSubida } : null };
        },
        download: async () => {
          pasos.push('bajar blob');
          return {
            data: { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
            error: null,
          };
        },
        remove: async () => {
          pasos.push('borrar blob');
          return { error: fallaBorradoBlob ? { message: fallaBorradoBlob } : null };
        },
      }),
    },
    from: () => ({
      select: () => ({
        order: async () => {
          pasos.push('leer filas');
          return { data: filas, error: null };
        },
        eq: () => ({
          maybeSingle: async () => {
            pasos.push('mirar si existia');
            return { data: yaExistia ? { id: 'p1', propietario: 'yo' } : null, error: null };
          },
        }),
      }),
      upsert: async () => {
        pasos.push('escribir ficha');
        return { error: null };
      },
      delete: () => ({
        eq: async () => {
          pasos.push('borrar ficha');
          return { error: fallaBorradoFicha ? { message: 'no se pudo' } : null };
        },
      }),
    }),
    rpc: async (nombre: string, args: Record<string, unknown>) => {
      pasos.push(`rpc ${nombre} ${JSON.stringify(args)}`);
      return { data: 'ABCD2345', error: null };
    },
  };
}

vi.mock('../src/nube/cliente', async (original) => {
  const real = await original<typeof import('../src/nube/cliente')>();
  return { ...real, nube: async () => clienteFalso() };
});

const { AlmacenNube, TOPE_BYTES } = await import('../src/nube/adaptador');

describe('revisar credenciales antes de molestar al servidor', () => {
  it('pide correo', () => {
    expect(revisarCredenciales('', 'contrasenalarga')).toBe('Falta el correo');
  });
  it('rechaza un correo sin forma de correo', () => {
    expect(revisarCredenciales('pepe', 'contrasenalarga')).toMatch(/buena pinta/);
  });
  it('exige el mínimo de contraseña', () => {
    expect(revisarCredenciales('a@b.com', 'corta')).toMatch(String(MINIMO_CONTRASENA));
  });
  it('deja pasar lo que está bien', () => {
    expect(revisarCredenciales('a@b.com', 'unacontrasena')).toBeNull();
  });
});

describe('los errores se leen en español', () => {
  it('traduce las credenciales malas', () => {
    expect(mensajeDeError({ message: 'Invalid login credentials' }, true)).toBe(
      'El correo o la contraseña no son correctos',
    );
  });
  it('no filtra el mensaje original cuando no lo conoce', () => {
    const texto = mensajeDeError({ message: 'AuthApiError: unexpected_failure at /token' }, true);
    expect(texto).toBe('No se ha podido entrar');
    expect(texto).not.toMatch(/token|AuthApiError/);
  });
});

describe('AlmacenNube', () => {
  beforeEach(() => {
    pasos.length = 0;
    haySesion = true;
    fallaSubida = null;
    fallaBorradoBlob = null;
    filas = [];
    yaExistia = false;
    fallaBorradoFicha = false;
  });

  const meta = {
    id: 'p1',
    nombre: 'Mundo',
    semilla: 'SEM',
    ancho: 1400,
    alto: 450,
    creado: 1,
    modificado: 2,
    jugado: 0,
    bytes: 3,
    version: 16,
    versionJuego: '7.3.1',
  };

  /**
   * El orden que impone el RLS, y que no se puede invertir.
   *
   * La política del bucket averigua de quién es un fichero mirando su carpeta
   * —el id de la partida— y buscando esa partida en la tabla. Sin ficha no hay
   * dueño que comprobar y la subida se rechaza siempre. Si alguien le da la
   * vuelta a esto «por prudencia», subir un mundo nuevo deja de funcionar.
   */
  it('escribe la ficha ANTES de subir el mundo', async () => {
    await new AlmacenNube().guardar('p1', meta, new Uint8Array([1, 2, 3]));
    expect(pasos.indexOf('escribir ficha')).toBeLessThan(pasos.indexOf('subir blob'));
  });

  /** Una ficha sin mundo sale en la lista y no se puede abrir. */
  it('si falla la subida de un mundo nuevo, la ficha se deshace', async () => {
    fallaSubida = 'sin espacio';
    await expect(
      new AlmacenNube().guardar('p1', meta, new Uint8Array([1, 2, 3])),
    ).rejects.toThrow(/no se ha podido subir/i);
    expect(pasos).toContain('escribir ficha');
    expect(pasos).toContain('borrar ficha');
  });

  /**
   * Pero solo si era nueva. Si la partida ya existía con su mundo bueno, un
   * autoguardado fallido no puede llevarse por delante la ficha de una partida
   * que se lleva jugando horas.
   */
  it('si falla la subida de una partida que ya existía, NO se borra la ficha', async () => {
    yaExistia = true;
    fallaSubida = 'se cayó la red';
    await expect(
      new AlmacenNube().guardar('p1', meta, new Uint8Array([1, 2, 3])),
    ).rejects.toThrow(/no se ha podido subir/i);
    expect(pasos).not.toContain('borrar ficha');
  });

  it('sin sesión no se guarda, y se dice por qué', async () => {
    haySesion = false;
    await expect(
      new AlmacenNube().guardar('p1', meta, new Uint8Array([1, 2, 3])),
    ).rejects.toThrow(/entrar con una cuenta/i);
    expect(pasos).not.toContain('subir blob');
    expect(pasos).not.toContain('escribir ficha');
  });

  it('un blob más grande que el tope se para aquí, no en el servidor', async () => {
    await expect(
      new AlmacenNube().guardar('p1', meta, new Uint8Array(TOPE_BYTES + 1)),
    ).rejects.toThrow(/tope/i);
    expect(pasos).toHaveLength(0);
  });

  it('borra el blob antes que la ficha', async () => {
    await new AlmacenNube().borrar('p1');
    expect(pasos).toEqual(['borrar blob', 'borrar ficha']);
  });

  /** Un huérfano de unos kilobytes es mejor que una partida que no se deja borrar. */
  it('si el blob no se puede borrar, la partida se borra igual', async () => {
    fallaBorradoBlob = 'no existe';
    await expect(new AlmacenNube().borrar('p1')).resolves.toBeUndefined();
    expect(pasos).toContain('borrar ficha');
  });

  it('convierte una fila en la ficha que espera el menú', async () => {
    filas = [
      {
        id: 'p1',
        nombre: 'Mundo',
        semilla: 'SEM',
        ancho: 1400,
        alto: 450,
        version_formato: 16,
        version_juego: '7.3.1',
        hardcore: true,
        caido: false,
        jugado: '12345',
        bytes: 41000,
        creado: '2026-08-18T10:00:00Z',
        actualizado: '2026-08-18T12:00:00Z',
      },
    ];
    const [m] = await new AlmacenNube().listar();
    expect(m).toMatchObject({
      id: 'p1',
      version: 16,
      versionJuego: '7.3.1',
      hardcore: true,
      bytes: 41000,
    });
    // `jugado` llega como texto porque es un bigint: si no se convierte, el
    // tiempo jugado se concatena en vez de sumarse.
    expect(m!.jugado).toBe(12345);
    expect(m!.modificado).toBe(Date.parse('2026-08-18T12:00:00Z'));
  });

  it('el código se limpia antes de canjearlo', async () => {
    await new AlmacenNube().canjear('  abcd2345 ');
    expect(pasos.some((p) => p.includes('"p_codigo":"ABCD2345"'))).toBe(true);
  });
});

describe('rutas del bucket', () => {
  /** La primera carpeta es la partida: de ahí saca el RLS de quién es el fichero. */
  it('la primera carpeta es el id de la partida', () => {
    expect(rutaMundo('abc-123')).toBe('abc-123/mundo.bin');
    expect(rutaMundo('abc-123').split('/')[0]).toBe('abc-123');
  });
});
