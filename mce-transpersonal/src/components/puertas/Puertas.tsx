import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router';
import { useAnimate, useReducedMotion } from 'framer-motion';
import { FlechaMano } from '../anim/Trazo';
import { cx } from '../../lib/utilidades';
import { detenerScroll, reanudarScroll } from '../../lib/scroll';

/**
 * "Cinco puertas, una casa": cada tarjeta es una puerta con su cerrojo.
 * Al pulsarla, una llave antigua entra en el cerrojo, gira, la cerradura se
 * abre, la puerta se abre y se entra por ella hasta su apartado.
 *
 * La animación se hace sobre una copia exacta de la puerta, en una capa por
 * encima de la página (así no la recorta el carrusel). Al final, la capa queda
 * del mismo color que la cortina de cambio de página, con el mismo rótulo, y la
 * navegación continúa sin saltos. Solo transform y opacity.
 * Con "reducir movimiento" se navega directamente, sin animación.
 */

export type Acceso = { ruta: string; nombre: string; detalle: string; fondo: string; texto: string };

const claseTarjeta = (a: Acceso) =>
  cx(
    'group relative flex min-h-[18rem] flex-col justify-between overflow-hidden rounded-t-[12rem] rounded-b-[1.5rem] p-8 pt-20 transition-[transform,box-shadow] duration-300 ease-[var(--ease-suave)] hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-28px_rgba(22,33,62,0.45)] sm:p-10 sm:pt-24 lg:h-[64vh] lg:min-h-0 lg:w-[34vw] lg:max-w-[30rem] lg:shrink-0',
    a.fondo,
    a.texto,
  );

/** Contenido de la tarjeta (igual que antes): título arriba, texto y flecha abajo. */
function Contenido({ a }: { a: Acceso }) {
  return (
    <>
      <span className="block font-serif text-[clamp(2.4rem,4.6vw,4.2rem)] leading-none tracking-[-0.02em] transition-transform duration-300 ease-[var(--ease-suave)] group-hover:-translate-y-1">
        {a.nombre}
      </span>
      <span className="flex items-end justify-between gap-6">
        <span className="max-w-xs text-[1rem] leading-relaxed opacity-80">{a.detalle}</span>
        <span
          className={cx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-300',
            a.texto === 'text-marfil' ? 'bg-marfil/15 group-hover:bg-dorado group-hover:text-marfil' : 'bg-carbon/8 group-hover:bg-carbon group-hover:text-marfil',
          )}
        >
          <FlechaMano />
          <span className="sr-only">Entrar</span>
        </span>
      </span>
    </>
  );
}

/** Centro del ojo de la cerradura dentro de la placa (en px, placa de 28 × 44). */
const OJO = { x: 14, y: 17 };

/**
 * Cerrojo: placa vertical con dos tornillos y ojo de cerradura, en la clave
 * del arco (encima del título, sin taparlo). Toma el color del texto de la
 * tarjeta, así funciona en las claras y en la oscura.
 */
function Cerrojo({ conLlave = false }: { conLlave?: boolean }) {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-5 block h-11 w-7 -translate-x-1/2 sm:top-6">
      <span data-placa className="absolute inset-0 block">
        <svg viewBox="0 0 28 44" className="h-full w-full overflow-visible transition-transform duration-500 ease-[var(--ease-suave)] group-hover:scale-110">
          <rect x="1" y="1" width="26" height="42" rx="13" fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeOpacity="0.38" />
          <rect x="4" y="4" width="20" height="36" rx="10" fill="none" stroke="currentColor" strokeOpacity="0.16" />
          <circle cx="14" cy="7.5" r="1.2" fill="currentColor" fillOpacity="0.45" />
          <circle cx="14" cy="36.5" r="1.2" fill="currentColor" fillOpacity="0.45" />
          <circle cx={OJO.x} cy={OJO.y} r="3.6" fill="currentColor" fillOpacity="0.85" />
          <path d="M12.4 19.2 11.3 28h5.4l-1.1-8.8z" fill="currentColor" fillOpacity="0.85" />
        </svg>
        {/* brillo dorado del ojo al abrirse */}
        <span data-ojo className="absolute block h-3 w-3 rounded-full bg-oro opacity-0 shadow-[0_0_14px_5px_rgba(184,153,74,0.6)]" style={{ left: OJO.x - 6, top: OJO.y - 6 }} />
      </span>
      {conLlave && (
        // Caja de recorte con el borde izquierdo justo en el ojo: lo que pasa de
        // ese borde "entra" en la cerradura. Al girarla, gira la llave.
        <span data-giro className="absolute block h-40 w-48 origin-left overflow-hidden" style={{ left: OJO.x, top: OJO.y - 80 }}>
          <span data-llave className="absolute left-0 top-1/2 block h-12 w-[7.5rem] -translate-y-1/2 opacity-0">
            <LlaveAntigua />
          </span>
        </span>
      )}
    </span>
  );
}

