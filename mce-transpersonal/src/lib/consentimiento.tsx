import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Elección del aviso de cookies.
 *
 * La web solo usa almacenamiento técnico (este mismo dato), así que no hay
 * ningún script de analítica, publicidad ni redes sociales que cargar o
 * bloquear. Si algún día se añade uno, debe cargarse SOLO cuando
 * `eleccion?.eleccion === 'aceptar'` y hay que añadir su categoría al aviso.
 *
 * Se guarda en localStorage (no es una cookie). Si el navegador bloquea el
 * almacenamiento, se recuerda solo durante la visita.
 */

const CLAVE = 'mce-consentimiento';
const VERSION = 2;

export type TipoEleccion = 'aceptar' | 'rechazar' | 'configurar';
type Guardado = { version: number; eleccion: TipoEleccion; tecnicas: true; fecha: string };

function leer(): Guardado | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as Partial<Guardado> & { privacidad?: boolean; cookies?: boolean };
    if (dato.version === VERSION && dato.eleccion && dato.fecha) return dato as Guardado;
    // Versión anterior del aviso (casillas aceptadas): cuenta como «aceptar».
    if (dato.version === 1 && dato.cookies && dato.fecha) return { version: VERSION, eleccion: 'aceptar', tecnicas: true, fecha: dato.fecha };
    return null;
  } catch {
    return null;
  }
}

function guardar(dato: Guardado) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(dato));
  } catch {
    /* almacenamiento bloqueado: se recuerda solo en memoria */
  }
}

export type DocumentoLegal = 'privacidad' | 'cookies';

type Contexto = {
  /** Elección guardada (o null si todavía no se ha elegido). */
  eleccion: Guardado | null;
  bannerAbierto: boolean;
  elegir: (e: TipoEleccion) => void;
  abrirPreferencias: () => void;
  cerrarBanner: () => void;
  documento: DocumentoLegal | null;
  abrirDocumento: (d: DocumentoLegal) => void;
  cerrarDocumento: () => void;
};

const ContextoConsentimiento = createContext<Contexto | null>(null);

export function ProveedorConsentimiento({ children }: { children: ReactNode }) {
  const [eleccion, setEleccion] = useState<Guardado | null>(() => leer());
  const [bannerAbierto, setBannerAbierto] = useState(() => leer() === null);
  const [documento, setDocumento] = useState<DocumentoLegal | null>(null);

  const elegir = useCallback((e: TipoEleccion) => {
    const dato: Guardado = { version: VERSION, eleccion: e, tecnicas: true, fecha: new Date().toISOString() };
    guardar(dato);
    setEleccion(dato);
    setBannerAbierto(false);
  }, []);

  const abrirPreferencias = useCallback(() => setBannerAbierto(true), []);
  // Solo se puede cerrar sin elegir si ya había una elección guardada.
  const cerrarBanner = useCallback(() => setBannerAbierto((abierto) => (eleccion ? false : abierto)), [eleccion]);

  const valor = useMemo<Contexto>(
    () => ({
      eleccion,
      bannerAbierto,
      elegir,
      abrirPreferencias,
      cerrarBanner,
      documento,
      abrirDocumento: setDocumento,
      cerrarDocumento: () => setDocumento(null),
    }),
    [eleccion, bannerAbierto, elegir, abrirPreferencias, cerrarBanner, documento],
  );

  return <ContextoConsentimiento.Provider value={valor}>{children}</ContextoConsentimiento.Provider>;
}

export function useConsentimiento(): Contexto {
  const ctx = useContext(ContextoConsentimiento);
  if (!ctx) throw new Error('useConsentimiento fuera de ProveedorConsentimiento');
  return ctx;
}
