/**
 * Almacenamiento de partidas.
 *
 * Todo el juego habla con `SaveAdapter` y nunca con IndexedDB directamente.
 * Ese es el punto: el día que las partidas se guarden en la nube, se escribe
 * un `SupabaseSaveAdapter` (blob en Storage, metadatos en una tabla con RLS por
 * usuario) y no hay que tocar ni una línea del motor. Guardar el mundo como un
 * `Uint8Array` opaco es lo que lo hace posible.
 */

export interface MetaMundo {
  id: string;
  nombre: string;
  semilla: string;
  ancho: number;
  alto: number;
  creado: number;
  modificado: number;
  /** Milisegundos jugados. */
  jugado: number;
  /** Tamaño del blob guardado. */
  bytes: number;
  version: number;
}

export interface SaveAdapter {
  listar(): Promise<MetaMundo[]>;
  cargar(id: string): Promise<Uint8Array>;
  guardar(id: string, meta: MetaMundo, datos: Uint8Array): Promise<void>;
  borrar(id: string): Promise<void>;
}

const BD = 'game-over';
const VERSION_BD = 1;
const TIENDA_META = 'meta';
const TIENDA_DATOS = 'datos';

function promesa<T>(peticion: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error ?? new Error('Error de IndexedDB'));
  });
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(BD, VERSION_BD);
    peticion.onupgradeneeded = () => {
      const bd = peticion.result;
      // Metadatos y datos en tiendas separadas: listar mundos no debe arrastrar
      // varios megas de blobs solo para pintar una lista de nombres.
      if (!bd.objectStoreNames.contains(TIENDA_META)) {
        bd.createObjectStore(TIENDA_META, { keyPath: 'id' });
      }
      if (!bd.objectStoreNames.contains(TIENDA_DATOS)) {
        bd.createObjectStore(TIENDA_DATOS);
      }
    };
    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error ?? new Error('No se pudo abrir la base'));
    peticion.onblocked = () => rechazar(new Error('La base está bloqueada por otra pestaña'));
  });
}

export class AlmacenLocal implements SaveAdapter {
  private bd: IDBDatabase | null = null;

  private async conexion(): Promise<IDBDatabase> {
    if (!this.bd) this.bd = await abrir();
    return this.bd;
  }

  async listar(): Promise<MetaMundo[]> {
    const bd = await this.conexion();
    const tx = bd.transaction(TIENDA_META, 'readonly');
    const todos = await promesa<MetaMundo[]>(
      tx.objectStore(TIENDA_META).getAll() as IDBRequest<MetaMundo[]>,
    );
    return todos.sort((a, b) => b.modificado - a.modificado);
  }

  async cargar(id: string): Promise<Uint8Array> {
    const bd = await this.conexion();
    const tx = bd.transaction(TIENDA_DATOS, 'readonly');
    const datos = await promesa<ArrayBuffer | undefined>(
      tx.objectStore(TIENDA_DATOS).get(id) as IDBRequest<ArrayBuffer | undefined>,
    );
    if (!datos) throw new Error(`No hay ningún mundo guardado con el id ${id}`);
    return new Uint8Array(datos);
  }

  async guardar(id: string, meta: MetaMundo, datos: Uint8Array): Promise<void> {
    const bd = await this.conexion();
    // Una sola transacción para las dos tiendas: si falla el blob, no queda un
    // metadato apuntando a un mundo que no existe.
    const tx = bd.transaction([TIENDA_META, TIENDA_DATOS], 'readwrite');
    tx.objectStore(TIENDA_META).put({ ...meta, id });
    // Guardamos el ArrayBuffer suelto: algunos navegadores clonan mal las
    // vistas tipadas con desplazamiento.
    const copia = datos.slice();
    tx.objectStore(TIENDA_DATOS).put(copia.buffer, id);
    await new Promise<void>((resolver, rechazar) => {
      tx.oncomplete = () => resolver();
      tx.onerror = () => rechazar(tx.error ?? new Error('Error al guardar'));
      tx.onabort = () => rechazar(tx.error ?? new Error('Guardado abortado'));
    });
  }

  async borrar(id: string): Promise<void> {
    const bd = await this.conexion();
    const tx = bd.transaction([TIENDA_META, TIENDA_DATOS], 'readwrite');
    tx.objectStore(TIENDA_META).delete(id);
    tx.objectStore(TIENDA_DATOS).delete(id);
    await new Promise<void>((resolver, rechazar) => {
      tx.oncomplete = () => resolver();
      tx.onerror = () => rechazar(tx.error ?? new Error('Error al borrar'));
    });
  }
}

/**
 * Alternativa en memoria. La usan los tests y sirve de red de seguridad si el
 * navegador tiene IndexedDB bloqueado (modo privado de algunos navegadores):
 * mejor jugar sin poder guardar que no arrancar.
 */
export class AlmacenMemoria implements SaveAdapter {
  private readonly meta = new Map<string, MetaMundo>();
  private readonly datos = new Map<string, Uint8Array>();

  async listar(): Promise<MetaMundo[]> {
    return [...this.meta.values()].sort((a, b) => b.modificado - a.modificado);
  }

  async cargar(id: string): Promise<Uint8Array> {
    const d = this.datos.get(id);
    if (!d) throw new Error(`No hay ningún mundo guardado con el id ${id}`);
    return d;
  }

  async guardar(id: string, meta: MetaMundo, datos: Uint8Array): Promise<void> {
    this.meta.set(id, { ...meta, id });
    this.datos.set(id, datos.slice());
  }

  async borrar(id: string): Promise<void> {
    this.meta.delete(id);
    this.datos.delete(id);
  }
}

/** Devuelve el almacén local, o el de memoria si IndexedDB no está disponible. */
export async function crearAlmacen(): Promise<{ almacen: SaveAdapter; persistente: boolean }> {
  if (typeof indexedDB === 'undefined') {
    return { almacen: new AlmacenMemoria(), persistente: false };
  }
  try {
    const almacen = new AlmacenLocal();
    await almacen.listar(); // fuerza la apertura para detectar el fallo aquí
    return { almacen, persistente: true };
  } catch (e) {
    console.warn('IndexedDB no disponible, se juega sin guardar:', e);
    return { almacen: new AlmacenMemoria(), persistente: false };
  }
}

export function nuevoId(): string {
  return `m${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
