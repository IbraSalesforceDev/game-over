/**
 * Guardar y cargar la partida en el navegador. Los arrays del mapa van en
 * base64; lo demás, tal cual en JSON.
 */
import { ajustarIdColonos, type Colono } from './colonos';
import { ajustarIdCriaturas, olvidarCampos } from './criaturas';
import { Mundo } from './mundo';

const CLAVE = 'colonia-oxido.partida';
const VERSION = 1;

type Tipada = Uint8Array | Uint16Array | Int32Array | Float32Array;

function a64(a: Tipada): string {
  const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

function de64<T extends Tipada>(s: string, destino: T): void {
  const bin = atob(s);
  const b = new Uint8Array(destino.buffer, destino.byteOffset, destino.byteLength);
  for (let i = 0; i < b.length && i < bin.length; i++) b[i] = bin.charCodeAt(i);
}

const CAPAS = ['suelo', 'muro', 'mineral', 'cantidad', 'planta', 'crece', 'zona', 'orden', 'edif', 'contaminacion', 'ruido'] as const;

export function serializar(w: Mundo): string {
  const capas: Record<string, string> = {};
  for (const k of CAPAS) capas[k] = a64(w.mapa[k]);
  return JSON.stringify({
    version: VERSION,
    semilla: w.semilla,
    tick: w.tick,
    sigId: w.sigId,
    capas,
    objetos: [...w.mapa.objetos.entries()],
    edificios: [...w.edificios.values()],
    colonos: w.colonos.map((c) => ({ ...c, inalcanzable: [], camino: [], reservas: [], tarea: null, carga: c.carga })),
    criaturas: w.criaturas,
    nidos: w.nidos,
    investigacion: w.investigacion,
    evolucion: w.evolucion,
    contaminacionTotal: w.contaminacionTotal,
    proximaIncursion: w.proximaIncursion,
    proximaExpansion: w.proximaExpansion,
    proximoViajero: w.proximoViajero,
    alertas: w.alertas.slice(-20),
    ganado: w.ganado,
    perdido: w.perdido,
    inicio: w.inicio,
  });
}

export function deserializar(texto: string): Mundo | null {
  try {
    const d = JSON.parse(texto);
    if (d.version !== VERSION) return null;
    const w = new Mundo(d.semilla);
    for (const k of CAPAS) de64(d.capas[k], w.mapa[k]);
    w.mapa.objetos = new Map(d.objetos);
    w.edificios = new Map(d.edificios.map((e: { id: number }) => [e.id, e]));
    w.colonos = d.colonos.map((c: Colono) => ({ ...c, inalcanzable: new Map(), camino: [], reservas: [], tarea: null }));
    // Lo que llevaban encima vuelve al suelo para no perderlo a medias.
    w.criaturas = d.criaturas;
    w.nidos = d.nidos;
    w.investigacion = d.investigacion;
    w.evolucion = d.evolucion;
    w.contaminacionTotal = d.contaminacionTotal;
    w.tick = d.tick;
    w.sigId = d.sigId;
    w.proximaIncursion = d.proximaIncursion;
    w.proximaExpansion = d.proximaExpansion;
    w.proximoViajero = d.proximoViajero;
    w.alertas = d.alertas ?? [];
    w.ganado = d.ganado;
    w.perdido = d.perdido;
    w.inicio = d.inicio;
    ajustarIdColonos(Math.max(0, ...w.colonos.map((c) => c.id)));
    ajustarIdCriaturas(Math.max(0, ...w.criaturas.map((c) => c.id)), Math.max(0, ...w.nidos.map((n) => n.id)));
    olvidarCampos();
    return w;
  } catch {
    return null;
  }
}

export function guardarLocal(w: Mundo): boolean {
  try {
    localStorage.setItem(CLAVE, serializar(w));
    return true;
  } catch {
    return false;
  }
}

export function cargarLocal(): Mundo | null {
  try {
    const s = localStorage.getItem(CLAVE);
    return s ? deserializar(s) : null;
  } catch {
    return null;
  }
}

export function hayPartida(): boolean {
  try {
    return !!localStorage.getItem(CLAVE);
  } catch {
    return false;
  }
}

export function borrarLocal(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada */
  }
}
