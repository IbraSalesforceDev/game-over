import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../../lib/utilidades';
import { FlechaMano } from '../anim/Trazo';
import Magnetico from '../anim/Magnetico';

type Variante = 'principal' | 'secundario' | 'claro' | 'texto';

const estilos: Record<Variante, string> = {
  principal: 'bg-carbon text-marfil px-7 py-3.5 rounded-full shadow-[0_8px_20px_-12px_rgba(15,27,51,0.6)]',
  secundario: 'border border-carbon/25 text-carbon px-7 py-3.5 rounded-full hover:border-carbon',
  claro: 'border border-marfil/40 text-marfil px-7 py-3.5 rounded-full',
  texto: 'text-carbon py-1',
};

/** Color del relleno que sube al pasar el ratón. */
const relleno: Record<Variante, string> = {
  principal: 'bg-mar',
  secundario: 'bg-carbon',
  claro: 'bg-marfil',
  texto: 'bg-transparent',
};
const textoHover: Record<Variante, string> = {
  principal: 'group-hover:text-marfil',
  secundario: 'group-hover:text-marfil',
  claro: 'group-hover:text-carbon',
  texto: '',
};

export function clasesBoton(variante: Variante = 'principal', className?: string) {
  return cx(
    'group relative isolate inline-flex items-center gap-3 overflow-hidden text-[0.95rem] font-medium tracking-[0.01em] transition-[color,border-color,transform] duration-300 ease-[var(--ease-suave)] active:scale-[0.97]',
    estilos[variante],
    className,
  );
}

/** Relleno circular que crece desde abajo al pasar el ratón. */
export function RellenoBoton({ variante = 'principal' }: { variante?: Variante }) {
  if (variante === 'texto') return null;
  return (
    <span
      aria-hidden
      className={cx(
        'absolute left-1/2 top-full -z-10 aspect-square w-[160%] -translate-x-1/2 rounded-full transition-transform duration-300 ease-[var(--ease-suave)] group-hover:-translate-y-[62%]',
        relleno[variante],
      )}
    />
  );
}

function Contenido({ children, flecha, variante }: { children: ReactNode; flecha: boolean; variante: Variante }) {
  return (
    <>
      <RellenoBoton variante={variante} />
      <span className={cx('relative transition-colors duration-300', textoHover[variante])}>{children}</span>
      {flecha && (
        <span className={cx('relative overflow-hidden transition-colors duration-300', textoHover[variante])}>
          <FlechaMano className="block transition-transform duration-500 ease-[var(--ease-suave)] group-hover:translate-x-[180%]" />
          <FlechaMano className="absolute left-0 top-0 block -translate-x-[180%] transition-transform duration-500 ease-[var(--ease-suave)] group-hover:translate-x-0" />
        </span>
      )}
    </>
  );
}

/** Enlace con aspecto de botón (navegación interna o externa), magnético con ratón. */
export function BotonEnlace({
  a,
  children,
  variante = 'principal',
  flecha = false,
  className,
}: {
  a: string;
  children: ReactNode;
  variante?: Variante;
  flecha?: boolean;
  className?: string;
}) {
  const clases = clasesBoton(variante, className);
  const dentro = (
    <Contenido flecha={flecha} variante={variante}>
      {children}
    </Contenido>
  );
  if (/^(https?:|mailto:|tel:)/.test(a)) {
    const externo = a.startsWith('http');
    return (
      <Magnetico>
        <a href={a} className={clases} {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {dentro}
        </a>
      </Magnetico>
    );
  }
  return (
    <Magnetico>
      <Link to={a} className={clases}>
        {dentro}
      </Link>
    </Magnetico>
  );
}
