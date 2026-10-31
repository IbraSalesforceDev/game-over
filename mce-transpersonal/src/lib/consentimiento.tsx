import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Consentimiento de privacidad y cookies.
 * Se guarda en localStorage (no es una cookie). Si el navegador bloquea el
 * almacenamiento, se recuerda solo durante la visita.
 */

const CLAVE = 'mce-consentimiento';
const VERSION = 1;

type Guardado = { version: number; privacidad: boolean; cookies: boolean; fecha: string };

function leer(): Guardado | null {
  try {
    const crudo = window.localStorage.getItem(CLAVE);
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as Guardado;
    return dato.version === VERSION && dato.privacidad && dato.cookies ? dato : null;
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
  aceptado: Guardado | null;
  bannerAbierto: boolean;
  aceptar: () => void;
  abrirPreferencias: () => void;
  cerrarBanner: () => void;
  documento: DocumentoLegal | null;
  abrirDocumento: (d: DocumentoLegal) => void;
  cerrarDocumento: () => void;
};

const ContextoConsentimiento = createContext<Contexto | null>(null);

export function ProveedorConsentimiento({ children }: { children: ReactNode }) {
  const [aceptado, setAceptado] = useState<Guardado | null>(() => leer());
  const [bannerAbierto, setBannerAbierto] = useState(() => leer() === null);
  const [documento, setDocumento] = useState<DocumentoLegal | null>(null);

  const aceptar = useCallback(() => {
    const dato: Guardado = { version: VERSION, privacidad: true, cookies: true, fecha: new Date().toISOString() };
    guardar(dato);
    setAceptado(dato);
    setBannerAbierto(false);
  }, []);

  const abrirPreferencias = useCallback(() => setBannerAbierto(true), []);
  // Solo se puede cerrar sin aceptar si ya había una elección guardada.
  const cerrarBanner = useCallback(() => setBannerAbierto((abierto) => (aceptado ? false : abierto)), [aceptado]);

  const valor = useMemo<Contexto>(
    () => ({
      aceptado,
      bannerAbierto,
      aceptar,
      abrirPreferencias,
      cerrarBanner,
      documento,
      abrirDocumento: setDocumento,
      cerrarDocumento: () => setDocumento(null),
    }),
    [aceptado, bannerAbierto, aceptar, abrirPreferencias, cerrarBanner, documento],
  );

  return <ContextoConsentimiento.Provider value={valor}>{children}</ContextoConsentimiento.Provider>;
}

export function useConsentimiento(): Contexto {
  const ctx = useContext(ContextoConsentimiento);
  if (!ctx) throw new Error('useConsentimiento fuera de ProveedorConsentimiento');
  return ctx;
}