/** Llave antigua ornamentada (horizontal; la punta, a la izquierda). */
function LlaveAntigua() {
  return (
    <svg viewBox="0 0 150 60" className="h-full w-full drop-shadow-[0_6px_10px_rgba(11,18,38,0.35)]">
      <defs>
        <linearGradient id="laton" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2e8c9" />
          <stop offset="0.45" stopColor="#c9ab5c" />
          <stop offset="1" stopColor="#8a7234" />
        </linearGradient>
      </defs>
      <g fill="url(#laton)" stroke="#6f5b28" strokeWidth="0.6">
        {/* paletón con dientes */}
        <path d="M5 32h20v5h-4v4h4v6H15v-5h-4v5H5z" />
        {/* caña */}
        <rect x="1" y="27.5" width="92" height="5" rx="2.5" />
        {/* collarines */}
        <rect x="82" y="24.5" width="4" height="11" rx="1.2" />
        <rect x="88" y="23" width="3.5" height="14" rx="1.2" />
      </g>
      <g fill="none" stroke="url(#laton)" strokeLinecap="round">
        {/* ojo de la llave: aro con cuatrifolio interior */}
        <circle cx="116" cy="30" r="19" strokeWidth="4.5" />
        <circle cx="108.5" cy="30" r="6.5" strokeWidth="2.2" />
        <circle cx="123.5" cy="30" r="6.5" strokeWidth="2.2" />
        <circle cx="116" cy="22.5" r="6.5" strokeWidth="2.2" />
        <circle cx="116" cy="37.5" r="6.5" strokeWidth="2.2" />
      </g>
      <circle cx="116" cy="30" r="2.4" fill="url(#laton)" />
      <circle cx="139" cy="30" r="3.2" fill="url(#laton)" stroke="#6f5b28" strokeWidth="0.6" />
    </svg>
  );
}

type Apertura = { a: Acceso; rect: DOMRect };

