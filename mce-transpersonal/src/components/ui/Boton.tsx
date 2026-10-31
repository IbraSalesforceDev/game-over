import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { cx } from '../../lib/utilidades';
import { FlechaMano } from '../anim/Trazo';

type Variante = 'principal' | 'secundario' | 'texto';

const estilos: Record<Variante, string> = {
  principal:
    'bg-dorado text-carbon hover:bg-[#b8912f] shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] px-7 py-3.5 rounded-full',
  secundario: 'border border-carbon/25 text-carbon hover:border-carbon hover:bg-carbon hover:text-marfil px-7 py-3.5 rounded-full',
  texto: 'text-carbon py-1',
};

export function clasesBoton(variante: Variante = 'principal', className?: string) {
  return cx(
    'group inline-flex items-center gap-3 text-[0.95rem] font-medium tracking-[0.01em] transition-[background-color,color,border-color,transform] duration-300 ease-[var(--ease-suave)] active:scale-[0.98]',
    estilos[variante],
    className,
  );
}

function Contenido({ children, flecha }: { children: ReactNode; flecha: boolean }) {
  return (
    <>
      <span className="relative">{children}</span>
      {flecha && (
        <FlechaMano className="transition-transform duration-500 ease-[var(--ease-suave)] group-hover:translate-x-1.5" />
      )}
    </>
  );
}

/** Enlace con aspecto de botón (navegación interna o externa). */
export function BotonEnlace({
  a,
  children,
  variante = 'principal',
  flecha = true,
  className,
}: {
  a: string;
  children: ReactNode;
  variante?: Variante;
  flecha?: boolean;
  className?: string;
}) {
  const clases = clasesBoton(variante, className);
  if (/^(https?:|mailto:|tel:)/.test(a)) {
    const externo = a.startsWith('http');
    return (
      <a href={a} className={clases} {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        <Contenido flecha={flecha}>{children}</Contenido>
      </a>
    );
  }
  return (
    <Link to={a} className={clases}>
      <Contenido flecha={flecha}>{children}</Contenido>
    </Link>
  );
}