/** Capa con la copia de la puerta donde ocurre toda la secuencia. */
function Secuencia({ apertura, alTerminar }: { apertura: Apertura; alTerminar: () => void }) {
  const [ambito, animar] = useAnimate();
  const navegar = useNavigate();
  const { a, rect } = apertura;

  useEffect(() => {
    let vivo = true;
    (async () => {
      const ease = [0.65, 0, 0.35, 1] as const;
      // 1. La llave aparece y se acerca al cerrojo
      await animar('[data-llave]', { opacity: [0, 1], x: [150, 4], y: [-58, 0], rotate: [-28, 0] }, { duration: 0.8, ease: [0.22, 1, 0.36, 1] });
      // …y entra en él
      await animar('[data-llave]', { x: -36 }, { duration: 0.32, ease: [0.5, 0, 0.75, 0] });
      // 2. Gira y la cerradura se abre
      await animar('[data-giro]', { rotate: -90 }, { duration: 0.5, ease }); // hacia el arco: no tapa el título
      animar('[data-ojo]', { opacity: [0, 1, 0.75], scale: [0.4, 1.5, 1] }, { duration: 0.45 });
      await animar('[data-placa]', { scale: [1, 1.12, 1] }, { duration: 0.35 });
      if (!vivo) return;
      // 3. La puerta se abre y se entra por ella
      animar('[data-puerta]', { rotateY: -104 }, { duration: 0.95, ease });
      animar('[data-luz]', { opacity: [0, 1] }, { duration: 0.6, delay: 0.1 });
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const escala = Math.max(vw / rect.width, vh / rect.height) * 1.8;
      animar('[data-grupo]', { scale: escala, x: vw / 2 - cx, y: vh / 2 - cy }, { duration: 1.05, delay: 0.45, ease: [0.7, 0, 0.84, 0] });
      await animar('[data-llegada]', { opacity: 1 }, { duration: 0.4, delay: 1.05 });
      if (!vivo) return;
      // La capa ya es igual que la cortina de cambio de página: se navega y la
      // cortina toma el relevo sin que se note.
      navegar(a.ruta);
    })();
    return () => {
      vivo = false;
    };
    // Solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si por lo que sea no se llega a navegar, nunca dejar la capa puesta.
  useEffect(() => {
    const t = window.setTimeout(alTerminar, 8000);
    return () => window.clearTimeout(t);
  }, [alTerminar]);

  const origen = `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;

  return createPortal(
    <div ref={ambito} aria-hidden className="fixed inset-0 z-[95] cursor-wait" style={{ perspective: '1400px' }}>
      <div data-grupo className="absolute inset-0" style={{ transformOrigin: origen }}>
        {/* Hueco de la puerta: dentro, la casa (oscura, con una luz suave) */}
        <div
          className="absolute overflow-hidden rounded-t-[12rem] rounded-b-[1.5rem] bg-carbon"
          style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        >
          <div data-luz className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgba(157,189,230,0.35),transparent_70%)] opacity-0" />
        </div>
        {/* La puerta: copia exacta de la tarjeta, que gira sobre su lado izquierdo */}
        <div
          data-puerta
          className={cx(claseTarjeta(a), 'pointer-events-none !overflow-visible !transition-none [backface-visibility:hidden]')}
          style={{ position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height, minHeight: 0, maxWidth: 'none', transformOrigin: 'left center' }}
        >
          <Cerrojo conLlave />
          <Contenido a={a} />
        </div>
      </div>
      {/* Llegada: mismo aspecto que la cortina de cambio de página */}
      <div data-llegada className="absolute inset-0 flex items-center justify-center bg-carbon opacity-0">
        <div className="text-center text-marfil">
          <p className="etiqueta !text-dorado-claro/80">MCE</p>
          <p className="mt-3 font-serif text-[clamp(2.4rem,7vw,5.5rem)] font-light italic leading-none">{a.nombre}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function Puertas({ accesos }: { accesos: Acceso[] }) {
  const reducido = useReducedMotion();
  const [apertura, setApertura] = useState<Apertura | null>(null);
  const ocupado = useRef(false);

  // Mientras se abre una puerta, la página no se desplaza.
  useEffect(() => {
    if (!apertura) return;
    detenerScroll();
    return () => reanudarScroll();
  }, [apertura]);

  const abrir = (a: Acceso, el: HTMLElement) => {
    if (ocupado.current) return;
    ocupado.current = true;
    setApertura({ a, rect: el.getBoundingClientRect() });
  };

  const alPulsar = (a: Acceso) => (e: MouseEvent<HTMLAnchorElement>) => {
    // Con "reducir movimiento", o abriendo en otra pestaña, el enlace normal.
    if (reducido || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    abrir(a, e.currentTarget);
  };

  const alTeclear = (a: Acceso) => (e: KeyboardEvent<HTMLAnchorElement>) => {
    // Intro ya dispara el clic del enlace; Espacio se añade aquí.
    if (e.key !== ' ') return;
    e.preventDefault();
    if (reducido) e.currentTarget.click();
    else abrir(a, e.currentTarget);
  };

  return (
    <div className="flex flex-col gap-5 px-4 sm:px-8 lg:flex-row lg:gap-6 lg:pl-14 lg:pr-[20vw]">
      {accesos.map((a) => (
        <Link
          key={a.ruta}
          to={a.ruta}
          onClick={alPulsar(a)}
          onKeyDown={alTeclear(a)}
          aria-disabled={apertura ? true : undefined}
          className={claseTarjeta(a)}
        >
          <Cerrojo />
          <Contenido a={a} />
        </Link>
      ))}
      {apertura && (
        <Secuencia
          apertura={apertura}
          alTerminar={() => {
            ocupado.current = false;
            setApertura(null);
          }}
        />
      )}
    </div>
  );
}
